//UploadForm.js

import React, { useEffect } from "react";

const UploadForm = ({
  handleUpload,
  namaPtUtama,
  setNamaPtUtama,
  selectedFiles,
  setSelectedFiles,
}) => {
  // ⏪ Ambil dari localStorage pas awal
  useEffect(() => {
    const savedNamaPt = localStorage.getItem("nama_pt_utama");
    if (savedNamaPt) {
      setNamaPtUtama(savedNamaPt);
    }
  }, [setNamaPtUtama]);

  // 💾 Simpan ke localStorage kalau namaPtUtama berubah
  useEffect(() => {
    if (namaPtUtama) {
      localStorage.setItem("nama_pt_utama", namaPtUtama);
    }
  }, [namaPtUtama]);

  const handleAddFile = (e) => {
    const newFile = Array.from(e.target.files);
    if (newFile.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFile]);
    }
  };

  const triggerUpload = () => {
    document.getElementById("uploadInput").click();
  };

  return (
    <form onSubmit={handleUpload} className="card form-validator">
      <label>
        Nama PT Utama:
        <input
          type="text"
          value={namaPtUtama}
          onChange={(e) => setNamaPtUtama(e.target.value)}
          required
        />
      </label>

      <input
        id="uploadInput"
        type="file"
        accept=".pdf, image/*"
        style={{ display: "none" }}
        onChange={handleAddFile}
        multiple
      />

      <button type="button" onClick={triggerUpload} className="button button-primary">
        📁 Pilih File
      </button>

      {selectedFiles.length > 0 && (
        <ul>
          {selectedFiles.map((file, index) => (
            <li key={index} className="file-item">
              {file.name}
              <button
                type="button"
                onClick={() =>
                  setSelectedFiles((prev) =>
                    prev.filter((_, i) => i !== index)
                  )
                }
                className="delete-file-btn"
                title="Hapus file ini"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        className="button button-secondary"
        disabled={!namaPtUtama || selectedFiles.length === 0}
        title={
          !namaPtUtama
            ? "Isi nama PT dulu"
            : selectedFiles.length === 0
            ? "Belum ada file terpilih"
            : ""
        }
      >
        Upload & Proses
      </button>

      {!namaPtUtama && !selectedFiles.length > 0 && (
        <p className="error-text">⚠️ Nama PT belum diisi</p>
      )}
    </form>
  );
};

export default UploadForm;
