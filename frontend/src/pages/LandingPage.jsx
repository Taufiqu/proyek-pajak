import React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
      // Tambahkan class body khusus saat masuk Landing Page
      document.body.classList.add("landing-body");
      return () => {
        document.body.classList.remove("landing-body");
      };
    }, []);

  return (
    // Perubahan: Mengganti class dari 'landing-container' ke 'landing-page-full'
    <div className="landing-page-full">
      
      {/* Background Decorations: Elemen ini tidak perlu diubah, akan muncul di belakang */}
      <div className="bg-decorations">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
        <div className="circle circle-4"></div>
        <div className="circle circle-5"></div>
        <div className="circle circle-6"></div>
        <div className="wave-pattern wave-left"></div>
        <div className="wave-pattern wave-right"></div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Side - Hero Section */}
        <div className="hero-section">
          <h1 className="hero-title">
            SELAMAT<br />
            DATANG DI<br />
            APLIKASI OCR<br />
            DOKUMEN<br />
            PAJAK
          </h1>
        </div>

        {/* Right Side - Description */}
        <div className="description-section">
          <p className="description-text">
            Aplikasi OCR Dokumen Pajak adalah sebuah tools berbasis web yang dirancang untuk menyederhanakan dan mengotomatisasi proses rekapitulasi dokumen keuangan, khususnya Faktur Pajak dan Bukti Setor. Dengan memanfaatkan teknologi Optical Character Recognition (OCR), aplikasi ini secara otomatis memindai dan mengekstrak data-data penting dari file dokumen dan menyajikannya dalam format formulir yang mudah untuk divalidasi oleh pengguna. Sebagai hasil akhir, seluruh data yang telah tervalidasi dapat diekspor menjadi sebuah laporan dalam format Microsoft Excel, sehingga secara signifikan meningkatkan efisiensi kerja dan mengurangi risiko kesalahan entri data manual (human error).
          </p>
          
          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="action-btn primary"
              onClick={() => navigate("/faktur")}
            >
              OCR Faktur Pajak
            </button>
            <button
              className="action-btn secondary"
              onClick={() => navigate("/bukti-setor")}
            >
              OCR Bukti Setor
            </button>
            <button
              className="action-btn tertiary"
              onClick={() => navigate("/history")}
            >
              Riwayat OCR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;