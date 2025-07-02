// src/components/BuktiSetorPage.jsx
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    if (selectedFiles.length > 0) {
      localStorage.setItem("buktiSelectedFiles", JSON.stringify(selectedFiles.map(f => ({ name: f.name }))));
    }
  }, [selectedFiles]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Alias ke validationResults supaya nama konsisten kaya di Faktur
  const formPages = validationResults;
  const setFormPages = setValidationResults;

  // 🔄 Proses file upload satu per satu
 const handleProcess = async () => {
  if (!selectedFiles.length) {
    toast.warn("Belum ada file yang dipilih.");
    return;
  }

  toast.info("Mulai memproses file, mohon tunggu...");
  setIsProcessing(true);
  setFormPages([]);
  setCurrentIndex(0);
  setUploadError("");
  setIsLoading(true);
  setValidationResults([]);

  try {
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

      setValidationResults((prev) => [...prev, ...formatted]);
    }
  } catch (err) {
    console.error("❌ Gagal proses file:", err);
    toast.error("Gagal memproses salah satu file.");
  } finally {
    setIsLoading(false);
    setIsProcessing(false);
    // 🧭 Tambahkan scroll ke hasil OCR
    setTimeout(() => {
      const resultSection = document.querySelector(".preview-form-container");
      if (resultSection) {
        resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 500);
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
      toast.success("✅ Data berhasil disimpan.");
    } catch (err) {
      console.error("❌ Gagal simpan:", err);
      toast.error("Gagal menyimpan data.");
    }
  };

  const handleSaveAll = async () => {
    try {
      const payload = formPages.map((page) => page.data);
      const res = await saveFaktur(payload);
      toast.success(res.data.message || "Berhasil simpan semua data!");
    } catch (err) {
      console.error("Save all error:", err);
      toast.error("Gagal menyimpan semua data.");
    }
  };

  const handleNext = () => {
    if (currentIndex < formPages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

    const handleReset = () => {
    localStorage.removeItem("formPages");
    localStorage.removeItem("formIndex");
    setFormPages([]);
    setCurrentIndex(0);
  }

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
        />

        {uploadError && <div className="error-text">{uploadError}</div>}

        {/* 📘 Jika belum ada hasil, tampilkan tutorial */}
        {validationResults.length === 0 && !isLoading ? (
          <TutorialPanelBuktiSetor />
        ) : (
          <>
            {/* 📄 Tampilkan semua hasil OCR */}
            {validationResults.map((data) => (
              <div className="preview-form-container" key={data.id}>
                <div className="form-column">
                  <BuktiSetorValidationForm
                    itemData={data}
                    onDataChange={handleDataChange}
                    onSave={() => handleSaveItem(data.id)}
                    onImageClick={() =>
                      setModalSrc(`/api/bukti_setor/uploads/${data.preview_filename}`)}
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
            ))}
            {modalSrc && (
              <ImageModal
                src={`http://localhost:5000${modalSrc}`} // atau langsung `modalSrc` kalau udah full URL
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
