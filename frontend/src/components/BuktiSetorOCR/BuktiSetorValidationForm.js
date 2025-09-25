import React, { useState } from "react";

const BuktiSetorValidationForm = ({
  itemData,
  onDataChange,
  onImageClick,
  onSave,
}) => {
  const [imgLoadError, setImgLoadError] = useState(false);

  if (!itemData) return null;

  const handleChange = (field, value) => {
    onDataChange(itemData.id, field, value);
  };

  const parseRupiahToInt = (str) => {
    if (!str) return 0;
    return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0;
  };

  const formatRupiah = (number) => {
    if (typeof number === "string")
      number = parseInt(number.replace(/\D/g, ""), 10) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  const handleCurrencyChange = (field, value) => {
    const cleanValue = parseRupiahToInt(value);
    handleChange(field, cleanValue);
  };

  const imageUrl = `${process.env.REACT_APP_API_URL}/bukti_setor/uploads/${itemData.preview_filename}`;

  return (
    <div className="bukti-setor-form-content">
      {/* KIRI: Preview Gambar */}
      <div className="preview-column">
        {!imgLoadError ? (
          <img
            src={imageUrl}
            alt="Preview"
            className="preview-img"
            onClick={onImageClick}
            style={{ cursor: "zoom-in" }}
            onError={() => setImgLoadError(true)}
          />
        ) : (
          <div
            onClick={onImageClick}
            style={{
              padding: "1rem",
              border: "2px dashed #999",
              borderRadius: "8px",
              textAlign: "center",
              color: "#666",
              fontStyle: "italic",
              cursor: "pointer",
              userSelect: "none",
            }}
            title="Klik untuk lihat gambar"
          >
            📷 Gambar preview gagal dimuat.<br />
            Klik untuk lihat gambar langsung.
          </div>
        )}
      </div>

      {/* KANAN: Form Validasi */}
      <div className="form-column form-validator">
        <h3>Validasi & Koreksi Data Bukti Setor</h3>

        <label>Kode Setor:</label>
        <input
          type="text"
          value={itemData.kode_setor || ""}
          onChange={(e) => handleChange("kode_setor", e.target.value)}
          placeholder="Contoh: 82738219"
        />

        <label>Tanggal:</label>
        <input
          type="date"
          value={itemData.tanggal || ""}
          onChange={(e) => handleChange("tanggal", e.target.value)}
        />

        <label>Jumlah:</label>
        <input
          type="text"
          value={formatRupiah(itemData.jumlah)}
          onChange={(e) => handleCurrencyChange("jumlah", e.target.value)}
          placeholder="Rp 0"
        />

        {itemData.warning_message && (
          <p className="input-warning">{itemData.warning_message}</p>
        )}
      </div>
    </div>
  );
};

export default BuktiSetorValidationForm;
