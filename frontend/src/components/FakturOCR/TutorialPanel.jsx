import React from "react";

const TutorialPanel = () => {
  return (
    <div className="card tutorial-panel">
      <h3>Cara Menggunakan OCR Faktur</h3>
      <p>Ikuti langkah-langkah mudah berikut untuk memproses faktur Anda:</p>
      <ol>
        <li>
          <strong>Isi Nama PT Utama:</strong> Masukkan nama perusahaan Anda pada
          kolom yang tersedia.
        </li>
        <li>
          <strong>Pilih File:</strong> Klik tombol "📁 Pilih File" untuk memilih
          satu atau lebih file faktur dalam format PDF atau gambar.
        </li>
        <li>
          <strong>Proses File:</strong> Setelah file terpilih, klik tombol
          "Upload & Proses" untuk memulai ekstraksi data.
        </li>
        <li>
          <strong>Validasi Hasil:</strong> Periksa data yang diekstrak di samping
          gambar pratinjau. Koreksi jika ada kesalahan.
        </li>
        <li>
          <strong>Simpan Data:</strong> Klik "💾 Simpan Halaman Ini" atau "💾
          Simpan Semua Halaman" untuk menyimpan data ke dalam laporan.
        </li>
      </ol>
      <p className="tutorial-footer">
        Data yang tersimpan dapat dilihat dan diekspor ke Excel di halaman "📜
        Laporan".
      </p>
      <p className="tutorial-footer-note">
        Catatan : Hasil pemrosesan file sangat bergantung pada kualitas gambar atau PDF yang di upload.
      </p>
    </div>
  );
};

export default TutorialPanel;