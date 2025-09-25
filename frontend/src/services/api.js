import axios from "axios";

// ========= BASE URLs FOR HYBRID DEPLOYMENT =========
// Support untuk development local dan production hybrid
const getBaseURL = () => {
  // Priority: Environment variable → Development default
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback untuk environment variable lama
  if (process.env.REACT_APP_FAKTUR_SERVICE_URL) {
    return process.env.REACT_APP_FAKTUR_SERVICE_URL;
  }
  
  // Default untuk development
  return "http://localhost:5000";
};

const BASE_URL = getBaseURL();

// Log untuk debugging deployment
console.log('🌐 API Base URL:', BASE_URL);
console.log('🔧 Environment:', process.env.NODE_ENV);

// ========= AXIOS INSTANCES =========

// 🔹 Main API instance untuk semua requests
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5 minutes untuk OCR processing
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// 🔸 Form API instance untuk file uploads
export const formApi = axios.create({
  baseURL: BASE_URL,
  timeout: 300000,
  headers: {
    "Accept": "application/json",
  },
});

// ========= ERROR HANDLING =========

// 🛡️ Enhanced error interceptor untuk API
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API Error:", error.response?.status, error.message);
    
    if (error.response?.status === 0 || error.code === 'ERR_NETWORK') {
      console.error(`🌐 Network Error - Backend tidak dapat diakses di: ${BASE_URL}`);
      console.error('💡 Pastikan backend berjalan dan CORS dikonfigurasi untuk domain frontend');
    }
    return Promise.reject(error);
  }
);

// 🛡️ Enhanced error interceptor untuk Form API
formApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ Upload Error:", error.response?.status, error.message);
    
    if (error.code === 'ERR_NETWORK') {
      console.error(`🌐 Upload failed - Check backend connection at: ${BASE_URL}`);
    }
    return Promise.reject(error);
  }
);

// ========= RESPONSE HELPERS =========

// 🔄 Transform backend response to frontend expected format
export const transformBackendResponse = (backendResponse) => {
  if (backendResponse.success && backendResponse.results) {
    return {
      data: {
        results: backendResponse.results
      }
    };
  }
  
  return backendResponse;
};

// ========= API ENDPOINTS =========
// (Keep all existing endpoints as they are)
// ...existing code...

// ========= UTILITIES =========

// Enhanced error handler utility
export const handleApiError = (error) => {
  if (error.code === 'ERR_NETWORK') {
    return `Koneksi ke server gagal. Pastikan backend berjalan di ${BASE_URL} dan CORS dikonfigurasi.`;
  }
  if (error.response?.status === 404) {
    return 'Endpoint tidak ditemukan. Periksa URL API.';
  }
  if (error.response?.status === 500) {
    return 'Terjadi kesalahan di server. Silakan coba lagi nanti.';
  }
  return error.message || 'Terjadi kesalahan yang tidak diketahui.';
};

// Enhanced connection test
export const testFakturConnection = async () => {
  try {
    console.log(`🔍 Testing connection to: ${BASE_URL}`);
    const response = await api.get("/");
    console.log('✅ Connection successful:', response.status);
    return { 
      success: true, 
      status: response.status,
      baseUrl: BASE_URL,
      environment: process.env.NODE_ENV
    };
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return { 
      success: false, 
      error: error.message,
      baseUrl: BASE_URL,
      environment: process.env.NODE_ENV
    };
  }
};

// Enhanced preview URL helper - support untuk hybrid deployment
export const getPreviewUrl = (itemData) => {
  if (itemData?.preview_image) {
    return `${BASE_URL}/uploads/${itemData.preview_image}`;
  }
  
  if (itemData?.preview_url) {
    // Handle both relative and absolute URLs
    if (itemData.preview_url.startsWith('http')) {
      return itemData.preview_url;
    }
    return `${BASE_URL}${itemData.preview_url}`;
  }
  
  return null;
};

// Helper untuk mendapatkan informasi deployment
export const getDeploymentInfo = () => {
  return {
    apiUrl: BASE_URL,
    environment: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    frontendUrl: window.location.origin,
    timestamp: new Date().toISOString()
  };
};