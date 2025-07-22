// src/components/BuktiSetorPage.jsx
import React, { useState, useEffect, useRef } from "react";
import Layout from "../Layout";
import UploadFormBuktiSetor from "./UploadFormBuktiSetor";
import BuktiSetorValidationForm from "./BuktiSetorValidationForm";
import NavigationButtonsBuktiSetor from "./NavigationButtonsBuktiSetor";
import ImageModal from "./ImageModal";
import { processBuktiSetor, saveBuktiSetor, saveFaktur } from "../../services/api";
import TutorialPanelBuktiSetor from "./TutorialPanelBuktiSetor";
import LoadingSpinner from "../LoadingSpinner";
import { toast } from "react-toastify";

const BuktiSetorPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [modalSrc, setModalSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedResults = localStorage.getItem("buktiValidationResults");
    const savedFiles = localStorage.getItem("buktiSelectedFiles");

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
  }, []);

  useEffect(() => {
    if (validationResults.length > 0) {
      localStorage.setItem("buktiValidationResults", JSON.stringify(validationResults));
    }
  }, [validationResults]);

  // Separate useEffect untuk boundary check currentIndex
  useEffect(() => {
    if (validationResults.length > 0 && currentIndex >= validationResults.length) {
      setCurrentIndex(Math.max(0, validationResults.length - 1));
    }
  }, [validationResults.length, currentIndex]);

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

  toast.info("Mulai memproses file, mohon tunggu...");
  setIsProcessing(true);
  setValidationResults([]); // Reset hasil sebelumnya
  setCurrentIndex(0); // Reset ke halaman pertama
  setUploadError("");
  setIsLoading(true);

  try {
    const allResults = []; // Kumpulkan semua hasil dulu

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("file", file);

      const res = await processBuktiSetor(formData);
      const rawData = res.data?.data || [];

      const formatted = rawData.map((item) => ({
        ...item,
        id: `bukti-${Date.now()}-${Math.random()}`,
        preview_filename: item.preview_filename || file.name,
      }));

      allResults.push(...formatted);
    }

    // Set semua hasil sekaligus
    setValidationResults(allResults);
    
    // Jika ada hasil, set currentIndex ke 0
    if (allResults.length > 0) {
      setCurrentIndex(0);
    }
    
  } catch (err) {
    console.error("❌ Gagal proses file:", err);
    toast.error("Gagal memproses salah satu file.");
  } finally {
    setIsLoading(false);
    setIsProcessing(false);
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

    console.log("[🛰️ DATA YANG DIKIRIM KE BACKEND]", item); // Tambahin ini!

    try {
      await saveBuktiSetor(item);
      toast.success("Data berhasil disimpan.");
    } catch (err) {
      console.error("❌ Gagal simpan:", err);
      toast.error("Gagal menyimpan data.");
    }
  };

  const handleSaveAll = async () => {
    try {
      // Gunakan validationResults untuk save all, karena itu data bukti setor
      await saveBuktiSetor(validationResults);
      toast.success("Berhasil simpan semua data bukti setor!");
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
            {/* 📄 Tampilkan hasil OCR halaman saat ini berdasarkan currentIndex */}
            {validationResults.length > 0 && (
              <div className="preview-form-container">
                <div className="preview-column">
                  <img
                    src={`/api/bukti_setor/uploads/${validationResults[currentIndex]?.preview_filename}`}
                    alt="Preview"
                    className="preview-img"
                    onClick={() =>
                      setModalSrc(`/api/bukti_setor/uploads/${validationResults[currentIndex]?.preview_filename}`)}
                    style={{ cursor: "zoom-in" }}
                  />
                </div>
                <div className="form-column">
                  <BuktiSetorValidationForm
                    itemData={validationResults[currentIndex]}
                    onDataChange={handleDataChange}
                    onSave={() => handleSaveItem(validationResults[currentIndex]?.id)}
                    onImageClick={() =>
                      setModalSrc(`/api/bukti_setor/uploads/${validationResults[currentIndex]?.preview_filename}`)}
                  />
                </div>
              </div>
            )}

            {/* 🧭 NavigationButtons di luar, hanya 1 set */}
            <NavigationButtonsBuktiSetor
              currentIndex={currentIndex}
              total={validationResults.length}
              handleBack={handleBack}
              handleNext={handleNext}
              handleSave={() => handleSaveItem(validationResults[currentIndex]?.id)}
              handleSaveAll={handleSaveAll}
              handleReset={handleReset}
            />

            {modalSrc && (
              <ImageModal
                src={`http://localhost:5000${modalSrc}`}
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
