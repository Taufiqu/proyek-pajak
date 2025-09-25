import React from "react";
import { getPreviewUrl } from "../../services/api";

const PreviewPanel = ({ data, onImageClick }) => {
  if (!data) return null;

  console.log("🧪 Data masuk ke PreviewPanel:", data);
  console.log("🧪 preview_image:", data.preview_image);
  console.log("🧪 preview_url dari backend:", data.preview_url);
  
  // ✅ FIX: Gunakan helper function untuk construct preview URL
  const previewUrl = getPreviewUrl(data, 'faktur');
  console.log("🧪 Final preview URL (helper):", previewUrl);

  return (
    <div className="preview-panel">
      <h3>Preview Halaman {data.halaman || 1}</h3>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          onClick={onImageClick}
          style={{
            maxWidth: "100%",
            cursor: "zoom-in",
            border: "1px solid #ccc",
            borderRadius: "8px"
          }}
          onError={(e) => {
            console.error("❌ Preview image load failed:", previewUrl);
            console.error("🔍 Data available:", { 
              preview_url: data.preview_url, 
              preview_image: data.preview_image 
            });
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <p>Gambar preview tidak tersedia.</p>
      )}
    </div>
  );
};

export default PreviewPanel;
