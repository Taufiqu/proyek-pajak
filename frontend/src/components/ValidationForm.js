import React from "react";

const formatRupiah = (number) => {
  // Jika nilai tidak valid atau kosong, kembalikan string kosong
  if (isNaN(number) || number === null || number === "") {
    return "";
  }
  // 'id-ID' untuk format Indonesia, 'IDR' untuk mata uang Rupiah
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0, // Tidak menampilkan angka di belakang koma
  }).format(number);
};

const ValidationForm = ({ data, updateData }) => {
  if (!data) return null;

  const handleChange = (field, value) => {
    updateData({ [field]: value });
  };

  const handleCurrencyChange = (field, value) => {
    // Hapus semua karakter non-digit dari input (misal: "Rp 10.000" -> "10000")
    const numericValue = value.replace(/[^0-9]/g, "");
    // Update state dengan nilai numerik, atau 0 jika kosong
    updateData({ [field]: numericValue === "" ? "" : parseInt(numericValue, 10) });
  };

  return (
    <div className="form-validator">
      <h3>Validasi & Koreksi Data OCR</h3>

      <label>No. Faktur:</label>
      <input
        type="text"
        value={data.no_faktur}
        onChange={(e) => handleChange("no_faktur", e.target.value)}
      />

      <label>Tanggal:</label>
      <input
        type="date"
        value={data.tanggal}
        onChange={(e) => handleChange("tanggal", e.target.value)}
      />

      <label>NPWP Lawan Transaksi:</label>
      <input
        type="text"
        value={data.npwp_lawan_transaksi}
        onChange={(e) => handleChange("npwp_lawan_transaksi", e.target.value)}
      />

      <label>Nama Lawan Transaksi:</label>
      <input
        type="text"
        value={data.nama_lawan_transaksi}
        onChange={(e) => handleChange("nama_lawan_transaksi", e.target.value)}
      />

      <label>Keterangan:</label>
      <textarea
        className="textarea-field"
        value={data.keterangan}
        onChange={(e) => handleChange("keterangan", e.target.value)}
        rows={5} // Menentukan tinggi awal textarea (4 baris)
      />

      <label>DPP:</label>
      <input
        type="text" // 3. Ganti type menjadi "text"
        value={formatRupiah(data.dpp)} // 4. Tampilkan nilai yang sudah diformat
        onChange={(e) => handleCurrencyChange("dpp", e.target.value)} // 5. Gunakan handler khusus
        placeholder="Rp 0"
      />

      <label>PPN:</label>
      <input
        type="text" // 3. Ganti type menjadi "text"
        value={formatRupiah(data.ppn)} // 4. Tampilkan nilai yang sudah diformat
        onChange={(e) => handleCurrencyChange("ppn", e.target.value)} // 5. Gunakan handler khusus
        placeholder="Rp 0"
      />

      {data.warning_message && (
        <p className="input-warning">{data.warning_message}</p>
      )}
    </div>
  );
};

export default ValidationForm;
