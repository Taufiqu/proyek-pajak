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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalSrc, setModalSrc] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // 🧠 Restore only validationResults from localStorage (safe, not files)
  useEffect(() => {
    const savedResults = localStorage.getItem("buktiValidationResults");
    if (savedResults) {
      setValidationResults(JSON.parse(savedResults));
    }
  }, []);

  // 💾 Save validationResults to localStorage (safe)
  useEffect(() => {
    if (validationResults.length > 0) {
      localStorage.setItem("buktiValidationResults", JSON.stringify(validationResults));
    }
  }, [validationResults]);

  const handleProcess = async () => {
    if (!selectedFiles.length) {
      toast.warn("Belum ada file yang dipilih.");
      return;
    }

    toast.info("Mulai memproses file...");
    setIsProcessing(true);
    setIsLoading(true);
    setFormReset();

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        if (!(file instanceof File)) {
          toast.error(`File ke-${i + 1} tidak valid. Upload ulang.`);
          continue;
        }

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
      toast.error("Gagal memproses file.");
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
      scrollToResults();
    }
  };

  const handleDataChange = (id, field, value) => {
    setValidationResults((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveItem = async (id) => {
    const item = validationResults.find((val) => val.id === id);
    if (!item) return;

    console.log("[🛰️ DATA YANG DIKIRIM KE BACKEND]", item);

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
      const payload = validationResults.map((item) => ({
        tanggal: item.tanggal,
        kode_setor: item.kode_setor,
        jumlah: item.jumlah,
      }));
      const res = await saveFaktur(payload);
      toast.success(res.data.message || "Berhasil simpan semua data!");
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

  const setFormReset = () => {
    setValidationResults([]);
    setCurrentIndex(0);
    setModalSrc(null);
    setUploadError("");
    localStorage.removeItem("buktiValidationResults");
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setFormReset();
    if (fileInputRef.current) fileInputRef.current.value = null;
    toast.info("Form berhasil di-reset 🚿");
  };

  const scrollToResults = () => {
    setTimeout(() => {
      const resultSection = document.querySelector(".preview-form-container");
      if (resultSection) {
        resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 500);
  };

  return (
    <Layout>
      {isProcessing && <LoadingSpinner message="Sedang memproses file..." />}
      <div className="p-4">
        <h1 className="page-title">OCR Bukti Setor Pajak</h1>

        <UploadFormBuktiSetor
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          handleProcess={handleProcess}
          loading={isLoading}
          fileInputRef={fileInputRef}
        />

        {uploadError && <div className="error-text">{uploadError}</div>}

        {validationResults.length === 0 && !isLoading ? (
          <TutorialPanelBuktiSetor />
        ) : (
          <>
            {validationResults.map((data) => (
              <div className="preview-form-container" key={data.id}>
                <div className="form-column">
                  <BuktiSetorValidationForm
                    itemData={data}
                    onDataChange={handleDataChange}
                    onSave={() => handleSaveItem(data.id)}
                    onImageClick={() =>
                      setModalSrc(`/api/bukti_setor/uploads/${data.preview_filename}`)
                    }
                  />
                </div>
                <NavigationButtonsBuktiSetor
                  currentIndex={currentIndex}
                  total={validationResults.length}
                  handleBack={handleBack}
                  handleNext={handleNext}
                  handleSave={() =>
                    handleSaveItem(validationResults[currentIndex]?.id)
                  }
                  handleSaveAll={handleSaveAll}
                  handleReset={handleReset}
                />
              </div>
            ))}
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