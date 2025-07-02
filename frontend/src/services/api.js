import axios from "axios";

// ========= BASE URL =========
const API_URL = process.env.REACT_APP_API_URL;

// ========= AXIOS INSTANCES =========

// 🔹 JSON Instance → Buat semua data request biasa (GET/POST JSON)
export const apiJson = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔸 FormData Instance → Buat upload file (OCR dll)
export const apiForm = axios.create({
  baseURL: API_URL,
  timeout: 300000,
});

// ========= FAKTUR ENDPOINTS =========

export const processFaktur = (formData) => apiForm.post("/api/process", formData);

export const saveFaktur = (data) => apiJson.post("/api/save", data);

export const deleteFaktur = (jenis, id) => apiJson.delete(`/api/delete/${jenis}/${id}`);

export const fetchFakturHistory = () => apiJson.get("/api/history");

// ========= BUKTI SETOR ENDPOINTS =========

export const processBuktiSetor = (formData) => apiForm.post("/api/bukti_setor/process", formData);

export const saveBuktiSetor = (data) => apiJson.post("/api/bukti_setor/save", data);

export const deleteBuktiSetor = (id) => apiJson.delete(`/api/bukti_setor/delete/${id}`);

export const fetchBuktiSetorHistory = () => apiJson.get("/api/bukti_setor/history");

// ========= MISCELLANEOUS / LAPORAN =========

export const fetchHistory = () => apiJson.get("/api/history");

export const exportExcel = () =>
  apiJson.get("/api/export", { responseType: "blob" });

// ========= DEFAULT EXPORT (Optional) =========
// Bisa dipakai kalau mau akses instance-nya saja
const apiInstances = {
  apiJson,
  apiForm,
};

export default apiInstances;
