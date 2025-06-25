# backend/config.py
import os
from dotenv import load_dotenv

# Tentukan path absolut dari direktori root proyek
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    """Set Flask configuration from environment variables."""

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Paths
    POPPLER_PATH = os.environ.get('POPPLER_PATH')
    UPLOAD_FOLDER = 'uploads'