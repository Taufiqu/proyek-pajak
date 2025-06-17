import React, { useState } from 'react';
import './App.css';

// Helper untuk format Rupiah (untuk tampilan)
const formatRupiah = (number) => {
  if (number === undefined || number === null || isNaN(Number(number))) return "0,00";
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(number));
};

function App() {
  const [ptUtama, setPtUtama] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // State untuk menampung hasil dari backend untuk diedit
  const [validationData, setValidationData] = useState(null);

  // State untuk pesan notifikasi
  const [notification, setNotification] = useState({ message: '', type: '' });

  const API_URL = 'http://127.0.0.1:5000';

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setNotification({ message: '', type: '' });
    setValidationData(null);
  };

  const handleProcess = async () => {
    if (!ptUtama) { alert("Masukkan Nama PT Utama!"); return; }
    if (!selectedFile) { alert("Pilih file PDF!"); return; }

    setLoading(true);
    setNotification({ message: '', type: '' });
    setValidationData(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('nama_pt_utama', ptUtama);

    try {
      const response = await fetch(`${API_URL}/api/process`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (response.ok) {
        setValidationData(result);
      } else {
        setNotification({ message: `Error Proses: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setNotification({ message: `Error Koneksi: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
      document.getElementById('file-input').value = null;
      setSelectedFile(null);
    }
  };

  // FUNGSI BARU: Menangani perubahan pada form validasi
  const handleValidationChange = (e) => {
    const { name, value } = e.target;
    setValidationData(prev => ({
        ...prev,
        data: {
            ...prev.data,
            [name]: value
        }
    }));
  };

  const handleSave = async () => {
    if (!validationData) return;

    setSaving(true);
    setNotification({ message: '', type: '' });

    try {
        const response = await fetch(`${API_URL}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validationData),
        });
        const result = await response.json();

        if (response.status === 201) {
            setNotification({ message: result.message, type: 'success' });
            setValidationData(null);
        } else {
            setNotification({ message: result.message, type: 'error' });
        }
    } catch (error) {
        setNotification({ message: `Error Koneksi: ${error.message}`, type: 'error' });
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistem Rekap Dokumen Pajak Otomatis</h1>
        <p>Validasi dan edit data hasil OCR sebelum disimpan ke database.</p>
      </header>
      
      {/* Bagian Input (Tidak berubah) */}
      <div className="card">
        <h2>Langkah 1: Konfigurasi & Upload</h2>
        <div className="input-group">
          <label htmlFor="ptUtama">Nama PT Utama:</label>
          <input type="text" id="ptUtama" value={ptUtama} onChange={(e) => setPtUtama(e.target.value)} placeholder="Contoh: PT MULTI INTAN PERKASA" className="input-field"/>
        </div>
        <div className="input-group">
          <input type="file" id="file-input" onChange={handleFileChange} accept=".pdf"/>
          <button className="button" onClick={handleProcess} disabled={loading}>
            {loading ? 'Memproses...' : 'Proses Dokumen'}
          </button>
        </div>
      </div>

      {/* Kartu Notifikasi */}
      {notification.message && (
        <div className={`card result-card ${notification.type}`}>
          <p>{notification.message}</p>
        </div>
      )}

      {/* KARTU VALIDASI BARU DENGAN FORM EDIT */}
      {validationData && (
        <div className="card result-card validation-card">
          <h3>Hasil Ekstraksi - Validasi & Edit Data</h3>
          <p><strong>Klasifikasi Terdeteksi:</strong> {validationData.klasifikasi}</p>
          <div className="validation-form">
            <div className="form-group">
              <label htmlFor="no_faktur">No. Faktur</label>
              <input type="text" id="no_faktur" name="no_faktur" value={validationData.data.no_faktur} onChange={handleValidationChange} />
            </div>
            <div className="form-group">
              <label htmlFor="tanggal">Tanggal (YYYY-MM-DD)</label>
              <input type="text" id="tanggal" name="tanggal" value={validationData.data.tanggal} onChange={handleValidationChange} />
            </div>
            <div className="form-group">
              <label htmlFor="nama_lawan_transaksi">Nama Lawan Transaksi</label>
              <input type="text" id="nama_lawan_transaksi" name="nama_lawan_transaksi" value={validationData.data.nama_lawan_transaksi} onChange={handleValidationChange} />
            </div>
            <div className="form-group">
              <label htmlFor="npwp_lawan_transaksi">NPWP Lawan Transaksi</label>
              <input type="text" id="npwp_lawan_transaksi" name="npwp_lawan_transaksi" value={validationData.data.npwp_lawan_transaksi} onChange={handleValidationChange} />
            </div>
            <div className="form-group">
              <label htmlFor="dpp">DPP (Rupiah)</label>
              <input type="number" step="0.01" id="dpp" name="dpp" value={validationData.data.dpp} onChange={handleValidationChange} />
              <small>Tampilan: {formatRupiah(validationData.data.dpp)}</small>
            </div>
            <div className="form-group">
              <label htmlFor="ppn">PPN (Rupiah)</label>
              <input type="number" step="0.01" id="ppn" name="ppn" value={validationData.data.ppn} onChange={handleValidationChange} />
              <small>Tampilan: {formatRupiah(validationData.data.ppn)}</small>
            </div>
            <div className="form-group full-width">
              <label htmlFor="keterangan">Keterangan</label>
              <textarea id="keterangan" name="keterangan" value={validationData.data.keterangan} onChange={handleValidationChange} rows="5" className="textarea-field"></textarea>
            </div>
          </div>
          <button className="button save-button" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Konfirmasi & Simpan Data'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
