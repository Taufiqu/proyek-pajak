import React from "react";

const UploadFormBuktiSetor = ({
  handleProcess,
  selectedFiles = [],
  setSelectedFiles,
  loading,
  fileInputRef = null, // Tambahkan ref untuk input file
}) => {
  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const triggerUpload = () => {
    if (fileInputRef?.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="card">
      <h2>Upload Bukti Setor Pajak</h2>
      <p>Pilih satu atau lebih file gambar/PDF bukti setor Anda.</p>

      <input
        id="buktiSetorUploadInput"
        type="file"
        accept="image/*,.pdf"
        style={{ display: "none" }}
        onChange={handleAddFiles}
        ref={fileInputRef} // ⬅️ Ini dia yang kurang!
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
                onClick={() => handleRemoveFile(index)}
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
        className="button button-secondary"
        onClick={handleProcess}
        disabled={loading || selectedFiles.length === 0}
      >
        {loading ? "Sedang Memproses..." : `Proses ${selectedFiles.length} File`}
      </button>
    </div>
  );
};

export default UploadFormBuktiSetor;
