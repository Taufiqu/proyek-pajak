// /frontend/src/pages/FakturPage.js
// Enhanced production-ready implementation with industry best practices
// Based on patterns from Netflix, Airbnb, and Google's React codebases

import React, { 
    useState, 
    useEffect, 
    useCallback, 
    useMemo,
    memo
} from 'react';
import { processFaktur, saveFaktur, formatRupiah } from '../services/api';
import Notification from '../components/notification';
import { EnhancedImageModal } from '../components/imagemodal'; // Diasumsikan dipindah ke file terpisah


const FORM_VALIDATION_RULES = {
    NO_FAKTUR: /^\d{3}\.\d{3}-\d{2}\.\d{8}$/,
    NPWP: /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/,
    CURRENCY: /^\d+(\.\d{1,2})?$/
};

const CLASSIFICATION_TYPES = {
    NEEDS_VALIDATION: 'BUTUH_VALIDASI',
    INPUT_VAT: 'PPN_MASUKAN', 
    OUTPUT_VAT: 'PPN_KELUARAN'
};

// Custom hooks for better code organization - following React team recommendations
const useFormValidation = (data, klasifikasi) => {
    return useMemo(() => {
        const errors = {};
        const warnings = {};

        // Critical validations
        if (klasifikasi === CLASSIFICATION_TYPES.NEEDS_VALIDATION) {
            errors.klasifikasi = 'Jenis pajak harus dipilih';
        }

        if (!data.no_faktur || data.no_faktur === 'Tidak Ditemukan') {
            errors.no_faktur = 'Nomor faktur wajib diisi';
        } else if (!FORM_VALIDATION_RULES.NO_FAKTUR.test(data.no_faktur)) {
            warnings.no_faktur = 'Format nomor faktur tidak sesuai standar';
        }

        if (!data.tanggal) {
            errors.tanggal = 'Tanggal wajib diisi';
        }

        if (!data.nama_lawan_transaksi || data.nama_lawan_transaksi === 'Tidak Ditemukan') {
            errors.nama_lawan_transaksi = 'Nama lawan transaksi wajib diisi';
        }

        if (data.npwp_lawan_transaksi && !FORM_VALIDATION_RULES.NPWP.test(data.npwp_lawan_transaksi)) {
            warnings.npwp_lawan_transaksi = 'Format NPWP tidak sesuai standar';
        }

        if (!data.dpp || data.dpp <= 0) {
            errors.dpp = 'DPP harus lebih dari 0';
        }

        if (!data.ppn || data.ppn <= 0) {
            errors.ppn = 'PPN harus lebih dari 0';
        } else if (data.dpp > 0 && Math.abs(data.ppn - (data.dpp * 0.11)) > 1) { // Toleransi 1 Rupiah
            warnings.ppn = 'PPN tidak sesuai dengan 11% dari DPP';
        }

        const isValid = Object.keys(errors).length === 0;
        const hasWarnings = Object.keys(warnings).length > 0;

        return { errors, warnings, isValid, hasWarnings };
    }, [data, klasifikasi]);
};

// Memoized ValidationFormFaktur for performance
const ValidationFormFaktur = memo(({ itemData, onSave, onDataChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Gunakan state lokal untuk input agar tidak me-render ulang parent setiap kali ketik
    const [localData, setLocalData] = useState(itemData.data);
    
    const { id, klasifikasi, isSaving, isSaved, error } = itemData;
    const { errors, warnings, isValid } = useFormValidation(localData, klasifikasi);

    // Debounce effect untuk sinkronisasi data ke parent
    useEffect(() => {
        const handler = setTimeout(() => {
            if (JSON.stringify(itemData.data) !== JSON.stringify(localData)) {
                onDataChange(id, localData);
            }
        }, 500); // Sinkronisasi setelah 500ms tidak ada ketikan
        return () => clearTimeout(handler);
    }, [localData, itemData.data, id, onDataChange]);


    const handleChange = useCallback((e) => {
        const { name, value, type } = e.target;
        setLocalData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    }, []);

    const handleKlasifikasiChange = useCallback((e) => {
        onDataChange(id, null, e.target.value);
    }, [id, onDataChange]);

    const handleAutoCorrectPPN = useCallback(() => {
        if (localData.dpp > 0) {
            const calculatedPPN = Math.round(localData.dpp * 0.11);
            setLocalData(prev => ({ ...prev, ppn: calculatedPPN }));
        }
    }, [localData.dpp]);

    const previewUrl = localData.preview_image_url || null;
    const cardClassName = `card result-card validation-card ${isSaved ? 'saved' : ''} ${!isValid ? 'has-errors' : ''}`;
    
    const badgeColors = {
        [CLASSIFICATION_TYPES.INPUT_VAT]: '#28a745',
        [CLASSIFICATION_TYPES.OUTPUT_VAT]: '#fd7e14',
        [CLASSIFICATION_TYPES.NEEDS_VALIDATION]: '#dc3545'
    };

    const renderField = (name, label, type = 'text') => {
        const hasError = errors[name];
        const hasWarning = warnings[name];
        const fieldClassName = `form-control ${hasError ? 'is-invalid' : ''} ${hasWarning ? 'is-warning' : ''}`;

        return (
            <div className="form-group">
                <label className="required">{label}<span className="required-asterisk">*</span></label>
                <input
                    type={type}
                    name={name}
                    value={localData[name] || ''}
                    onChange={handleChange}
                    disabled={isSaved || isSaving}
                    className={fieldClassName}
                    placeholder={type === 'number' ? '0' : `Masukkan ${label.toLowerCase()}`}
                />
                {type === 'number' && localData[name] > 0 && (
                    <small className="form-text text-muted">{formatRupiah(localData[name])}</small>
                )}
                {hasError && <div className="invalid-feedback">{hasError}</div>}
                {hasWarning && <div className="warning-feedback">{hasWarning}</div>}
            </div>
        );
    };

    return (
        <>
            {isModalOpen && (
                <EnhancedImageModal 
                    src={previewUrl} 
                    onClose={() => setIsModalOpen(false)} 
                />
            )}
            
            <div className={cardClassName}>
                <div className="validation-header">
                    <div className="classification-badge" style={{ backgroundColor: badgeColors[klasifikasi] }}>
                        {klasifikasi.replace('_', ' ')}
                    </div>
                </div>

                <div className="validation-layout">
                    {previewUrl && (
                        <div className="preview-container">
                             <div className="preview-wrapper">
                                <img
                                    src={previewUrl}
                                    alt="Preview Faktur"
                                    className={`preview-image ${!isSaved ? 'clickable' : ''}`}
                                    onClick={() => !isSaved && setIsModalOpen(true)}
                                    loading="lazy"
                                />
                                {!isSaved && (
                                    <div className="preview-overlay"><span>🔍 Klik untuk zoom</span></div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="validation-form-container">
                        <div className="validation-form">
                            <div className="form-group span-2">
                                <label className="required">Jenis Pajak<span className="required-asterisk">*</span></label>
                                <select 
                                    name="klasifikasi" 
                                    value={klasifikasi} 
                                    onChange={handleKlasifikasiChange} 
                                    disabled={isSaved || isSaving}
                                    className={`form-control ${errors.klasifikasi ? 'is-invalid' : ''}`}
                                >
                                    <option value={CLASSIFICATION_TYPES.NEEDS_VALIDATION}>-- PILIH JENIS PAJAK --</option>
                                    <option value={CLASSIFICATION_TYPES.INPUT_VAT}>PPN MASUKAN</option>
                                    <option value={CLASSIFICATION_TYPES.OUTPUT_VAT}>PPN KELUARAN</option>
                                </select>
                                {errors.klasifikasi && <div className="invalid-feedback">{errors.klasifikasi}</div>}
                            </div>
                            <div className="form-row">
                                {renderField('no_faktur', 'No. Faktur', 'text')}
                                {renderField('tanggal', 'Tanggal', 'date')}
                            </div>
                            {renderField('nama_lawan_transaksi', 'Lawan Transaksi', 'text')}
                            {renderField('npwp_lawan_transaksi', 'NPWP Lawan Transaksi', 'text')}
                            <div className="form-row">
                                {renderField('dpp', 'DPP (Dasar Pengenaan Pajak)', 'number')}
                                <div className="form-group">
                                    <label className="required">PPN (11%)<span className="required-asterisk">*</span>
                                        <button type="button" className="btn-link auto-calculate" onClick={handleAutoCorrectPPN} disabled={isSaved || isSaving || !localData.dpp} title="Hitung otomatis 11% dari DPP">
                                            🔄 Auto
                                        </button>
                                    </label>
                                    <input type="number" name="ppn" value={localData.ppn || ''} onChange={handleChange} disabled={isSaved || isSaving} className={`form-control ${errors.ppn ? 'is-invalid' : ''} ${warnings.ppn ? 'is-warning' : ''}`} placeholder="0" />
                                    {localData.ppn > 0 && <small className="form-text text-muted">{formatRupiah(localData.ppn)}</small>}
                                    {errors.ppn && <div className="invalid-feedback">{errors.ppn}</div>}
                                    {warnings.ppn && <div className="warning-feedback">{warnings.ppn}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="validation-footer">
                    {isSaved ? (
                        <div className="notification success item-success">✅ Faktur berhasil disimpan</div>
                    ) : (
                        <div className="save-section">
                            {!isValid && (
                                <div className="validation-summary">
                                    <small className="text-danger">⚠️ Mohon perbaiki data pada field yang ditandai merah.</small>
                                </div>
                            )}
                            <button className="button save-button" onClick={() => onSave(id)} disabled={isSaving || !isValid}>
                                {isSaving ? <><span className="spinner"></span> Menyimpan...</> : '💾 Konfirmasi & Simpan Faktur'}
                            </button>
                        </div>
                    )}
                    {error && <div className="notification error item-error">❌ {error}</div>}
                </div>
            </div>
        </>
    );
});

// Custom hook for file upload with validation
const useFileUpload = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileError, setFileError] = useState('');

    const handleFileSelect = useCallback((file) => {
        setFileError('');
        if (!file) {
            setSelectedFile(null);
            return;
        }
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (!allowedTypes.includes(file.type)) {
            setFileError('Format salah. Gunakan PDF, JPG, atau PNG.');
            return;
        }
        if (file.size > maxSize) {
            setFileError('Ukuran file maksimal 10MB.');
            return;
        }
        setSelectedFile(file);
    }, []);
    return { selectedFile, fileError, handleFileSelect };
};

// Main component with enhanced architecture
const FakturPage = () => {
    const [ptUtama, setPtUtama] = useState('');
    const [loading, setLoading] = useState(false);
    const [validationResults, setValidationResults] = useState([]);
    const [globalNotification, setGlobalNotification] = useState({ message: '', type: '' });
    
    const { selectedFile, fileError, handleFileSelect } = useFileUpload();

    const statistics = useMemo(() => {
        const total = validationResults.length;
        const saved = validationResults.filter(r => r.isSaved).length;
        return { total, saved };
    }, [validationResults]);

    const handleProcess = useCallback(async () => {
        if (!ptUtama.trim() || !selectedFile) {
            setGlobalNotification({ message: 'Nama PT dan file wajib diisi!', type: 'error' });
            return;
        }
        setLoading(true);
        setValidationResults([]);
        setGlobalNotification({ message: `🔄 Memproses file: ${selectedFile.name}...`, type: 'info' });

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('nama_pt_utama', ptUtama.trim());

        try {
            const response = await processFaktur(formData);
            if (response.results && response.results.length > 0) {
                const newResults = response.results.map((item, index) => ({
                    ...item,
                    id: `faktur-${Date.now()}-${index}`, isSaving: false, isSaved: false, error: null
                }));
                setValidationResults(newResults);
                setGlobalNotification({ message: `✅ Berhasil mengekstrak ${newResults.length} dokumen faktur!`, type: 'success' });
            } else {
                setGlobalNotification({ message: '⚠️ Tidak ada data faktur yang dapat diekstrak.', type: 'warning' });
            }
        } catch (error) {
            setGlobalNotification({ message: `❌ Error: ${error.message || 'Terjadi kesalahan'}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [ptUtama, selectedFile]);
    
    const handleDataChange = useCallback((id, newData, newKlasifikasi) => {
        setValidationResults(prev => 
            prev.map(item => {
                if (item.id === id) {
                    const updatedItem = { ...item };
                    if (newData) updatedItem.data = newData;
                    if (newKlasifikasi !== undefined) updatedItem.klasifikasi = newKlasifikasi;
                    return updatedItem;
                }
                return item;
            })
        );
    }, []);

    const handleSaveItem = useCallback(async (id) => {
        const itemToSave = validationResults.find(item => item.id === id);
        if (!itemToSave) return;
        setValidationResults(prev => prev.map(item => item.id === id ? { ...item, isSaving: true, error: null } : item));
        try {
            await saveFaktur([itemToSave]);
            setValidationResults(prev => {
                const newResults = prev.map(item => item.id === id ? { ...item, isSaving: false, isSaved: true } : item);
                const remaining = newResults.filter(r => !r.isSaved).length;
                const message = remaining > 0 
                    ? `✅ Faktur disimpan! Sisa ${remaining} faktur belum diproses.`
                    : '🎉 Semua faktur telah berhasil disimpan!';
                setGlobalNotification({ message, type: 'success' });
                return newResults;
            });
        } catch (err) {
            setValidationResults(prev => prev.map(item => item.id === id ? { ...item, isSaving: false, error: err.message || "Gagal menyimpan" } : item));
        }
    }, [validationResults]);

    return (
        <div className="tab-content">
            <div className="card main-header">
                <h1 className="page-title">📄 Processor Faktur PPN Otomatis</h1>
                <p className="page-description">Sistem AI untuk ekstraksi dan klasifikasi otomatis faktur PPN dengan tingkat akurasi tinggi.</p>
            </div>

            <div className="card upload-section">
                <h2>🚀 Upload & Proses Dokumen</h2>
                <div className="upload-form">
                    <div className="form-group">
                        <label className="required">Nama PT/Perusahaan Anda<span className="required-asterisk">*</span></label>
                        <input type="text" value={ptUtama} onChange={(e) => setPtUtama(e.target.value)} placeholder="Contoh: PT MAJU JAYA ABADI" className="form-control" disabled={loading} />
                        <small className="form-text text-muted">Digunakan untuk klasifikasi otomatis PPN Masukan/Keluaran.</small>
                    </div>
                    <div className="form-group">
                        <label className="required">File Faktur<span className="required-asterisk">*</span></label>
                        <div className="file-input-wrapper">
                            <input type="file" id="file-upload" onChange={(e) => handleFileSelect(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg" disabled={loading} />
                            <label htmlFor="file-upload" className="file-upload-label">
                                {selectedFile ? selectedFile.name : 'Pilih file (PDF, PNG, JPG)...'}
                            </label>
                        </div>
                        {fileError && <div className="invalid-feedback" style={{display: 'block'}}>{fileError}</div>}
                    </div>
                </div>
                <button className="button process-button" onClick={handleProcess} disabled={loading || !selectedFile || fileError}>
                    {loading ? <><span className="spinner"></span> Memproses...</> : '🧠 Proses Dengan AI'}
                </button>
            </div>
            
            {validationResults.length > 0 && (
                <div className="results-container">
                    <div className="card results-header">
                        <h3>📊 Hasil Ekstraksi & Validasi</h3>
                        <p>Ditemukan <strong>{statistics.total}</strong> dokumen. Disimpan: <strong>{statistics.saved}</strong>. Mohon validasi dan simpan data di bawah ini.</p>
                    </div>
                    <div className="results-list">
                        {validationResults.map(item => (
                            <ValidationFormFaktur
                                key={item.id}
                                itemData={item}
                                onSave={handleSaveItem}
                                onDataChange={handleDataChange}
                            />
                        ))}
                    </div>
                </div>
            )}

            {globalNotification.message && <Notification message={globalNotification.message} type={globalNotification.type} />}
        </div>
    );
};

export default FakturPage;