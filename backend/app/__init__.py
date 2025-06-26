import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config
from flask_migrate import Migrate

# 1. Inisialisasi ekstensi di scope global (sudah benar)
db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    """Factory function untuk membuat instance aplikasi Flask."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # 2. Inisialisasi ekstensi dengan aplikasi (sudah benar)
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Inisialisasi CORS lebih awal
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

    # Setup Logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

    # 3. Kelompokkan semua registrasi blueprint di satu tempat
    with app.app_context():
        # Import semua blueprint yang dibutuhkan
        from .bukti_setor.routes import bukti_setor_bp
        from .faktur.routes import faktur_bp      # Asumsi Anda punya file ini
        from .laporan.routes import laporan_bp    # Asumsi Anda punya file ini

        # Daftarkan setiap blueprint HANYA SATU KALI
        app.register_blueprint(bukti_setor_bp)
        app.register_blueprint(faktur_bp)
        app.register_blueprint(laporan_bp)
        
        app.logger.info("Semua blueprints telah diregistrasi.")

    # 4. HAPUS 'db.create_all()'. Tanggung jawab ini sekarang milik Flask-Migrate.
    
    # 5. Pastikan folder upload ada (sudah benar)
    upload_folder = app.config.get('UPLOAD_FOLDER')
    if upload_folder and not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
        app.logger.info(f"Folder '{upload_folder}' telah dibuat.")

    return app