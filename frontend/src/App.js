import React, { useState, useEffect } from 'react';

// ==============================================================================
// KOMPONEN GAYA (PENGGANTI App.css)
// Untuk mengatasi error "Could not resolve ./App.css", semua gaya (CSS)
// disuntikkan langsung ke halaman melalui komponen ini.
// ==============================================================================
const GlobalStyles = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
          sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: #f0f2f5;
        color: #333;
      }

      .App {
        text-align: center;
      }

      .App-header {
        background-color: #282c34;
        padding: 20px;
        color: white;
        margin-bottom: 2rem;
      }
      
      .App-header h1 {
        margin: 0;
        font-size: 2rem;
      }

      .App-header p {
        margin-top: 8px;
        color: #ccc;
      }
      
      main {
        padding: 0 1rem;
      }

      .tab-nav {
        margin-bottom: 2rem;
        border-bottom: 2px solid #ddd;
        padding-bottom: 1px;
      }

      .tab-nav button {
        padding: 10px 20px;
        border: none;
        background-color: transparent;
        font-size: 1rem;
        cursor: pointer;
        margin: 0 5px;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
        position: relative;
        top: 2px;
      }

      .tab-nav button.active {
        border-bottom: 3px solid #61dafb;
        color: #61dafb;
      }

      .tab-nav button:hover {
        background-color: #f0f0f0;
      }
      
      .tab-content {
        max-width: 900px;
        margin: 0 auto;
      }

      .card {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 2rem;
        margin-bottom: 1.5rem;
        text-align: left;
      }
      
      .card h2 {
        margin-top: 0;
        border-bottom: 1px solid #eee;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
      }

      .input-group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .input-group label {
        font-weight: bold;
        flex-basis: 150px;
      }

      .input-field, .input-group input[type="text"], .input-group input[type="file"], .input-group input[type="date"], .input-group input[type="number"] {
        flex-grow: 1;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      .button {
        background-color: #61dafb;
        color: #282c34;
        border: none;
        padding: 12px 20px;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }

      .button:hover {
        background-color: #52b8d8;
      }
      
      .button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }

      .save-button {
        background-color: #4CAF50;
        color: white;
      }
      .save-button:hover {
        background-color: #45a049;
      }

      .notification {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1.5rem;
        text-align: center;
      }
      .notification.success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      .notification.error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }

      .validation-card h3 {
        margin-top: 0;
      }
      
      .validation-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
      }
      
      .form-group label {
        font-weight: bold;
        margin-bottom: 0.5rem;
      }

      .form-group input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box; /* Ensures padding doesn't affect width */
      }
      
      .form-group small {
        margin-top: 0.5rem;
        color: #666;
        font-size: 0.875rem;
      }

      .laporan-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      
      .laporan-controls select {
        padding: 10px;
        border-radius: 4px;
        border: 1px solid #ccc;
      }
      
      .table-container {
        overflow-x: auto;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
      }
      
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
    `;
    document.head.appendChild(style);

    // Membersihkan style saat komponen dilepas
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

// ==============================================================================
// Komponen Logika Aplikasi
// ==============================================================================

// Helper untuk format Rupiah
const formatRupiah = (number) => {
  if (number === undefined || number === null || isNaN(Number(number))) return "Rp 0,00";
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2 }).format(Number(number));
};

const API_URL = 'http://localhost:5000';

const TabFaktur = () => {
  const [ptUtama, setPtUtama] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setNotification({ message: '', type: '' });
    setValidationData(null);
  };

  const handleProcessFaktur = async () => {
    if (!ptUtama) { alert("Masukkan Nama PT Utama!"); return; }
    if (!selectedFile) { alert("Pilih file PDF Faktur!"); return; }

    setLoading(true);
    setNotification({ message: '', type: '' });
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('nama_pt_utama', ptUtama);

    try {
      const response = await fetch(`${API_URL}/api/process_faktur`, { method: 'POST', body: formData });
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
    }
  };

  const handleValidationChange = (e) => {
    const { name, value } = e.target;
    setValidationData(prev => ({ ...prev, data: { ...prev.data, [name]: value } }));
  };

  const handleSaveFaktur = async () => {
    if (!validationData) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/save_faktur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData),
      });
      const result = await response.json();
      setNotification({ message: result.message, type: response.ok ? 'success' : 'error' });
      if (response.ok) setValidationData(null);
    } catch (error) {
      setNotification({ message: `Error Koneksi: ${error.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="card">
        <h2>Langkah 1: Konfigurasi & Upload Faktur PPN</h2>
        <div className="input-group">
          <label htmlFor="ptUtama">Nama PT Utama:</label>
          <input type="text" id="ptUtama" value={ptUtama} onChange={(e) => setPtUtama(e.target.value)} placeholder="Contoh: PT MULTI INTAN PERKASA" className="input-field"/>
        </div>
        <div className="input-group">
          <input type="file" onChange={handleFileChange} accept=".pdf"/>
          <button className="button" onClick={handleProcessFaktur} disabled={loading}>{loading ? 'Memproses...' : 'Proses Faktur'}</button>
        </div>
      </div>

      {notification.message && !validationData && <div className={`card notification ${notification.type}`}><p>{notification.message}</p></div>}
      
      {validationData && (
        <div className="card result-card validation-card">
          <h3>Hasil Ekstraksi - Validasi & Edit Data Faktur</h3>
          <p><strong>Klasifikasi Terdeteksi:</strong> {validationData.klasifikasi}</p>
          <div className="validation-form">
            <div className="form-group"><label>No. Faktur</label><input type="text" name="no_faktur" value={validationData.data.no_faktur} onChange={handleValidationChange} /></div>
            <div className="form-group"><label>Tanggal</label><input type="date" name="tanggal" value={validationData.data.tanggal} onChange={handleValidationChange} /></div>
            <div className="form-group"><label>Nama Lawan Transaksi</label><input type="text" name="nama_lawan_transaksi" value={validationData.data.nama_lawan_transaksi} onChange={handleValidationChange} /></div>
            <div className="form-group"><label>NPWP Lawan Transaksi</label><input type="text" name="npwp_lawan_transaksi" value={validationData.data.npwp_lawan_transaksi} onChange={handleValidationChange} /></div>
            <div className="form-group">
                <label>DPP</label>
                <input type="number" step="0.01" name="dpp" value={validationData.data.dpp} onChange={handleValidationChange} />
                <small>Tampilan: {formatRupiah(validationData.data.dpp)}</small>
            </div>
            <div className="form-group">
                <label>PPN</label>
                <input type="number" step="0.01" name="ppn" value={validationData.data.ppn} onChange={handleValidationChange} />
                <small>Tampilan: {formatRupiah(validationData.data.ppn)}</small>
            </div>
          </div>
          {notification.message && <div className={`notification ${notification.type}`}><p>{notification.message}</p></div>}
          <button className="button save-button" onClick={handleSaveFaktur} disabled={saving}>{saving ? 'Menyimpan...' : 'Konfirmasi & Simpan Data Faktur'}</button>
        </div>
      )}
    </div>
  );
};

const TabBuktiSetor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Tambahan untuk validasi manual
  const [validationData, setValidationData] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setNotification({ message: '', type: '' });
    setValidationData(null);
  };

  const handleProcessBuktiSetor = async () => {
    if (!selectedFile) {
      alert("Pilih file Bukti Setor!");
      return;
    }
    setLoading(true);
    setNotification({ message: '', type: '' });

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/process_bukti_setor`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (response.ok) {
        setValidationData(result.data);
        setNotification({ message: "Data berhasil diekstrak. Silakan konfirmasi dan simpan.", type: 'success' });
      } else {
        setNotification({ message: result.error || "Gagal memproses.", type: 'error' });
      }
    } catch (error) {
      setNotification({ message: `Error Koneksi: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
      setSelectedFile(null);
      if (document.getElementById('bukti-setor-file-input')) {
        document.getElementById('bukti-setor-file-input').value = null;
      }
    }
  };

  const handleSaveBuktiSetor = async () => {
    if (!validationData) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/save_bukti_setor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData)
      });
      const result = await response.json();
      setNotification({ message: result.message, type: response.ok ? 'success' : 'error' });
      if (response.ok) setValidationData(null);
    } catch (error) {
      setNotification({ message: `Error Koneksi: ${error.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="card">
        <h2>Upload Bukti Setor Pajak</h2>
        <p>Pilih file gambar atau PDF bukti setor Anda. Sistem akan otomatis memproses dan menampilkan data untuk dikonfirmasi.</p>
        <div className="input-group">
          <input type="file" id="bukti-setor-file-input" onChange={handleFileChange} accept="image/png, image/jpeg, .pdf" />
          <button className="button" onClick={handleProcessBuktiSetor} disabled={loading || !selectedFile}>
            {loading ? 'Memproses...' : 'Proses Bukti Setor'}
          </button>
        </div>
      </div>

      {validationData && (
        <div className="card result-card validation-card">
          <h3>Hasil Ekstraksi - Validasi & Edit Bukti Setor</h3>
          <div className="validation-form">
            <div className="form-group">
              <label>Kode Setor</label>
              <input
                type="text"
                name="kode_setor"
                value={validationData.kode_setor}
                onChange={(e) =>
                  setValidationData(prev => ({ ...prev, kode_setor: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label>Tanggal</label>
              <input
                type="date"
                name="tanggal"
                value={validationData.tanggal}
                onChange={(e) =>
                  setValidationData(prev => ({ ...prev, tanggal: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label>Jumlah</label>
              <input
                type="number"
                name="jumlah"
                value={validationData.jumlah}
                onChange={(e) =>
                  setValidationData(prev => ({ ...prev, jumlah: e.target.value }))
                }
              />
              <small>Tampilan: {formatRupiah(validationData.jumlah)}</small>
            </div>
          </div>
          <button
            className="button save-button"
            onClick={handleSaveBuktiSetor}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Konfirmasi & Simpan Data Bukti Setor'}
          </button>
        </div>
      )}

      {notification.message && (
        <div className={`card notification ${notification.type}`}>
          <p>{notification.message}</p>
        </div>
      )}
    </div>
  );
};

const TabLaporan = () => {
    const [laporanData, setLaporanData] = useState([]);
    const [jenisLaporan, setJenisLaporan] = useState('ppn_masukan');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLaporan = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_URL}/api/laporan/${jenisLaporan}`);
                const data = await response.json();
                setLaporanData(data);
            } catch (error) {
                console.error("Gagal mengambil data laporan:", error);
                setLaporanData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchLaporan();
    }, [jenisLaporan]);

    const handleExport = () => {
      window.open(`${API_URL}/api/export/${jenisLaporan}`, '_blank');
    };

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Laporan Data Pajak</h2>
                <div className="laporan-controls">
                    <select value={jenisLaporan} onChange={(e) => setJenisLaporan(e.target.value)}>
                        <option value="ppn_masukan">PPN Masukan</option>
                        <option value="ppn_keluaran">PPN Keluaran</option>
                        <option value="bukti_setor">Bukti Setor</option>
                    </select>
                    <button className="button" onClick={handleExport} disabled={laporanData.length === 0}>
                        Download Laporan Excel
                    </button>
                </div>
                <div className="table-container">
                    {loading ? <p>Memuat data...</p> : (
                        <table>
                            <thead>
                                {jenisLaporan === 'bukti_setor' ? (
                                    <tr><th>Tanggal</th><th>Kode Setor</th><th>Jumlah</th></tr>
                                ) : (
                                    <tr><th>Tanggal</th><th>No. Faktur</th><th>Nama Lawan Transaksi</th><th>DPP</th><th>PPN</th></tr>
                                )}
                            </thead>
                            <tbody>
                                {laporanData.length > 0 ? laporanData.map(item => (
                                    <tr key={item.id}>
                                        {jenisLaporan === 'bukti_setor' ? (
                                            <><td>{item.tanggal}</td><td>{item.kode_setor}</td><td>{formatRupiah(item.jumlah)}</td></>
                                        ) : (
                                            <><td>{item.tanggal}</td><td>{item.no_faktur}</td><td>{item.nama_lawan_transaksi}</td><td>{formatRupiah(item.dpp)}</td><td>{formatRupiah(item.ppn)}</td></>
                                        )}
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5">Tidak ada data untuk ditampilkan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

function App() {
  const [activeTab, setActiveTab] = useState('faktur');

  return (
    <div className="App">
      {/* Komponen ini akan menyuntikkan semua CSS saat aplikasi dimuat */}
      <GlobalStyles />
      
      <header className="App-header">
        <h1>Sistem Rekap Dokumen Pajak Otomatis</h1>
        <p>Upload, validasi, dan kelola dokumen PPN serta Bukti Setor Pajak.</p>
      </header>
      
      <nav className="tab-nav">
        <button onClick={() => setActiveTab('faktur')} className={activeTab === 'faktur' ? 'active' : ''}>Faktur PPN</button>
        <button onClick={() => setActiveTab('buktiSetor')} className={activeTab === 'buktiSetor' ? 'active' : ''}>Bukti Setor</button>
        <button onClick={() => setActiveTab('laporan')} className={activeTab === 'laporan' ? 'active' : ''}>Laporan</button>
      </nav>

      <main>
        {activeTab === 'faktur' && <TabFaktur />}
        {activeTab === 'buktiSetor' && <TabBuktiSetor />}
        {activeTab === 'laporan' && <TabLaporan />}
      </main>
    </div>
  );
}

export default App;