import React from "react";
import ModalImage from "react-modal-image";

const PreviewPanel = ({ data }) => {
  if (!data) return null;

  return (
    <div className="preview-panel">
      <h3>Preview Halaman {data.halaman}</h3>
      {data.preview_image ? (
        <ModalImage
          small={`${process.env.REACT_APP_API_URL}/preview/${data.preview_image}`}
          large={`${process.env.REACT_APP_API_URL}/preview/${data.preview_image}`}
        />
      ) : (
        <p>Gambar preview tidak tersedia.</p>
      )}
    </div>
  );
};

export default PreviewPanel;
