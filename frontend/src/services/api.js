// File: frontend/src/services/api.js
// Description: API service for handling requests to the backend.

import axios from "axios";

// ========= BASE URL =========
// Gunakan SATU sumber kebenaran untuk URL API Anda.
const API_URL = process.env.REACT_APP_API_URL;

// ========= AXIOS INSTANCES =========

// 🔹 Instance umum untuk semua permintaan (JSON, delete, get, dll.)
export const api = axios.create({
  baseURL: API_URL, // <-- Selalu gunakan variabel dari .env
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔸 Instance khusus untuk upload file (FormData)
export const apiForm = axios.create({
  baseURL: API_URL, // <-- Selalu gunakan variabel dari .env
  timeout: 300000, // Timeout lebih lama untuk upload besar
});


// ========= ENDPOINTS =========

// --- FAKTUR & BUKTI SETOR (PROSESNYA SAMA) ---

// 🔥 DIPERBAIKI: Kedua fungsi sekarang menunjuk ke endpoint yang sama dan benar.
export const processFaktur = (formData) => apiForm.post("/api/bukti_setor/process", formData);
export const processBuktiSetor = (formData) => apiForm.post("/api/bukti_setor/process", formData);

// --- SIMPAN DATA
export const saveFaktur = (data) => api.post("/api/save", data);
export const saveBuktiSetor = (data) => api.post("/api/bukti_setor/save", data);

// --- HAPUS DATA
export const deleteFaktur = (jenis, id) => api.delete(`/api/delete/${jenis}/${id}`);
export const deleteBuktiSetor = (id) => api.delete(`/api/bukti_setor/delete/${id}`);

// --- AMBIL HISTORY
export const fetchFakturHistory = () => api.get("/api/history");
export const fetchBuktiSetorHistory = () => api.get("/api/bukti_setor/history");

// --- MISC
export const exportExcel = () => api.get("/api/export", { responseType: "blob" });