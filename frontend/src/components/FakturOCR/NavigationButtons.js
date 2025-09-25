import React from "react";

const NavigationButtons = ({
  currentIndex,
  total,
  handleBack,
  handleNext,
  handleSave,
  handleSaveAll,
  handleReset,
}) => {
  // Jangan render jika tidak ada data
  if (total === 0) return null;

  return (
    <div className="navigation-buttons">
      <div className="page-indicator">
        Halaman {currentIndex + 1} dari {total}
      </div>
      <button onClick={handleBack} disabled={currentIndex === 0}>
        ◀ Kembali
      </button>
      <button
        onClick={handleNext}
        disabled={currentIndex === total - 1}
        style={{ margin: "0 10px" }}
      >
        Lanjut ▶
      </button>
      <button onClick={handleSave} className="save-button">
        💾 Simpan Halaman Ini
      </button>
      <button className="save-all-button" onClick={handleSaveAll}>
        💾 Simpan Semua Halaman
      </button>
      <button onClick={handleReset} className="reset-button">
        🧹 Reset Hasil OCR
      </button>
    </div>
  );
};

export default NavigationButtons;
