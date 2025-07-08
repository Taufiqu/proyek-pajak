# # File: backend/app.py

# ==============================================================================
# 1. Pustaka Standar Python
# ==============================================================================
import os

# ==============================================================================
# 2. Pustaka Pihak Ketiga (Third-Party)
# ==============================================================================
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# ==============================================================================
# 3. Impor Lokal Aplikasi Anda
# ==============================================================================
from config import Config
from models import db
from bukti_setor.utils import allowed_file
from faktur.services import (
    process_invoice_file,
    save_invoice_data,
    generate_excel_export,
    get_history,
)
from faktur.services.delete import delete_faktur
from bukti_setor.services.delete import delete_bukti_setor

from bukti_setor.routes import bukti_setor_bp
from bukti_setor.routes import laporan_bp  # pastikan ini diimpor untuk digunakan

# ==============================================================================
# INISIALISASI FLASK APP
# ==============================================================================
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

db.init_app(app)
app.register_blueprint(bukti_setor_bp)
app.register_blueprint(laporan_bp)
from flask_migrate import Migrate  # ⬅️ import ini di bagian atas
migrate = Migrate(app, db)        # ⬅️ ini setelah db.init_app(app)

# ==============================================================================
# ROUTES
# ==============================================================================

@app.route("/api/process", methods=["POST"])
def process_file():
    return process_invoice_file(request, app.config)

@app.route("/api/save", methods=["POST"])
def save_data():
    if not request.is_json:
        return jsonify(error="Request harus berupa JSON."), 400

    data = request.get_json()

    try:
        if isinstance(data, list):
            saved_count = 0
            for item in data:
                save_invoice_data(item, db)
                saved_count += 1
            db.session.commit()
            return jsonify(message=f"{saved_count} faktur berhasil disimpan."), 201

        else:
            save_invoice_data(data, db)
            db.session.commit()
            return jsonify(message="Faktur berhasil disimpan."), 201

    except ValueError as ve:
        db.session.rollback()
        return jsonify(error=str(ve)), 400

    except Exception as e:
        db.session.rollback()
        print(f"[❌ ERROR /api/save] {e}")
        return jsonify(error=f"Terjadi kesalahan di server: {e}"), 500

@app.route("/api/export", methods=["GET"])
def export_excel():
    return generate_excel_export(db)

@app.route("/api/history", methods=["GET"])
def route_get_history():
    return get_history()

@app.route("/api/delete/<string:jenis>/<int:id>", methods=["DELETE"])
def route_delete_faktur(jenis, id):
    return delete_faktur(jenis, id)

@app.route("/api/bukti_setor/delete/<int:id>", methods=["DELETE"])
def delete_bukti_setor_endpoint(id):
    return delete_bukti_setor(id)

@app.route("/preview/<filename>")
def serve_preview(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    return send_file(filepath, mimetype="image/jpeg")

# ==============================================================================
# MAIN ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
