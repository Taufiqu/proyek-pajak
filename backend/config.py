# File: backend/config.py

import os
from dotenv import load_dotenv

# Muat variabel dari file .env
load_dotenv()
class Config:
    """Konfigurasi utama aplikasi Flask."""

    # Mengambil URI database dari environment variable, atau menggunakan default jika tidak ada
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///default.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Mengambil path Poppler dari environment variable
    POPPLER_PATH = os.getenv("POPPLER_PATH")
    
    print("🔍 .env path:", os.path.abspath("."))
    print("📦 POPPLER PATH:", os.getenv("POPPLER_PATH"))
    
    # Pengaturan folder upload
    UPLOAD_FOLDER = "uploads"
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
