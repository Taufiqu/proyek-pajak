import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { processBuktiSetor, saveBuktiSetor, formatRupiah } from '../services/api';
import Notification from '../components/notification';

// Komponen Modal tidak berubah
const ImageModal = ({ src, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    useLayoutEffect(() => {
        const image = imgRef.current;
        const container = containerRef.current;
        if (!image || !container) return;
        const setInitialScale = () => {
            const { naturalWidth, naturalHeight } = image;
            if (naturalWidth > 0 && naturalHeight > 0) {
                const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
                const scaleX = containerWidth / naturalWidth;
                const scaleY = containerHeight / naturalHeight;
                const initialScale = Math.min(scaleX, scaleY);
                setScale(initialScale);
            }
        };
        if (image.complete) {
            setInitialScale();
        } else {
            image.onload = setInitialScale;
        }
    }, [src]);

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        if(imgRef.current) imgRef.current.style.cursor = 'grabbing';
    };
    const handleMouseUp = () => {
        isDragging.current = false;
        if(imgRef.current) imgRef.current.style.cursor = 'grab';
    };
    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        setPosition({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
    };
    const handleWheel = (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        if (e.deltaY < 0) setScale(s => Math.min(s * zoomFactor, 5));
        else setScale(s => Math.max(s / zoomFactor, 0.2));
    };
    const handleReset = () => {
        if (imgRef.current && containerRef.current) {
            const { naturalWidth, naturalHeight } = imgRef.current;
            const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
            const initialScale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
            setScale(initialScale);
            setPosition({ x: 0, y: 0 });
        }
    };
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={(e) => e.stopPropagation()} onWheel={handleWheel}><button className="modal-close-btn" onClick={onClose}>&times;</button><div className="modal-image-container" ref={containerRef}><img ref={imgRef} src={src} alt="Zoomed Preview" className="modal-image" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onMouseLeave={handleMouseUp}/></div><div className="modal-controls"><button onClick={() => setScale(s => s * 1.2)}>+</button><button onClick={() => setScale(s => s / 1.2)}>-</button><button onClick={handleReset}>Reset</button></div></div></div>
    );
};


// --- Komponen Form Validasi ---
// Komponen ini menjadi lebih "presentational" dan menerima state dari parent
const ValidationFormBuktiSetor = ({ itemData, onSave, onDataChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { id, kode_setor, tanggal, jumlah, preview_filename, isSaving, isSaved, error } = itemData;

    const handleChange = (e) => {
        onDataChange(id, e.target.name, e.target.value);
    };

    const previewUrl = preview_filename ? `/api/bukti_setor/uploads/${preview_filename}` : null;
    const cardClassName = `card result-card validation-card ${isSaved ? 'saved' : ''}`;

    return (
        <>
            {isModalOpen && <ImageModal src={previewUrl} onClose={() => setIsModalOpen(false)} />}
            
            <div className={cardClassName}>
                <div className="validation-layout">
                    {previewUrl && (
                        <div className="preview-container">
                            <p className="preview-title">Preview Gambar</p>
                            <img
                                src={previewUrl}
                                alt="Preview Bukti Setor"
                                className={`preview-image ${!isSaved ? 'clickable' : ''}`}
                                onClick={() => !isSaved && setIsModalOpen(true)}
                            />
                        </div>
                    )}
                    <div className="validation-form-container">
                        <div className="validation-form">
                            <div className="form-group"><label>Kode Setor</label><input type="text" name="kode_setor" value={kode_setor || ''} onChange={handleChange} disabled={isSaved || isSaving} /></div>
                            <div className="form-group"><label>Tanggal</label><input type="date" name="tanggal" value={tanggal || ''} onChange={handleChange} disabled={isSaved || isSaving} /></div>
                            <div className="form-group"><label>Jumlah</label><input type="number" name="jumlah" value={jumlah || ''} onChange={handleChange} disabled={isSaved || isSaving} /><small>{formatRupiah(jumlah)}</small></div>
                        </div>
                    </div>
                </div>
                {isSaved ? (
                    <div className="notification success item-success">✔ Berhasil Disimpan</div>
                ) : (
                    <button className="button save-button" onClick={() => onSave(id)} disabled={isSaving}>
                        {isSaving ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
                    </button>
                )}
                {error && <div className="notification error item-error">{error}</div>}
            </div>
        </>
    );
};

// --- Komponen Halaman Utama (Parent) ---
// Mengelola semua state dan logika
const BuktiSetorPage = () => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validationResults, setValidationResults] = useState([]);
    const [globalNotification, setGlobalNotification] = useState({ message: '', type: '' });

    const handleFileChange = (event) => {
        setSelectedFiles(Array.from(event.target.files));
        setGlobalNotification({ message: '', type: '' });
        setValidationResults([]);
    };

    const handleProcess = async () => {
        if (selectedFiles.length === 0) return setGlobalNotification({ message: 'Silakan pilih satu atau lebih file!', type: 'error' });
        setLoading(true);
        setValidationResults([]);
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setGlobalNotification({ message: `Memproses file ${i + 1}/${selectedFiles.length}: ${file.name}`, type: 'info' });
            const formData = new FormData();
            formData.append('file', file);
            try {
                const result = await processBuktiSetor(formData);
                if (result.data && result.data.length > 0) {
                    // Inisialisasi state untuk setiap item
                    const newResults = result.data.map(item => ({...item, id: `result-${Date.now()}-${Math.random()}`, isSaving: false, isSaved: false, error: null}));
                    setValidationResults(prevResults => [...prevResults, ...newResults]);
                }
            } catch (error) {
                setGlobalNotification({ message: `Error pada file ${file.name}: ${error.message}`, type: 'error' });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        setLoading(false);
        setGlobalNotification({ message: 'Semua file selesai diproses.', type: 'success' });
    };
    
    // Fungsi untuk menangani perubahan data di dalam form anak
    const handleDataChange = (id, fieldName, value) => {
        setValidationResults(prev => 
            prev.map(item => item.id === id ? { ...item, [fieldName]: value } : item)
        );
    };

    // Fungsi untuk menyimpan satu item, dipanggil dari anak
    const handleSaveItem = async (id) => {
        const itemToSave = validationResults.find(item => item.id === id);
        if (!itemToSave) return;

        // Update UI untuk menunjukkan status "Menyimpan..."
        setValidationResults(prev => prev.map(item => item.id === id ? { ...item, isSaving: true, error: null } : item));

        try {
            await saveBuktiSetor(itemToSave);
            // Update UI untuk menunjukkan status "Berhasil Disimpan"
            setValidationResults(prev => {
                const newResults = prev.map(item => item.id === id ? { ...item, isSaving: false, isSaved: true } : item);
                
                // Hitung sisa item yang belum disimpan
                const remaining = newResults.filter(r => !r.isSaved).length;
                
                // Set notifikasi global yang dinamis
                if (remaining > 0) {
                    setGlobalNotification({ message: `Data berhasil disimpan! ${remaining} data lagi belum diproses.`, type: 'success' });
                } else {
                    setGlobalNotification({ message: 'Semua data berhasil disimpan!', type: 'success' });
                }
                
                return newResults;
            });

        } catch (err) {
            // Update UI untuk menunjukkan pesan error
            setValidationResults(prev => prev.map(item => item.id === id ? { ...item, isSaving: false, error: err.message || "Terjadi kesalahan" } : item));
            setGlobalNotification({ message: '', type: '' }); // Sembunyikan notifikasi global
        }
    };

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Upload Bukti Setor Pajak</h2>
                <p>Pilih satu atau lebih file gambar/PDF bukti setor Anda.</p>
                <div className="input-group">
                    <input type="file" onChange={handleFileChange} accept="image/*,.pdf" multiple />
                    <button className="button" onClick={handleProcess} disabled={loading || selectedFiles.length === 0}>
                        {loading ? 'Sedang Memproses...' : `Proses ${selectedFiles.length} File`}
                    </button>
                </div>
            </div>
            
            {validationResults.length > 0 && (
                 <div className="card" style={{backgroundColor: '#f7f7f7'}}>
                    <h3>Hasil Ekstraksi - Validasi Bukti Setor</h3>
                    <p>Total {validationResults.length} bukti setor ditemukan. Mohon validasi dan simpan satu per satu.</p>
                 </div>
            )}
            
            <div className="results-list">
                {validationResults.map(data => (
                    <ValidationFormBuktiSetor
                        key={data.id}
                        itemData={data} // Kirim seluruh objek item
                        onSave={handleSaveItem}
                        onDataChange={handleDataChange}
                    />
                ))}
            </div>

            {globalNotification.message && <Notification message={globalNotification.message} type={globalNotification.type} />}
        </div>
    );
};

export default BuktiSetorPage;