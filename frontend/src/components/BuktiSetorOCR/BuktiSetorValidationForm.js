import React from "react";

const BuktiSetorValidationForm = ({
    itemData,
    onDataChange,
    onImageClick,
    onSave,
}) => {
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

   return (
    <div className="preview-form-container">
        {/* KIRI: Preview Gambar */}
        <div className="preview-column">
        <img
            src={`/api/bukti_setor/uploads/${itemData.preview_filename}`}
            alt="Preview"
            className="preview-img"
            onClick={onImageClick}
            style={{ cursor: "zoom-in" }}
        />
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