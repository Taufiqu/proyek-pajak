import os
import traceback
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from datetime import datetime
from pdf2image import convert_from_path
import numpy as np
import cv2
import pytesseract

from ..models import PpnMasukan, PpnKeluaran
from .. import db
from . import utils # Import semua utilitas dari utils.py

faktur_bp = Blueprint('faktur', __name__, url_prefix='/api/faktur')

@faktur_bp.route('/process', methods=['POST'])
def process_faktur_endpoint():
    if 'file' not in request.files:
        return jsonify(error="File tidak ditemukan"), 400
    
    file = request.files['file']
    nama_pt_utama = request.form.get('nama_pt_utama', '').strip()
    if not nama_pt_utama:
        return jsonify(error="Nama PT Utama wajib diisi"), 400

    upload_folder = current_app.config['UPLOAD_FOLDER']
    temp_filepath = os.path.join(upload_folder, file.filename)
    file.save(temp_filepath)

    try:
        if file.filename.lower().endswith('.pdf'):
            images = convert_from_path(temp_filepath, poppler_path=current_app.config['POPPLER_PATH'], dpi=200)
        else:
            from PIL import Image
            images = [Image.open(temp_filepath)]

        all_pages_results = []
        for i, image in enumerate(images):
            page_num = i + 1
            current_app.logger.info(f"Memproses halaman {page_num}...")
            
            # Pra-pemrosesan & OCR
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            # Anda bisa menambahkan prapemrosesan di sini jika perlu
            raw_text = pytesseract.image_to_string(img_cv, lang='ind')

            # Ekstraksi menggunakan fungsi-fungsi baru
            no_faktur, tanggal_obj = utils.extract_faktur_info(raw_text)
            
            if not no_faktur or not tanggal_obj:
                current_app.logger.warning(f"Halaman {page_num} dilewati: No Faktur atau Tanggal tidak ditemukan.")
                continue

            jenis_pajak, blok_rekanan, _ = utils.extract_classification_and_parties(raw_text, nama_pt_utama)
            if not jenis_pajak:
                current_app.logger.warning(f"Halaman {page_num} dilewati: Klasifikasi tidak ditemukan.")
                continue

            nama_rekanan, npwp_rekanan = utils.extract_rekanan_details(blok_rekanan)
            dpp, ppn = utils.extract_financials(raw_text)

            # Simpan preview
            preview_filename = utils.save_preview_image(image, page_num)
            
            page_data = {
                "klasifikasi": jenis_pajak,
                "data": {
                    "bulan": tanggal_obj.strftime("%B"),
                    "tanggal": tanggal_obj.isoformat(),
                    "keterangan": "Diekstrak otomatis", # Bisa diganti dengan extract_keterangan jika diperlukan
                    "npwp_lawan_transaksi": npwp_rekanan,
                    "nama_lawan_transaksi": nama_rekanan,
                    "no_faktur": no_faktur,
                    "dpp": dpp,
                    "ppn": ppn
                },
                "halaman": page_num,
                "preview_image": preview_filename
            }
            all_pages_results.append(page_data)

        return jsonify({"success": True, "results": all_pages_results})

    except Exception as e:
        current_app.logger.error(f"Error processing faktur: {e}\n{traceback.format_exc()}")
        return jsonify(error=str(e)), 500
    finally:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@faktur_bp.route('/save', methods=['POST'])
def save_faktur_endpoint():
    data = request.get_json()
    # Sekarang data adalah sebuah array, kita proses satu per satu
    if not isinstance(data, list):
        return jsonify(error="Format data harus berupa array dari faktur"), 400

    saved_count = 0
    errors = []
    
    for faktur_data in data:
        jenis_pajak = faktur_data.get('klasifikasi')
        detail_data = faktur_data.get('data')

        if not all([jenis_pajak, detail_data, detail_data.get('no_faktur')]):
            errors.append("Data tidak lengkap pada salah satu item.")
            continue
        
        model_to_use = PpnMasukan if jenis_pajak == 'PPN_MASUKAN' else PpnKeluaran
        
        # Cek duplikasi
        existing = db.session.execute(db.select(model_to_use).filter_by(no_faktur=detail_data['no_faktur'])).scalar_one_or_none()
        if existing:
            errors.append(f"Faktur {detail_data['no_faktur']} sudah ada.")
            continue
            
        try:
            new_record = model_to_use(
                bulan=detail_data['bulan'],
                tanggal=datetime.strptime(detail_data['tanggal'], '%Y-%m-%d').date(),
                keterangan=detail_data.get('keterangan', ''),
                npwp_lawan_transaksi=detail_data['npwp_lawan_transaksi'],
                nama_lawan_transaksi=detail_data['nama_lawan_transaksi'],
                no_faktur=detail_data['no_faktur'],
                dpp=detail_data['dpp'],
                ppn=detail_data['ppn']
            )
            db.session.add(new_record)
            saved_count += 1
        except Exception as e:
            errors.append(f"Gagal menyimpan faktur {detail_data['no_faktur']}: {e}")
            db.session.rollback()
    
    db.session.commit()

    message = f"{saved_count} data berhasil disimpan."
    if errors:
        message += f" Gagal menyimpan {len(errors)} data: {', '.join(errors)}"
    
    return jsonify(message=message), 201 if not errors else 207

# Endpoint untuk menyajikan gambar preview
@faktur_bp.route('/preview/<filename>')
def serve_faktur_preview(filename):
    return send_from_directory(os.path.join(current_app.root_path[:-4], current_app.config['UPLOAD_FOLDER']), filename)