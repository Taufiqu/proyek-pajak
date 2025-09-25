// src/components/BuktiSetorPage.jsx
import React, { useState, useEffect, useRef } from "react";
import Layout from "../Layout";
import UploadFormBuktiSetor from "./UploadFormBuktiSetor";
import BuktiSetorValidationForm from "./BuktiSetorValidationForm";
import NavigationButtonsBuktiSetor from "./NavigationButtonsBuktiSetor";
import ImageModal from "./ImageModal";
import { processBuktiSetor, saveBuktiSetor, saveFaktur } from "../../services/api";
import TutorialPanelBuktiSetor from "./TutorialPanelBuktiSetor";
import { toast } from "react-toastify";
import LoadingSpinner from "../LoadingSpinner";

const BuktiSetorPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalSrc, setModalSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedResults = localStorage.getItem("buktiValidationResults");
    const savedFiles = localStorage.getItem("buktiSelectedFiles");
    const savedIndex = localStorage.getItem("buktiCurrentIndex");

    if (savedResults) {
      setValidationResults(JSON.parse(savedResults));
    }

    if (savedFiles) {
      try {
        const parsed = JSON.parse(savedFiles);
        setSelectedFiles(parsed);
      } catch (e) {
        console.warn("Gagal parse saved selected files");
      }
    }

    if (savedIndex) {
      setCurrentIndex(parseInt(savedIndex, 10) || 0);
    }
  }, []);

  useEffect(() => {
    if (validationResults.length > 0) {
      localStorage.setItem("buktiValidationResults", JSON.stringify(validationResults));
      localStorage.setItem("buktiCurrentIndex", currentIndex.toString());
      // Reset currentIndex jika melebihi batas array
      if (currentIndex >= validationResults.length) {
        setCurrentIndex(0);
      }
    }
  }, [validationResults, currentIndex]);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      localStorage.setItem("buktiSelectedFiles", JSON.stringify(selectedFiles.map(f => ({ name: f.name }))));
    }
  }, [selectedFiles]);

  // 🔄 Proses file upload satu per satu
 const handleProcess = async () => {
  if (!selectedFiles.length) {
    toast.warn("Belum ada file yang dipilih.");
    return;
  }

  console.log("🚀 Starting process with files:", selectedFiles);
  toast.info("Mulai memproses file, mohon tunggu...");
  setIsProcessing(true);
  setValidationResults([]);
  setCurrentIndex(0);
  setUploadError("");
  setIsLoading(true);

  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      console.log(`📁 Processing file ${i + 1}/${selectedFiles.length}:`, file.name);
      
      const formData = new FormData();
      formData.append("file", file);

      console.log("🌐 Sending request to processBuktiSetor...");
      const res = await processBuktiSetor(formData);
      console.log("✅ Response received:", res);
      console.log("📦 Full response data:", res.data);
      
      // Backend mengembalikan array langsung, bukan object dengan property 'results'
      const rawData = Array.isArray(res.data) ? res.data : [];
      console.log("📄 Raw data from backend:", rawData);

      const formatted = rawData.map((item) => ({
        // Flatten structure: ambil data dari nested object
        kode_setor: item.data?.kode_setor || "",
        tanggal: item.data?.tanggal || "",
        jumlah: item.data?.jumlah || 0,
        halaman: item.halaman || 1,
        // Perbaiki nama field untuk preview
        preview_filename: item.preview_image || file.name,
        id: `bukti-${Date.now()}-${Math.random()}`,
      }));

      console.log("🔧 Formatted data:", formatted);
      setValidationResults((prev) => [...prev, ...formatted]);
    }
  } catch (err) {
    console.error("❌ Gagal proses file:", err);
    console.error("❌ Error details:", err.response?.data || err.message);
    toast.error("Gagal memproses salah satu file.");
  } finally {
    setIsLoading(false);
    setIsProcessing(false);
    console.log("🏁 Process completed");
    toast.success("Selesai memproses file!");
  }
};


  // 📝 Ubah field data
  const handleDataChange = (id, field, value) => {
    setValidationResults((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // 💾 Simpan ke backend
  const handleSaveItem = async (id) => {
    const item = validationResults.find((val) => val.id === id);
    if (!item) return;

    try {
      await saveBuktiSetor(item);
      toast.success("Data berhasil disimpan.");
      
      // 🗑️ Hapus item yang sudah disimpan dari hasil OCR
      setValidationResults((prev) => prev.filter((val) => val.id !== id));
      
      // 📍 Adjust current index if necessary
      if (currentIndex >= validationResults.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
    } catch (err) {
      console.error("❌ Gagal simpan:", err);
      toast.error("Gagal menyimpan data.");
    }
  };

  const handleSaveAll = async () => {
    try {
      const payload = validationResults.map((item) => item);
      // ✅ Fix: Gunakan saveBuktiSetor untuk bukti setor
      const res = await saveBuktiSetor(payload);
      toast.success(res.data.message || "Berhasil simpan semua data!");
      
      // 🗑️ Hapus semua item yang sudah disimpan dari hasil OCR
      setValidationResults([]);
      setCurrentIndex(0);
      
    } catch (err) {
      console.error("Save all error:", err);
      toast.error("Gagal menyimpan semua data.");
    }
  };

  const handleNext = () => {
    if (currentIndex < validationResults.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

    const handleReset = () => {
    // 🔄 Reset semua state utama
    setSelectedFiles([]);
    setValidationResults([]);
    setCurrentIndex(0);
    setModalSrc(null);
    setUploadError("");

    // 🗑️ Bersihin localStorage
    localStorage.removeItem("buktiValidationResults");
    localStorage.removeItem("buktiSelectedFiles");
    localStorage.removeItem("buktiCurrentIndex");

    // ❌ Kosongin input file
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }

    toast.info("Form berhasil di-reset 🚿");
  };

  return (
    <Layout>
      {isProcessing && <LoadingSpinner message="Sedang memproses file..." />}
      <div className="p-4">
        <h1 className="page-title">OCR Bukti Setor Pajak</h1>

        {/* 🗂️ Upload & Proses */}
        <UploadFormBuktiSetor
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          handleProcess={handleProcess}
          loading={isLoading}
          fileInputRef={fileInputRef}
        />

        {uploadError && <div className="error-text">{uploadError}</div>}

        {/* 📘 Jika belum ada hasil, tampilkan tutorial */}
        {validationResults.length === 0 && !isLoading ? (
          <TutorialPanelBuktiSetor />
        ) : (
          <>
            {/* 📄 Tampilkan halaman saat ini saja (navigation method) */}
            {validationResults.length > 0 && (
              <div className="preview-form-container">
                <div className="form-column">
                  <BuktiSetorValidationForm
                    itemData={validationResults[currentIndex]}
                    onDataChange={handleDataChange}
                    onSave={() => handleSaveItem(validationResults[currentIndex]?.id)}
                    onImageClick={() => {
                      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
                      const newSrc = `${baseUrl}/api/bukti_setor/uploads/${validationResults[currentIndex]?.preview_filename}`;
                      setModalSrc(newSrc);
                    }}
                  />
                </div>
                <NavigationButtonsBuktiSetor
                  currentIndex={currentIndex}
                  total={validationResults.length}
                  handleBack={handleBack}
                  handleNext={handleNext}
                  handleSave={() => handleSaveItem(validationResults[currentIndex]?.id)}
                  handleSaveAll={handleSaveAll}
                  handleReset={handleReset}
                />
              </div>
            )}
            {modalSrc && (
              <ImageModal
                src={modalSrc}
                onClose={() => setModalSrc(null)}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default BuktiSetorPage;
