import React, { useState, useEffect } from 'react';
import './App.css';

const formatRupiah = (numberString) => {
  if (!numberString || isNaN(parseFloat(numberString))) {
    return numberString; // Kembalikan nilai asli jika bukan angka
  }
  const number = parseFloat(numberString);
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal', // 'decimal' agar tidak ada simbol 'Rp'
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

// FUNGSI BARU: Helper untuk menghapus format Rupiah
// Menerima "2.400.000.000,00" dan mengembalikan "2400000000.00"
const unformatRupiah = (formattedString) => {
  if (typeof formattedString !== 'string') {
    return formattedString;
  }
  // Hapus semua titik, lalu ganti koma dengan titik
  return formattedString.replace(/\./g, '').replace(',', '.');
};

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null); // Data asli dari OCR
  const [formData, setFormData] = useState(null); // Data di form yang bisa diedit
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // URL Backend, agar mudah diubah jika perlu
  const API_URL = 'http://127.0.0.1:5000';

  // Efek ini akan berjalan ketika `extractedData` diperbarui (setelah OCR berhasil)
  // Tujuannya adalah untuk mengisi form dengan data hasil OCR
  useEffect(() => {
    if (extractedData) {
      setFormData(extractedData);
    }
  }, [extractedData]);


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setExtractedData(null); // Reset data sebelumnya
      setFormData(null); // Reset form
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Pilih file terlebih dahulu!");
      return;
    }
    setLoading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: uploadFormData,
      });
      const result = await response.json();
      if (response.ok) {
        setExtractedData(result.data); // Simpan hasil OCR di sini
      } else {
        alert(`Error OCR: ${result.error}`);
      }
    } catch (error) {
      alert(`Terjadi kesalahan: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menangani perubahan pada input form
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    // Hapus format Rupiah sebelum menyimpan ke state
    const unformattedValue = unformatRupiah(value);
    setFormData(prevData => ({
      ...prevData,
      [name]: unformattedValue,
    }));
  };

  // FUNGSI BARU: Mengirim data yang sudah divalidasi ke backend
  const handleSave = async () => {
    if (!formData) {
      alert("Tidak ada data untuk disimpan!");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Penting!
        },
        body: JSON.stringify(formData), // Kirim data form sebagai JSON
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        // Reset form setelah berhasil disimpan
        setPreview(null);
        setExtractedData(null);
        setFormData(null);
      } else {
        alert(`Error saat menyimpan: ${result.error}`);
      }
    } catch (error) {
      alert(`Terjadi kesalahan: ${error}`);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistem Rekap Dokumen Pajak</h1>
        <p>Unggah dokumen pajak (Faktur, Bupot, dll) untuk diekstrak datanya secara otomatis.</p>
      </header>
      
      <div className="card">
        <h2>Langkah 1: Upload & Proses Dokumen</h2>
        <input type="file" onChange={handleFileChange} accept="image/*" />
        <button className="button" onClick={handleUpload} disabled={loading || !selectedFile}>
          {loading ? 'Memproses...' : 'Proses Dokumen'}
        </button>
        {/* TOMBOL BARU: Ekspor ke Excel */}
        <a 
          href={`${API_URL}/api/export`} 
          className="button export-button"
          target="_blank" // Membuka di tab baru, lebih aman untuk download
          rel="noopener noreferrer"
        >
          Ekspor Semua Data ke Excel
        </a>
      </div>

      {preview && (
        <div className="card result-container">
          <h2>Langkah 2: Validasi Data</h2>
          <div className="preview-area">
            <h3>Dokumen Asli</h3>
            <img src={preview} alt="Preview Dokumen" className="preview-img" />
          </div>
          
          <div className="form-area">
            <h3>Data Hasil Ekstraksi (Bisa Diedit)</h3>
            {loading && <p>Membaca dokumen, mohon tunggu...</p>}
            {formData && (
              <div className="form-validator">
                <label htmlFor="dpp">DPP (Dasar Pengenaan Pajak):</label>
                <input 
                  type="text" 
                  id="dpp"
                  name="dpp" 
                  value={formatRupiah(formData.dpp) || ''} 
                  onChange={handleFormChange} 
                />
                
                <label htmlFor="ppn">PPN (Pajak Pertambahan Nilai):</label>
                <input 
                  type="text" 
                  id="ppn"
                  name="ppn" 
                  value={formatRupiah(formData.ppn) || ''} 
                  onChange={handleFormChange} 
                />
                
                {/* Tambahkan input lain di sini jika ada */}

                <button className="button save-button" onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Data Valid'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;