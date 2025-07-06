// components/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../App.css";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link
        to="/"
        className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
      >
        🏠 Home
      </Link>
      <Link
        to="/faktur"
        className={`nav-link ${location.pathname === "/faktur" ? "active" : ""}`}
      >
        🧾 OCR
      </Link>
      <Link
        to="/history"
        className={`nav-link ${location.pathname === "/history" ? "active" : ""}`}
      >
        📜 Laporan
      </Link>
      <Link
        to="/bukti-setor"
        className={`nav-link ${location.pathname === "/bukti-setor" ? "active" : ""}`}
      >
        💵 Bukti Setor
      </Link>
    </nav>
  );
};

export default Navbar;
