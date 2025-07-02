# /faktur_project/app/faktur/routes.py

import os
import traceback
from datetime import datetime
import cv2
import numpy as np
import easyocr
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from pdf2image import convert_from_path
from PIL import Image

# Impor dari struktur proyek kita
from .. import db
from ..models import PpnMasukan, PpnKeluaran
from . import utils

# Nonaktifkan batas keamanan ukuran gambar dari Pillow
Image.MAX_IMAGE_PIXELS = None

# Inisialisasi EasyOCR Reader.
# Dilakukan sekali saat aplikasi dimuat untuk efisiensi.
try:
    reader = easyocr.Reader(['id', 'en'])
except Exception as e:
    print(f"PERINGATAN: Gagal memuat model EasyOCR. Error: {e}")
    reader = None

# Membuat Blueprint
faktur_bp = Blueprint('faktur', __name__, url_prefix='/api/faktur')

@faktur_bp.route('/process', methods=['POST'])
def process_faktur_route():
    if not reader:
        return jsonify(error="OCR Engine (EasyOCR) tidak berhasil dimuat. Periksa log server."), 500

    if 'file' not in request.files:
        return jsonify(error="File tidak ditemukan"), 400
        
    file = request.files['file']
    nama_pt_utama = request.form.get('nama_pt_utama', '').strip()

    if not file or not utils.allowed_file(file.filename):
        return jsonify(error="File tidak valid"), 400
    if not nama_pt_utama:
        return jsonify(error="Nama PT Utama wajib diisi"), 400

    upload_folder = current_app.config['UPLOAD_FOLDER']
    poppler_path = current_app.config.get('POPPLER_PATH')
    temp_filepath = os.path.join(upload_folder, file.filename)
    file.save(temp_filepath)
    
    try:
        images = convert_from_path(temp_filepath, poppler_path=poppler_path, dpi=300) if file.filename.lower().endswith('.pdf') else [Image.open(temp_filepath)]
        if not images:
            return jsonify(success=True, results=[]), 200

        all_results = []
        for i, image in enumerate(images):
            halaman_ke = i + 1
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

            # Logika EasyOCR
            ocr_results = reader.readtext(img_cv)
            raw_text = '\n'.join([res[1] for res in ocr_results])

            # Panggil fungsi-fungsi dari utils.py untuk ekstraksi data
            jenis_pajak, blok_rekanan = utils.extract_jenis_pajak(raw_text, nama_pt_utama)

            if not jenis_pajak:
                no_faktur, tanggal_obj = utils.extract_faktur_tanggal(raw_text)
                dpp, ppn = utils.extract_dpp_ppn(raw_text)
                ket = utils.extract_keterangan(raw_text)
                nama_rekanan, npwp_rekanan = "Periksa Manual", "Periksa Manual"
                jenis_pajak = "BUTUH_VALIDASI"
            else:
                no_faktur, tanggal_obj = utils.extract_faktur_tanggal(raw_text)
                nama_rekanan, npwp_rekanan = utils.extract_npwp_nama_rekanan(blok_rekanan)
                dpp, ppn = utils.extract_dpp_ppn(raw_text)
                ket = utils.extract_keterangan(raw_text)

            preview_filename = utils.simpan_preview_image(image, halaman_ke, upload_folder)
            
            hasil_halaman = {
                "klasifikasi": jenis_pajak,
                "data": {
                    "bulan": tanggal_obj.strftime("%B") if tanggal_obj else "",
                    "tanggal": tanggal_obj.strftime("%Y-%m-%d") if tanggal_obj else "",
                    "no_faktur": no_faktur or "Tidak Ditemukan",
                    "keterangan": ket or "",
                    "nama_lawan_transaksi": nama_rekanan,
                    "npwp_lawan_transaksi": npwp_rekanan,
                    "dpp": dpp or 0.0,
                    "ppn": ppn or 0.0,
                    "preview_image_url": f"/api/faktur/preview/{preview_filename}" if preview_filename else ""
                }
            }
            all_results.append(hasil_halaman)

        return jsonify(success=True, results=all_results), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify(error=f"Kesalahan internal server: {str(e)}"), 500
    finally:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@faktur_bp.route('/save', methods=['POST'])
def save_faktur_route():
    data_list = request.get_json()
    if not isinstance(data_list, list):
        return jsonify(error="Input harus berupa list JSON"), 400
    
    saved_count, errors = 0, []
    for data in data_list:
        jenis_pajak, detail = data.get("klasifikasi"), data.get("data")

        if not jenis_pajak or jenis_pajak == 'BUTUH_VALIDASI' or not detail:
            errors.append(f"Data tidak lengkap atau butuh validasi untuk No. Faktur: {detail.get('no_faktur', 'N/A')}")
            continue

        Model = PpnMasukan if jenis_pajak == "PPN_MASUKAN" else PpnKeluaran
        
        if db.session.execute(db.select(Model).filter_by(no_faktur=detail['no_faktur'])).scalar_one_or_none():
            errors.append(f"Faktur duplikat terdeteksi dan dilewati: {detail['no_faktur']}")
            continue
        try:
            new_entry = Model(
                bulan=detail.get('bulan'),
                tanggal=datetime.strptime(detail.get('tanggal'), '%Y-%m-%d').date() if detail.get('tanggal') else None,
                no_faktur=detail.get('no_faktur'),
                keterangan=detail.get('keterangan'),
                nama_lawan_transaksi=detail.get('nama_lawan_transaksi'),
                npwp_lawan_transaksi=detail.get('npwp_lawan_transaksi'),
                dpp=float(detail.get('dpp', 0.0)),
                ppn=float(detail.get('ppn', 0.0))
            )
            db.session.add(new_entry)
            saved_count += 1
        except Exception as e:
            db.session.rollback()
            errors.append(f"Gagal simpan {detail.get('no_faktur', 'N/A')}: {e}")

    if errors:
        if saved_count > 0:
            db.session.commit()
        return jsonify(message=f"Proses selesai dengan catatan. Berhasil: {saved_count}. Gagal/Dilewati: {len(errors)}. Rincian: {'; '.join(errors)}", success=False), 400

    if saved_count > 0:
        db.session.commit()
        return jsonify(message=f"Semua {saved_count} data baru berhasil disimpan!", success=True), 201
    else:
        return jsonify(message="Tidak ada data baru untuk disimpan.", success=True), 200

@faktur_bp.route('/preview/<filename>')
def serve_faktur_preview(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)