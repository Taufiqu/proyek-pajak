import React, { useState } from 'react';
import { processFaktur, saveFaktur, formatRupiah } from '../services/api';
import Notification from '../components/notification';

const FakturPage = () => {
    const [ptUtama, setPtUtama] = useState('PT MULTI INTAN PERKASA');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [extractedResults, setExtractedResults] = useState([]); // <-- State untuk menampung array hasil
    const [notification, setNotification] = useState({ message: '', type: '' });

    const handleProcess = async () => {
        if (!ptUtama) return setNotification({ message: 'Nama PT Utama wajib diisi!', type: 'error' });
        if (!selectedFile) return setNotification({ message: 'Silakan pilih file PDF Faktur!', type: 'error' });
        
        setLoading(true);
        setNotification({ message: '', type: '' });
        setExtractedResults([]);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('nama_pt_utama', ptUtama);

        try {
            const response = await processFaktur(formData);
            if (response.results && response.results.length > 0) {
                setExtractedResults(response.results);
                setNotification({ message: `Ekstraksi berhasil! Ditemukan ${response.results.length} dokumen.`, type: 'success' });
            } else {
                setNotification({ message: 'Tidak ada dokumen faktur yang dapat diekstrak dari file ini.', type: 'error' });
            }
        } catch (error) {
            setNotification({ message: `Error Proses: ${error.message}`, type: 'error' });
        } finally { setLoading(false); }
    };

    const handleSaveAll = async () => {
        if (extractedResults.length === 0) return;
        setSaving(true);
        try {
            // Kirim seluruh array hasil untuk disimpan
            const result = await saveFaktur(extractedResults);
            setNotification({ message: result.message, type: 'success' });
            setExtractedResults([]); // Kosongkan setelah berhasil
        } catch (error) {
            setNotification({ message: `Error Simpan: ${error.message}`, type: 'error' });
        } finally { setSaving(false); }
    };
    
    // Fungsi untuk memperbarui data di dalam state array
    const handleValidationChange = (index, fieldName, value) => {
        const updatedResults = [...extractedResults];
        updatedResults[index].data[fieldName] = value;
        setExtractedResults(updatedResults);
    };

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Upload & Proses Faktur PPN</h2>
                <div className="input-group"><label htmlFor="ptUtama">Nama PT Utama:</label><input type="text" id="ptUtama" value={ptUtama} onChange={(e) => setPtUtama(e.target.value)} className="input-field" /></div>
                <div className="input-group"><input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} accept=".pdf, image/*" /><button className="button" onClick={handleProcess} disabled={loading || !selectedFile}>{loading ? 'Memproses...' : 'Proses Faktur'}</button></div>
            </div>
            
            {extractedResults.map((result, index) => (
                <ValidationFormFaktur 
                    key={index}
                    index={index}
                    data={result} 
                    onChange={handleValidationChange}
                />
            ))}

            <Notification message={notification.message} type={notification.type} />

            {extractedResults.length > 0 && (
                <div className="card" style={{ textAlign: 'center' }}>
                    <button className="button save-button" onClick={handleSaveAll} disabled={saving}>
                        {saving ? 'Menyimpan...' : `Simpan Semua (${extractedResults.length}) Dokumen`}
                    </button>
                </div>
            )}
        </div>
    );
};

const ValidationFormFaktur = ({ index, data, onChange }) => {
    const { klasifikasi, data: faktur, halaman, preview_image } = data;
    
    const handleChange = (e) => {
        onChange(index, e.target.name, e.target.value);
    };

    return (
        <div className="card result-card validation-card" style={{borderLeft: `5px solid ${klasifikasi === 'PPN_MASUKAN' ? '#2196F3' : '#4CAF50'}`}}>
            <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '300px'}}>
                    <h3>Halaman {halaman} - {klasifikasi.replace('_', ' ')}</h3>
                    <div className="validation-form">
                        <div className="form-group"><label>No. Faktur</label><input type="text" name="no_faktur" value={faktur.no_faktur} onChange={handleChange} /></div>
                        <div className="form-group"><label>Tanggal</label><input type="date" name="tanggal" value={faktur.tanggal} onChange={handleChange} /></div>
                        <div className="form-group"><label>Lawan Transaksi</label><input type="text" name="nama_lawan_transaksi" value={faktur.nama_lawan_transaksi} onChange={handleChange} /></div>
                        <div className="form-group"><label>NPWP</label><input type="text" name="npwp_lawan_transaksi" value={faktur.npwp_lawan_transaksi} onChange={handleChange} /></div>
                        <div className="form-group"><label>DPP</label><input type="number" step="0.01" name="dpp" value={faktur.dpp} onChange={handleChange} /><small>{formatRupiah(faktur.dpp)}</small></div>
                        <div className="form-group"><label>PPN</label><input type="number" step="0.01" name="ppn" value={faktur.ppn} onChange={handleChange} /><small>{formatRupiah(faktur.ppn)}</small></div>
                    </div>
                </div>
                {preview_image && (
                    <div style={{flex: '0 0 200px', textAlign: 'center'}}>
                        <h4>Preview Halaman {halaman}</h4>
                        <img 
                            src={`http://localhost:5000/api/faktur/preview/${preview_image}`} 
                            alt={`Preview Halaman ${halaman}`} 
                            style={{width: '100%', border: '1px solid #ddd', borderRadius: '4px'}}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FakturPage;