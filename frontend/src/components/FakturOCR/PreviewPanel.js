import React from "react";

const PreviewPanel = ({ data, onImageClick }) => {
  if (!data) return null;

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const previewSrc = data.preview_image
    ? `${apiUrl}/preview/${data.preview_image}`
    : null;

  return (
    <div className="preview-panel">
      <h3>Preview Halaman {data.halaman || "-"}</h3>

      {previewSrc ? (
        <img
          src={previewSrc}
          alt={`Preview halaman ${data.halaman}`}
          onClick={onImageClick}
          loading="lazy"
          style={{
            maxWidth: "100%",
            maxHeight: "480px",
            objectFit: "contain",
            cursor: "zoom-in",
            border: "1px solid #ccc",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            transition: "transform 0.2s",
          }}
        />
      ) : (
        <p style={{ color: "gray", fontStyle: "italic" }}>
          Gambar preview tidak tersedia.
        </p>
      )}
    </div>
  );
};

export default PreviewPanel;