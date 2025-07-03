import axios from "axios";

// ========= BASE URL =========
const API_URL = process.env.REACT_APP_API_URL;

// ========= AXIOS INSTANCES =========

// 🔹 JSON Instance
export const apiJson = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔸 FormData Instance
export const apiForm = axios.create({
  baseURL: API_URL,
  timeout: 300000,
});

// 🔻 Bukti Setor Instance
const api = axios.create({
  baseURL: "http://localhost:5000/api/bukti_setor",
  timeout: 10000,
});

// ⛑️ Interceptor setelah deklarasi
api.interceptors.response.use(null, async (error) => {
  if (error.code === "ERR_NETWORK") {
    console.warn("🔁 Network error detected, retrying...");
    return api.request(error.config);
  }
  return Promise.reject(error);
});

// ========= ENDPOINTS =========

// --- FAKTUR
export const processFaktur = (formData) => apiForm.post("/api/process", formData);
export const saveFaktur = (data) => apiJson.post("/api/save", data);
export const deleteFaktur = (jenis, id) => apiJson.delete(`/api/delete/${jenis}/${id}`);
export const fetchFakturHistory = () => apiJson.get("/api/history");

// --- BUKTI SETOR
export const processBuktiSetor = (formData) => apiForm.post("/api/bukti_setor/process", formData);
export const saveBuktiSetor = (data) => api.post("/save", data);
export const fetchBuktiSetor = (jenis) => api.get(`/api/bukti_setor/${jenis}`);
export const deleteBuktiSetor = (id) => apiJson.delete(`/api/bukti_setor/delete/${id}`);
export const fetchBuktiSetorHistory = () => apiJson.get("/api/bukti_setor/history");

// --- MISC
export const fetchHistory = () => apiJson.get("/api/history");
export const exportExcel = () => apiJson.get("/api/export", { responseType: "blob" });

// Optional export
const apiInstances = { apiJson, apiForm };
export default apiInstances;
