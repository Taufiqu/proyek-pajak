// /frontend/src/components/EnhancedImageModal.js
// Komponen modal gambar yang canggih, terpisah, dan dapat digunakan kembali.

import React, { 
    useState, 
    useEffect, 
    useRef, 
    useLayoutEffect, 
    useCallback, 
    memo 
} from 'react';

// --- Constants ---
const ZOOM_FACTORS = {
    MIN: 0.2,
    MAX: 5,
    STEP: 1.1
};

// --- Custom Hook untuk Logika Modal ---
const useImageModal = () => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const startPos = useRef({ x: 0, y: 0 });

    const handleZoom = useCallback((direction) => {
        setScale(prevScale => {
            const newScale = direction === 'in' 
                ? prevScale * ZOOM_FACTORS.STEP
                : prevScale / ZOOM_FACTORS.STEP;
            return Math.max(ZOOM_FACTORS.MIN, Math.min(ZOOM_FACTORS.MAX, newScale));
        });
    }, []);

    const resetImage = useCallback(() => {
        if (imgRef.current && containerRef.current) {
            const { naturalWidth, naturalHeight } = imgRef.current;
            const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
            
            if (naturalWidth > 0 && naturalHeight > 0) {
                const scaleX = containerWidth / naturalWidth;
                const scaleY = containerHeight / naturalHeight;
                // Gunakan skala terkecil agar gambar pas di layar tanpa terpotong
                const initialScale = Math.min(scaleX, scaleY);
                setScale(initialScale);
                setPosition({ x: 0, y: 0 });
            }
        }
    }, []);

    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return; // Hanya untuk klik kiri
        setIsDragging(true);
        startPos.current = { 
            x: e.clientX - position.x, 
            y: e.clientY - position.y 
        };
        if (imgRef.current) imgRef.current.style.cursor = 'grabbing';
    }, [position]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        if (imgRef.current) imgRef.current.style.cursor = 'grab';
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        setPosition({ 
            x: e.clientX - startPos.current.x, 
            y: e.clientY - startPos.current.y 
        });
    }, [isDragging]);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        handleZoom(e.deltaY < 0 ? 'in' : 'out');
    }, [handleZoom]);

    return {
        scale, position, imgRef, containerRef, resetImage,
        handleZoom, handleMouseDown, handleMouseUp, handleMouseMove, handleWheel
    };
};

// --- Komponen Modal ---
// Dibungkus dengan React.memo untuk optimisasi performa
export const EnhancedImageModal = memo(({ src, onClose }) => {
    const {
        scale, position, imgRef, containerRef, resetImage,
        handleZoom, handleMouseDown, handleMouseUp, handleMouseMove, handleWheel
    } = useImageModal();

    // Efek untuk set skala awal saat gambar dimuat
    useLayoutEffect(() => {
        const image = imgRef.current;
        if (!image) return;

        const setInitialScale = () => {
            resetImage(); // Fungsi reset sudah melakukan kalkulasi yang tepat
        };

        if (image.complete) {
            setInitialScale();
        } else {
            image.onload = setInitialScale;
        }
    }, [src, resetImage]);

    // Efek untuk shortcut keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape': onClose(); break;
                case '+': case '=': handleZoom('in'); break;
                case '-': handleZoom('out'); break;
                case 'r': case 'R': resetImage(); break;
                default: break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handleZoom, resetImage]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div 
                className="modal-content" 
                onClick={(e) => e.stopPropagation()} 
                onWheel={handleWheel}
            >
                <button className="modal-close-btn" onClick={onClose} title="Close (ESC)">×</button>
                <div className="modal-image-container" ref={containerRef}>
                    <img
                        ref={imgRef}
                        src={src}
                        alt="Zoomed Preview"
                        className="modal-image"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transformOrigin: 'center center'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseUp}
                        draggable={false}
                    />
                </div>
                <div className="modal-controls">
                    <button onClick={() => handleZoom('in')} title="Zoom In (+)">🔍+</button>
                    <button onClick={() => handleZoom('out')} title="Zoom Out (-)">🔍-</button>
                    <button onClick={resetImage} title="Reset (R)">↻</button>
                    <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
                </div>
                <div className="modal-help">
                    <small>Keyboard: ESC (close) | +/- (zoom) | R (reset) | Drag to pan</small>
                </div>
            </div>
        </div>
    );
});