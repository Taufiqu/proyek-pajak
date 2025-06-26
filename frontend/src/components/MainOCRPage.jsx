import React, { useState } from "react";
import { toast } from "react-toastify";
import UploadForm from "./UploadForm";
import PreviewPanel from "./PreviewPanel";
import ValidationForm from "./ValidationForm";
import NavigationButtons from "./NavigationButtons";
import TutorialPanel from "./TutorialPanel"; // 1. Impor komponen baru
import "../App.css";
import Layout from "./Layout";
import LoadingSpinner from "./LoadingSpinner"; // 1. Impor spinner

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [namaPtUtama, setNamaPtUtama] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formPages, setFormPages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ... (fungsi handleUpload, handleSave, dll. tidak berubah) ...
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!namaPtUtama || selectedFiles.length === 0) return;

    toast.info("Mulai memproses file, mohon tunggu...");

    setIsProcessing(true);
    setFormPages([]);
    setCurrentIndex(0);
    setUploadError("");

    if (!namaPtUtama) {
      toast.warn("⚠️ Wajib isi Nama PT dulu ya bro!");
      setIsProcessing(false);
      return;
    }

    if (selectedFiles.length === 0) {
      toast.warn("📁 Pilih file dulu sebelum proses, boss!");
      setIsProcessing(false);
      return;
    }

    try {
      const allPages = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("nama_pt_utama", namaPtUtama);

        const response = await fetch(`${API_URL}/api/process`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          toast.error(errorData.error || "Gagal memproses file.");
          setIsProcessing(false);
          return;
        }

        const result = await response.json();
        allPages.push(...result.results);
      }

      setFormPages(allPages);

      toast.success("Semua file berhasil diproses!");


    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Terjadi kesalahan saat upload.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      const currentPage = formPages[currentIndex];
      const response = await fetch(`${API_URL}/api/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentPage.data),
      });

      const result = await response.json();
      toast.success(result.message || "Data berhasil disimpan!");
      } catch (err) {
      console.error("Save all error:", err);
      toast.error("Gagal menyimpan data.");
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

  const handleSaveAll = async () => {
    try {
      const response = await fetch(`${API_URL}/api/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formPages.map((page) => page.data)),
      });

      const result = await response.json();
      toast.success(result.message || "Berhasil menyimpan semua data!");
    } catch (err) {
      console.error("Save all error:", err);
      toast.error("Gagal menyimpan semua data.");
    }
  };

  const currentData = formPages[currentIndex]?.data;

  return (
    <Layout>
      {/* 2. Gunakan spinner saat isProcessing true */}
      {isProcessing && <LoadingSpinner message="Sedang memproses file..." />}

      <h1 className="page-title">OCR Faktur Pajak</h1>

      <UploadForm
        handleUpload={handleUpload}
        namaPtUtama={namaPtUtama}
        setNamaPtUtama={setNamaPtUtama}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
      />

      {uploadError && <div className="error-text">{uploadError}</div>}

      {isProcessing ? (
        <div className="loading"></div>
      ) : formPages.length > 0 ? (
        // Jika ada hasil, tampilkan form validasi dan navigasi
        <>
          <div className="preview-form-container">
            <div className="preview-column">
                <PreviewPanel data={currentData} />
            </div>
            <div className="form-column">
                <ValidationForm
                    data={currentData}
                    updateData={(updatedFields) => {
                    const updated = [...formPages];
                    updated[currentIndex].data = {
                        ...updated[currentIndex].data,
                        ...updatedFields,
                    };
                    setFormPages(updated);
                    }}
                />
            </div>
          </div>

          <NavigationButtons
            currentIndex={currentIndex}
            total={formPages.length}
            handleBack={handleBack}
            handleNext={handleNext}
            handleSave={handleSave}
            handleSaveAll={handleSaveAll}
          />
        </>
      ) : (
        // Jika tidak sedang memproses dan tidak ada hasil, tampilkan tutorial
        !isProcessing && <TutorialPanel /> 
      )}
    </Layout>
  );
}

export default App;