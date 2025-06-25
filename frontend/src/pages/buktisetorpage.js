import React, { useState } from 'react';
import { processBuktiSetor, saveBuktiSetor, formatRupiah } from '../services/api';
import Notification from '../components/notification';

const BuktiSetorPage = () => {
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

    const handleProcess = async () => {
        if (!selectedFile) return setNotification({ message: 'Silakan pilih file bukti setor!', type: 'error' });
        
        setLoading(true);
        setNotification({ message: '', type: '' });
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const result = await processBuktiSetor(formData);
            setValidationData(result.data);
            setNotification({ message: result.message, type: 'success' });
        } catch (error) {
            setNotification({ message: `Error Proses: ${error.message}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };
    
    const handleSave = async (dataToSave) => {
        setSaving(true);
        try {
            const result = await saveBuktiSetor(dataToSave);
            setNotification({ message: result.message, type: 'success' });
            setValidationData(null);
        } catch (error) {
            setNotification({ message: `Error Simpan: ${error.message}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Upload Bukti Setor Pajak</h2>
                <p>Pilih file gambar atau PDF bukti setor Anda.</p>
                <div className="input-group">
                    <input type="file" onChange={handleFileChange} accept="image/*,.pdf" />
                    <button className="button" onClick={handleProcess} disabled={loading || !selectedFile}>
                        {loading ? 'Memproses...' : 'Proses Bukti Setor'}
                    </button>
                </div>
            </div>
            {validationData && <ValidationFormBuktiSetor initialData={validationData} onSave={handleSave} isSaving={saving} />}
            <Notification message={notification.message} type={notification.type} />
        </div>
    );
};

const ValidationFormBuktiSetor = ({ initialData, onSave, isSaving }) => {
    const [formData, setFormData] = useState(initialData);
    const handleChange = (e) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="card result-card validation-card">
            <h3>Hasil Ekstraksi - Validasi Bukti Setor</h3>
            <div className="validation-form">
                <div className="form-group"><label>Kode Setor</label><input type="text" name="kode_setor" value={formData.kode_setor} onChange={handleChange} /></div>
                <div className="form-group"><label>Tanggal</label><input type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} /></div>
                <div className="form-group"><label>Jumlah</label><input type="number" name="jumlah" value={formData.jumlah} onChange={handleChange} /><small>{formatRupiah(formData.jumlah)}</small></div>
            </div>
            <button className="button save-button" onClick={() => onSave(formData)} disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
            </button>
        </div>
    );
};

export default BuktiSetorPage;