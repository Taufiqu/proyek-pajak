import React from "react";
import "./LoadingSpinner.css"; // Kita akan buat file CSS ini selanjutnya

const LoadingSpinner = ({ message = "Memproses..." }) => {
  return (
    <div className="spinner-overlay">
      <div className="spinner-container">
        <div className="loading-spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;