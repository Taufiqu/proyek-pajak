import React, { useState, useRef, useEffect } from "react";

const MAX_SCALE = 4.0;

const ImageModal = ({ src, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.button !== 0 || scale <= 1) return;
        isDragging.current = true;
        startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        if (imgRef.current) imgRef.current.style.cursor = "grabbing";
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        if (imgRef.current) imgRef.current.style.cursor = "grab";
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current || !imgRef.current || !containerRef.current) return;

        const potentialX = e.clientX - startPos.current.x;
        const potentialY = e.clientY - startPos.current.y;

        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        const { offsetWidth: imgWidth, offsetHeight: imgHeight } = imgRef.current;

        const maxX = Math.max(0, (imgWidth * scale - containerWidth) / 2);
        const maxY = Math.max(0, (imgHeight * scale - containerHeight) / 2);

        const newX = Math.max(-maxX, Math.min(potentialX, maxX));
        const newY = Math.max(-maxY, Math.min(potentialY, maxY));
        
        setPosition({ x: newX, y: newY });
    };

    const handleWheel = (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            const newScale = scale * 1.1;
            setScale(Math.min(newScale, MAX_SCALE));
        }
    };

    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    useEffect(handleReset, [src]);

    useEffect(() => {
        const handleKeyDown = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);
    
    const zoomIn = () => setScale(prev => Math.min(prev * 1.2, MAX_SCALE));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} onWheel={handleWheel}>
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <div className="modal-image-container" ref={containerRef}> 
                    <img
                        ref={imgRef}
                        src={src}
                        alt="Zoomed Preview"
                        className="modal-image"
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
                            cursor: scale > 1 ? "grab" : "default" 
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseUp}
                        draggable="false"
                    />
                </div>
                <div className="modal-controls">
                    <button onClick={zoomIn}>+</button>
                    <button onClick={handleReset}>Reset</button>
                </div>
            </div>
        </div>
    );
};

export default ImageModal;