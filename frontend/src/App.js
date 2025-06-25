import React, { useState } from 'react';
import './App.css';
import ModalImage from 'react-modal-image';

function App() {
  const [ptUtama, setPtUtama] = useState('');
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [formPages, setFormPages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const API_URL = 'http://127.0.0.1:5000';

  const handleFileChange = (event) => {
    setSelectedFiles(event.target.files);
    setBatchResults([]);
    setFormPages([]);
    setCurrentIndex(0);
  };

  const updateCurrentField = (field, value) => {
    const updated = [...formPages];
    updated[currentIndex].data[field] = value;
    setFormPages(updated);
  };

  const handleProcessBatch = async () => {
    if (!ptUtama) {
      alert("Masukkan Nama PT Utama!");
      return;
    }
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Pilih satu atau lebih file PDF!");
      return;
    }

    setLoading(true);
    setBatchResults([]);
    setFormPages([]);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'png', 'jpg', 'jpeg'].includes(fileExt)) {
        alert(`File "${file.name}" tidak didukung. Gunakan PDF atau gambar.`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('nama_pt_utama', ptUtama);

      try {
        const response = await fetch(`${API_URL}/api/process`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        console.log("DEBUG result dari backend:", result);
        console.log("=== DEBUG: Full API Response ===");
        console.log(result);
        console.log("=== result.success:", result.success);
        console.log("=== result.results:", result.results);
        console.log("=== result.results.length:", result.results?.length);

        setBatchResults(prev => [...prev, { fileName: file.name, result }]);

        if (result.success && Array.isArray(result.results) && result.results.length > 0) {
          const filtered = (result.results || []).filter(r => r.data);
          const enriched = filtered.map((r) => ({
            ...r,
            fileName: file.name,
          }));
          setFormPages(prev => [...prev, ...enriched]);

          // Tampilkan error OCR jika ada
          (result.results || [])
            .filter(r => r.error)
            .forEach((r, idx) =>
              console.warn(`❌ Halaman error (${file.name}, Hal-${idx + 1}):`, r.error)
            );

            console.log("🎯 Full response from backend:", result);
            console.log("📦 Pages with data:", (result.results || []).filter(r => r.data));
        }
         else {
          alert(`Tidak ada hasil yang bisa ditampilkan dari file: ${file.name}`);
        }

      } catch (error) {
        setBatchResults(prev => [...prev, { fileName: file.name, result: { error: error.message } }]);
      }
    }

    setLoading(false);
  };

  const handleSave = async () => {
    // 1. Bungkus semua logika dengan blok try...catch
    try {
      const response = await fetch(`${API_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          klasifikasi: formPages[currentIndex].klasifikasi,
          data: formPages[currentIndex].data,
        }),
      });

      // 2. Periksa apakah respons TIDAK sukses (status bukan 2xx)
      if (!response.ok) {
        // Ambil pesan error dari body JSON yang dikirim backend
        const errData = await response.json(); 
        // Lemparkan error agar ditangkap oleh blok catch di bawah
        throw new Error(errData.error || `Terjadi kesalahan: ${response.statusText}`);
      }

      // Kode ini hanya akan berjalan jika respons sukses
      const res = await response.json();
      alert(res.message || 'Data berhasil disimpan!');

    } catch (error) {
      // 4. Tangkap semua error (baik dari 'throw' di atas maupun error jaringan)
      console.error("Gagal menyimpan data:", error);
      // Tampilkan pesan error yang sebenarnya kepada pengguna
      alert(`Gagal menyimpan: ${error.message}`);
    }
  };

  const currentForm = formPages[currentIndex];

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistem Rekap Dokumen Pajak Otomatis</h1>
        <p>Mendukung multi file & multi halaman, preview & validasi hasil OCR</p>
      </header>

      <div className="card">
        <h2>1. Nama Perusahaan</h2>
        <input
          type="text"
          value={ptUtama}
          onChange={(e) => setPtUtama(e.target.value)}
          placeholder="Contoh: PT MULTI INTAN PERKASA"
        />
      </div>

      <div className="card">
        <h2>2. Upload Faktur PDF/Gambar</h2>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
        />
        <button className="button" onClick={handleProcessBatch} disabled={loading}>
          {loading ? 'Sedang memproses...' : 'Proses Semua'}
        </button>
      </div>

      {formPages.length > 0 && currentForm?.data && (
        <div className="card">
          <h3>Validasi Halaman {currentIndex + 1} dari {formPages.length}</h3>

          <div className="preview-form-container">
            {/* Preview kiri */}
            <div className="preview-column">
              <label>Preview Gambar</label>
              {currentForm.data.preview_image ? (
                <ModalImage
                  small={`${API_URL}/preview/${currentForm.data.preview_image}`}
                  large={`${API_URL}/preview/${currentForm.data.preview_image}`}
                  alt="Preview Faktur"
                  hideDownload={true}
                  hideZoom={false}
                />
              ) : (
                <p className="error-text">Preview tidak tersedia</p>
              )}
              <small>
                File: <strong>{currentForm.fileName}</strong> | Halaman: {currentForm.data.halaman}
              </small>
            </div>

            {/* Form kanan */}
            <div className="form-column">
              <div className="validation-form">
                <div className="form-group">
                  <label>No Faktur</label>
                  <input
                    type="text"
                    value={currentForm.data.no_faktur}
                    onChange={(e) => updateCurrentField('no_faktur', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Tanggal</label>
                  <input
                    type="date"
                    value={currentForm.data.tanggal}
                    onChange={(e) => updateCurrentField('tanggal', e.target.value)}
                    // UBAH KONDISI: Terapkan gaya jika field tanggal kosong
                    className={!currentForm.data.tanggal ? 'input-warning' : ''}
                  />
                  {/* UBAH KONDISI: Tampilkan pesan jika field tanggal kosong */}
                  {!currentForm.data.tanggal && (
                    <small className="warning-text">
                      ⚠️ Tanggal wajib diisi sebelum menyimpan.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>NPWP</label>
                  <input
                    type="text"
                    value={currentForm.data.npwp_lawan_transaksi}
                    onChange={(e) => updateCurrentField('npwp_lawan_transaksi', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Nama Rekanan</label>
                  <input
                    type="text"
                    value={currentForm.data.nama_lawan_transaksi}
                    onChange={(e) => updateCurrentField('nama_lawan_transaksi', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>DPP</label>
                  <input
                    type="number"
                    value={currentForm.data.dpp}
                    onChange={(e) => updateCurrentField('dpp', e.target.value)}
                  />
                  <small>Tampilan: {currentForm.data.formatted_dpp || "Rp 0,00"}</small>
                </div>
                <div className="form-group">
                  <label>PPN</label>
                  <input
                    type="number"
                    value={currentForm.data.ppn}
                    onChange={(e) => updateCurrentField('ppn', e.target.value)}
                  />
                  <small>Tampilan: {currentForm.data.formatted_ppn || "Rp 0,00"}</small>
                </div>
                <div className="form-group full-width">
                  <label>Keterangan</label>
                  <textarea
                    rows={4}
                    value={currentForm.data.keterangan}
                    onChange={(e) => updateCurrentField('keterangan', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <a
              className="button export-button"
              href={`${API_URL}/api/export`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📤 Export ke Excel
            </a>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)}>
              ⬅️ Sebelumnya
            </button>
            <button className="button save-button" onClick={handleSave}>💾 Simpan ke DB</button>
            <button className="button" disabled={currentIndex === formPages.length - 1} onClick={() => setCurrentIndex(currentIndex + 1)}>
              Berikutnya ➡️
            </button>
          </div>
          <pre style={{ textAlign: 'left', background: '#f0f0f0', padding: 10 }}>
            {JSON.stringify(currentForm.data, null, 2)}
          </pre>
        </div>
      )}


      {batchResults.length > 0 && (
        <div className="card result-card">
          <h3>Hasil Pemrosesan File</h3>
          <ul>
            {batchResults.map((item, index) => (
              <React.Fragment key={index}>
                <li className="success-text">
                  <strong>{item.fileName}</strong>: Sukses
                </li>
                {(item.result?.results || [])
                  .filter(r => r.error)
                  .map((r, i) => (
                    <li key={`err-${index}-${i}`} className="error-text">
                      ➤ Halaman {i + 1} error: {r.error}
                    </li>
                  ))}
              </React.Fragment>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
