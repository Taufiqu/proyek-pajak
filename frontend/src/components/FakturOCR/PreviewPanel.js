import React from "react";

const PreviewPanel = ({ data, onImageClick }) => {
  if (!data) return null;

  return (
    <div className="preview-panel">
      <h3>Preview Halaman {data.halaman}</h3>
      {data.preview_image ? (
        <img
          src={`${process.env.REACT_APP_API_URL}/preview/${data.preview_image}`}
          alt="Preview"
          onClick={onImageClick}
          style={{
            maxWidth: "100%",
            cursor: "zoom-in",
            border: "1px solid #ccc",
            borderRadius: "8px"
          }}
        />
      ) : (
        <p>Gambar preview tidak tersedia.</p>
      )}
    </div>
  );
};

export default PreviewPanel;
