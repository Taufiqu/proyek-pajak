const API_BASE_URL = "http://localhost:5000/api";

/**
 * Helper untuk menangani respons dari fetch.
 * @param {Response} response - Objek respons dari fetch.
 * @returns {Promise<any>} Data JSON dari respons.
 */
const handleResponse = async (response) => {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error || result.message || "Terjadi kesalahan pada server"
    );
  }
  return result;
};

// --- FAKTUR API ---
export const processFaktur = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/faktur/process`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response);
};

export const saveFaktur = async (fakturData) => {
  const response = await fetch(`${API_BASE_URL}/faktur/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fakturData),
  });
  return handleResponse(response);
};

// --- BUKTI SETOR API ---
export const processBuktiSetor = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/bukti_setor/process`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response);
};

export const saveBuktiSetor = async (buktiData) => {
  const response = await fetch(`${API_BASE_URL}/bukti_setor/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buktiData),
  });
  return handleResponse(response);
};

// --- LAPORAN API ---
export const getLaporan = async (jenisLaporan) => {
  const response = await fetch(`${API_BASE_URL}/laporan/${jenisLaporan}`);
  return handleResponse(response);
};

export const getExportUrl = (jenisLaporan) => {
  return `${API_BASE_URL}/laporan/export/${jenisLaporan}`;
};

// Helper format Rupiah
export const formatRupiah = (number) => {
  if (number === undefined || number === null || isNaN(Number(number)))
    return "Rp 0,00";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(Number(number));
};
