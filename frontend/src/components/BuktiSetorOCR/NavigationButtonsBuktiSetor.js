import React from "react";

const NavigationButtonsBuktiSetor = ({
  currentIndex,
  total,
  handleBack,
  handleNext,
  handleSave,
  handleSaveAll,
  handleReset,
}) => {
  return (
    <div className="navigation-buttons">
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

export default NavigationButtonsBuktiSetor;
