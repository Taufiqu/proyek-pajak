# backend/app/__init__.py
import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

# Inisialisasi ekstensi
db = SQLAlchemy()

def create_app(config_class=Config):
    """Factory function untuk membuat instance aplikasi Flask."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Setup Logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

    # Inisialisasi ekstensi dengan aplikasi
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

    # Pastikan folder upload ada
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
        app.logger.info(f"Folder '{upload_folder}' telah dibuat.")


    # --- Registrasi Blueprints ---
    from .faktur.routes import faktur_bp
    from .bukti_setor.routes import bukti_setor_bp
    from .laporan.routes import laporan_bp

    app.register_blueprint(faktur_bp)
    app.register_blueprint(bukti_setor_bp)
    app.register_blueprint(laporan_bp)
    
    app.logger.info("Semua blueprints telah diregistrasi.")

    with app.app_context():
        # Buat semua tabel database jika belum ada
        db.create_all()
        app.logger.info("Struktur database telah diperiksa/dibuat.")

    return app