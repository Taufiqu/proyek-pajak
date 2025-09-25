import React from "react";

const TutorialPanelBuktiSetor = () => {
  return (
    <div className="card tutorial-panel">
      <h3>Cara Menggunakan OCR Bukti Setor</h3>
      <p>Ikuti langkah-langkah mudah berikut untuk memproses bukti setor Anda:</p>
      <ol>
        <li>
          <strong>Pilih File:</strong> Klik tombol "📁 Pilih File" untuk memilih
          satu atau lebih gambar/PDF bukti setor.
        </li>
        <li>
          <strong>Proses File:</strong> Setelah memilih file, klik tombol
          "Proses" untuk memulai ekstraksi data OCR.
        </li>
        <li>
          <strong>Navigasi Hasil:</strong> Jika ada multiple file, gunakan tombol 
          "◀ Kembali" dan "Lanjut ▶" untuk berpindah antar halaman hasil OCR.
        </li>
        <li>
          <strong>Validasi Data:</strong> Periksa data hasil ekstraksi seperti{" "}
          <em>Kode Setor</em>, <em>Jumlah</em>, dan <em>Tanggal</em>. Koreksi jika diperlukan.
        </li>
        <li>
          <strong>Simpan Data:</strong> Klik "💾 Simpan Halaman Ini" untuk menyimpan 
          halaman saat ini, atau "💾 Simpan Semua Halaman" untuk menyimpan semua data sekaligus.
        </li>
      </ol>
      <p className="tutorial-footer">
        Semua data yang telah disimpan dapat dicek dan diekspor di halaman "📜 Laporan".
      </p>
      <p className="tutorial-footer-note">
        Catatan: Hasil OCR sangat bergantung pada kejelasan dan kualitas gambar bukti setor.
      </p>
    </div>
  );
};

export default TutorialPanelBuktiSetor;
