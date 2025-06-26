// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainOCRPage from "./components/MainOCRPage";
import HistoryPage from "./components/HistoryPage";
import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainOCRPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>

        {/* Konfigurasi ToastContainer yang lebih optimal */}
        <ToastContainer
          position="top-right" // Posisi notifikasi
          autoClose={3000} // Otomatis menutup setelah 3 detik
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light" // Tema notifikasi
        />
      </div>
    </Router>
  );
}

export default App;