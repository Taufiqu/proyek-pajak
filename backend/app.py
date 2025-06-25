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
from utils import allowed_file  # only needed in route if used directly
from services import (
    process_invoice_file,
    save_invoice_data,
    generate_excel_export,
    get_history,
    delete_faktur
)

# ==============================================================================
# INISIALISASI FLASK APP
# ==============================================================================
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=["http://localhost:3000"])  # sesuaikan jika beda port

db.init_app(app)

# ==============================================================================
# ROUTES
# ==============================================================================

@app.route("/api/process", methods=["POST"])
def process_file():
    return process_invoice_file(request, app.config)

@app.route("/api/save", methods=["POST"])
def save_data():
    return save_invoice_data(request, db)

@app.route("/api/export", methods=["GET"])
def export_excel():
    return generate_excel_export(db)

@app.route("/api/history", methods=["GET"])
def route_get_history():
    return get_history()

@app.route("/api/delete/<string:jenis>/<int:id>", methods=["DELETE"])
def route_delete_faktur(jenis, id):
    return delete_faktur(jenis, id)

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
    app.run(debug=True)
