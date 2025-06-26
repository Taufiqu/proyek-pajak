import React from "react";

const UploadForm = ({
  handleUpload,
  namaPtUtama,
  setNamaPtUtama,
  selectedFiles,
  setSelectedFiles,
}) => {
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
    <form onSubmit={handleUpload} className="card form-validator"> {/* Mengganti .form-validator dengan .card */}
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
        multiple // Tambahkan ini agar bisa pilih banyak file sekaligus
      />

      {/* Tombol untuk trigger upload */}
      {/* BERIKAN CLASS 'button-primary' DI SINI */}
      <button type="button" onClick={triggerUpload} className="button button-primary">
        📁 Pilih File
      </button>

      {/* Tampilkan list file */}
      {selectedFiles.length > 0 && (
        <ul>
          {selectedFiles.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      )}

      {/* Tombol submit upload */}
      {/* BERIKAN CLASS 'button-secondary' DI SINI */}
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

      {!namaPtUtama && !selectedFiles.length > 0 &&(
         <p className="error-text">⚠️ Nama PT belum diisi</p>
      )}

    </form>
  );
};

export default UploadForm;