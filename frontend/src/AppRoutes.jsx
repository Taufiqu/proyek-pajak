import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageWrapper from "./components/PageWrapper";
import LandingPage from "./pages/LandingPage";
import MainOCRPage from "./components/FakturOCR/MainOCRPage";
import HistoryPage from "./components/HistoryPage";
import BuktiSetorPage from "./components/BuktiSetorOCR/BuktiSetorPage";

const AppRoutes = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  return (
    <div className={`App ${isLandingPage ? "fullscreen" : ""}`}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
          <Route path="/faktur" element={<PageWrapper><MainOCRPage /></PageWrapper>} />
          <Route path="/history" element={<PageWrapper><HistoryPage /></PageWrapper>} />
          <Route path="/bukti-setor" element={<PageWrapper><BuktiSetorPage /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default AppRoutes;
