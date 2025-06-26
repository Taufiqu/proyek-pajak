import os
import traceback
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from datetime import datetime
from ..models import BuktiSetor
from .. import db
from .utils import extract_bukti_setor_data

bukti_setor_bp = Blueprint('bukti_setor', __name__, url_prefix='/api/bukti_setor')

# --- ENDPOINT BARU UNTUK MENYAJIKAN FILE PREVIEW ---
@bukti_setor_bp.route('/uploads/<path:filename>')
def serve_preview(filename):
    """Endpoint untuk menyajikan file preview dari folder upload."""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)


@bukti_setor_bp.route('/process', methods=['POST'])
def process_bukti_setor_endpoint():
    if 'file' not in request.files:
        return jsonify(error="File tidak ditemukan"), 400
    file = request.files['file']
    
    upload_folder = current_app.config['UPLOAD_FOLDER']
    filepath = os.path.join(upload_folder, file.filename)
    file.save(filepath)

    try:
        poppler_path = current_app.config.get('POPPLER_PATH')
        extracted_data = extract_bukti_setor_data(filepath, poppler_path)
        return jsonify(message="Data berhasil diekstrak.", data=extracted_data), 200
    except Exception as e:
        current_app.logger.error(f"Error processing bukti setor: {e}\n{traceback.format_exc()}")
        return jsonify(error=str(e)), 500
    finally:
        # Menghapus file asli yang diunggah, file preview tetap ada.
        if os.path.exists(filepath):
            os.remove(filepath)

@bukti_setor_bp.route('/save', methods=['POST'])
def save_bukti_setor_endpoint():
    data = request.get_json()
    kode_setor = data.get('kode_setor')
    tanggal = data.get('tanggal')
    jumlah = data.get('jumlah')

    if not all([kode_setor, tanggal, jumlah]):
        return jsonify(error="Field tidak lengkap"), 400

    # if db.session.execute(db.select(BuktiSetor).filter_by(kode_setor=kode_setor)).scalar_one_or_none():
    #     return jsonify(error=f"Bukti setor dengan kode '{kode_setor}' sudah ada."), 409

    try:
        tanggal_obj = datetime.strptime(tanggal, '%Y-%m-%d').date()
        new_record = BuktiSetor(
            tanggal=tanggal_obj,
            kode_setor=str(kode_setor),
            jumlah=float(jumlah)
        )
        db.session.add(new_record)
        db.session.commit()
        return jsonify(message="Data bukti setor berhasil disimpan!"), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving bukti setor: {e}\n{traceback.format_exc()}")
        return jsonify(error=f"Kesalahan saat menyimpan: {str(e)}"), 500