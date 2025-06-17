# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
from PIL import Image
import re # Regular Expression untuk mencari data
import os
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
from flask import send_file
import io
import cv2 # <-- IMPORT BARU
import numpy as np # <-- IMPORT BARU

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:password@localhost/proyek_pajak'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Buat Model Database
class DokumenPajak(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dpp = db.Column(db.String(50))
    ppn = db.Column(db.String(50))
    # Tambahkan field lain sesuai kebutuhan

CORS(app) # Mengizinkan request dari frontend (React)

@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify(message="Halo dari Backend Flask!")

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify(error="File tidak ditemukan"), 400
    
    file = request.files['file']
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # --- LANGKAH 1: PRA-PEMROSESAN GAMBAR DENGAN OPENCV ---
        img_cv = cv2.imread(filepath)
        
        # Ubah ke Grayscale (skala abu-abu)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Terapkan Thresholding untuk mendapatkan gambar hitam-putih murni
        # Ini langkah yang sangat efektif untuk membersihkan background
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        
        # --- LANGKAH 2: MENJALANKAN OCR DENGAN KONFIGURASI BARU ---
        
        # Konfigurasi Tesseract
        # --psm 6: Menganggap gambar sebagai satu blok teks yang seragam. Sangat bagus untuk faktur.
        custom_config = r'--psm 6'
        
        raw_text = pytesseract.image_to_string(thresh, lang='ind', config=custom_config)
        
        # --- LANGKAH DEBUGGING (TETAP PENTING) ---
        print("--- HASIL OCR MENTAH (SETELAH PREPROCESSING) ---")
        print(raw_text)
        print("-------------------------------------------------")

        # Inisialisasi variabel hasil
        dpp = "Tidak Ditemukan"
        ppn = "Tidak Ditemukan"

        # Proses per baris, logika ini tetap sama dan sudah andal
        for line in raw_text.splitlines():
            line_lower = line.lower()

            if "dasar pengenaan pajak" in line_lower:
                angka_match = re.findall(r'([\d.,]+)', line)
                if angka_match:
                    # Ambil angka terakhir di baris itu, karena bisa jadi ada angka lain
                    dpp = angka_match[-1].replace('.', '').replace(',', '.')
            
            if "total ppn" in line_lower:
                angka_match = re.findall(r'([\d.,]+)', line)
                if angka_match:
                    ppn = angka_match[-1].replace('.', '').replace(',', '.')

        extracted_data = {
            'dpp': dpp,
            'ppn': ppn,
            'raw_text': raw_text
        }

        return jsonify(data=extracted_data), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify(error=str(e)), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/api/save', methods=['POST'])
def save_data():
    data = request.get_json()
    new_doc = DokumenPajak(dpp=data['dpp'], ppn=data['ppn'])
    db.session.add(new_doc)
    db.session.commit()
    return jsonify(message="Data berhasil disimpan!"), 201

@app.route('/api/export', methods=['GET'])
def export_excel():
    query = DokumenPajak.query.all()
    # Ubah data dari database menjadi DataFrame pandas
    df = pd.DataFrame([(d.id, d.dpp, d.ppn) for d in query], columns=['ID', 'DPP', 'PPN'])

    # Buat file Excel di memori
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine='openpyxl')
    df.to_excel(writer, index=False, sheet_name='Rekap Pajak')
    writer.close()
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='rekap_pajak.xlsx'
    )

if __name__ == '__main__':
    app.run(debug=True)

