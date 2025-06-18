import os
import re
import traceback
from datetime import datetime
import numpy as np
import cv2
import pytesseract
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from pdf2image import convert_from_path
import pandas as pd
import io
from thefuzz import fuzz

# ==============================================================================
# KONFIGURASI APLIKASI
# ==============================================================================
app = Flask(__name__)
CORS(app)

# --- Konfigurasi Database (WAJIB DISESUAIKAN) ---
# Ganti 'postgres:PasswordAnda123' dengan username dan password PostgreSQL Anda yang sebenarnya.
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:password@localhost/proyek_pajak'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Konfigurasi Path (Sesuaikan jika perlu) ---
# Path ke folder untuk menyimpan file upload sementara
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
# Path ke folder bin dari poppler di Windows
POPPLER_PATH = r'C:\poppler\poppler-24.08.0\Library\bin'
# Path ke Tesseract jika tidak ada di PATH sistem (hapus tanda # jika diperlukan)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ==============================================================================
# MODEL DATABASE
# ==============================================================================
# Model untuk tabel PPN Masukan
class PpnMasukan(db.Model):
    __tablename__ = 'ppn_masukan'
    id = db.Column(db.Integer, primary_key=True)
    bulan = db.Column(db.String(20), nullable=False)
    tanggal = db.Column(db.Date, nullable=False)
    keterangan = db.Column(db.Text, nullable=True)
    npwp_lawan_transaksi = db.Column(db.String(100), nullable=False)
    nama_lawan_transaksi = db.Column(db.String(255), nullable=False)
    no_faktur = db.Column(db.String(100), unique=True, nullable=False)
    dpp = db.Column(db.Numeric(15, 2), nullable=False)
    ppn = db.Column(db.Numeric(15, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

# Model untuk tabel PPN Keluaran
class PpnKeluaran(db.Model):
    __tablename__ = 'ppn_keluaran'
    id = db.Column(db.Integer, primary_key=True)
    bulan = db.Column(db.String(20), nullable=False)
    tanggal = db.Column(db.Date, nullable=False)
    keterangan = db.Column(db.Text, nullable=True)
    npwp_lawan_transaksi = db.Column(db.String(100), nullable=False)
    nama_lawan_transaksi = db.Column(db.String(255), nullable=False)
    no_faktur = db.Column(db.String(100), unique=True, nullable=False)
    dpp = db.Column(db.Numeric(15, 2), nullable=False)
    ppn = db.Column(db.Numeric(15, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

# ==============================================================================
# FUNGSI HELPER
# ==============================================================================
def clean_number(text):
    """Membersihkan string angka dari format Rupiah ke format standar float."""
    if not text: return 0.0
    cleaned_text = re.sub(r'[^\d,.-]', '', text).strip()
    return float(cleaned_text.replace('.', '').replace(',', '.'))

def clean_string(text):
    """Membersihkan string nama perusahaan untuk perbandingan yang andal."""
    if not text: return ""
    text = text.upper()
    text = re.sub(r'[.,]', '', text)
    text = re.sub(r'\b(PT|CV)\b', '', text)
    return text.strip()

@app.route('/api/process', methods=['POST'])
def process_file():
    if 'file' not in request.files: return jsonify(error="File tidak ditemukan"), 400
    file = request.files['file']
    nama_pt_utama = request.form.get('nama_pt_utama', '').strip()
    if not nama_pt_utama: return jsonify(error="Nama PT Utama wajib diisi"), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # Langkah 1 - 4: Konversi, OCR, Klasifikasi (Tidak ada perubahan)
        images = convert_from_path(filepath, poppler_path=POPPLER_PATH)
        if not images: return jsonify(error="Gagal memproses file PDF."), 500
        
        img_cv = cv2.cvtColor(np.array(images[0]), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        
        custom_config = r'--psm 6'
        raw_text = pytesseract.image_to_string(thresh, lang='ind', config=custom_config)
        
        pt_utama_cleaned = clean_string(nama_pt_utama)
        
        pembeli_keyword = "Pembeli Barang Kena Pajak"
        parts = re.split(pembeli_keyword, raw_text, flags=re.IGNORECASE)
        if len(parts) < 2: return jsonify(error="Format faktur tidak standar, keyword 'Pembeli' tidak ditemukan."), 400
        blok_penjual_text, blok_pembeli_text = parts
        
        jenis_pajak, blok_rekanan_text = None, None
        
        # Menggunakan thefuzz untuk perbandingan yang lebih baik
        from thefuzz import fuzz
        
        found_in_pembeli = False
        for line in blok_pembeli_text.splitlines():
            line_cleaned = clean_string(line)
            if line_cleaned and fuzz.ratio(pt_utama_cleaned, line_cleaned) > 70:
                jenis_pajak = 'PPN_MASUKAN'
                blok_rekanan_text = blok_penjual_text
                found_in_pembeli = True
                break
        
        if not found_in_pembeli:
            for line in blok_penjual_text.splitlines():
                line_cleaned = clean_string(line)
                if line_cleaned and fuzz.ratio(pt_utama_cleaned, line_cleaned) > 70:
                    jenis_pajak = 'PPN_KELUARAN'
                    blok_rekanan_text = blok_pembeli_text
                    break
        
        if not jenis_pajak:
            return jsonify(error=f"Nama PT Utama '{nama_pt_utama}' tidak dapat ditemukan dengan tingkat kemiripan yang cukup."), 400
        
        # Langkah 5: Ekstraksi Data
        nama_rekanan_match = re.search(r"Nama\s*:\s*(.+)", blok_rekanan_text)
        npwp_rekanan_match = re.search(r"NPWP\s*:\s*([\d.,-]+)", blok_rekanan_text)
        no_faktur_match = re.search(r"Nomor Seri Faktur Pajak\s*:\s*([\d.-]+)", raw_text)
        tanggal_match = re.search(r"(\d{2}\s+\w+\s+\d{4})", raw_text)

        dpp, ppn = 0.0, 0.0
        for line in raw_text.splitlines():
            if "Dasar Pengenaan Pajak" in line:
                angka = re.findall(r'([\d.,]+)', line)
                if angka: dpp = clean_number(angka[-1])
            if "Total PPN" in line:
                angka = re.findall(r'([\d.,]+)', line)
                if angka: ppn = clean_number(angka[-1])

        # ==========================================================
        # LOGIKA EKSTRAKSI KETERANGAN - PENYEMPURNAAN FINAL
        # ==========================================================
        keterangan = "Tidak ditemukan"
        try:
            start_keyword = "Nama Barang Kena Pajak / Jasa Kena Pajak"
            end_keyword = "Dasar Pengenaan Pajak"
            
            start_index = re.search(start_keyword, raw_text, re.IGNORECASE).end()
            end_index = re.search(end_keyword, raw_text, re.IGNORECASE).start()
            
            keterangan_block = raw_text[start_index:end_index]
            
            cleaned_lines = []
            # Blacklist untuk membuang baris header yang mungkin masuk
            blacklist = ["jual", "penggantian", "potongan", "muka", "termin", "likurangi", "kena pajak"]
            
            for line in keterangan_block.splitlines():
                line = line.strip()
                line_lower = line.lower()

                # Lewati jika baris kosong atau mengandung kata kunci dari blacklist
                if not line or any(keyword in line_lower for keyword in blacklist):
                    continue
                
                # Jika baris dimulai dengan 'Rp', anggap sebagai baris rincian harga dan simpan
                if line_lower.startswith('rp'):
                    cleaned_lines.append(line)
                    continue

                # Jika tidak, anggap sebagai baris deskripsi dan coba bersihkan
                # Hapus nomor urut atau OCR error yang mirip di awal (seperti "La", "a", "1.", "L ")
                processed_line = re.sub(r'^[a-zA-Z\d]\s*[.)]?\s*', '', line)

                # Hapus harga dan teks sampah di akhir (seperti | - ")
                processed_line = re.sub(r'\s+[\d.,]{4,}.*$', '', processed_line).strip()
                
                # Hanya simpan jika hasilnya masih mengandung teks yang berarti
                if processed_line:
                    cleaned_lines.append(processed_line)

            if cleaned_lines:
                keterangan = "\n".join(cleaned_lines)

        except (AttributeError, IndexError):
            pass
        # ==========================================================
        
        if not tanggal_match:
            return jsonify(error="Tanggal dokumen tidak dapat ditemukan."), 400

        bulan_map = {"januari": "January", "februari": "February", "maret": "March", "april": "April", "mei": "May", "juni": "June", "juli": "July", "agustus": "August", "september": "September", "oktober": "October", "november": "November", "desember": "December"}
        tanggal_str_parts = tanggal_match.group(1).lower().split()
        tanggal_str_en = f"{tanggal_str_parts[0]} {bulan_map.get(tanggal_str_parts[1], '')} {tanggal_str_parts[2]}"
        tanggal_obj = datetime.strptime(tanggal_str_en, '%d %B %Y').date()
        
        return jsonify({
            "success": True,
            "klasifikasi": jenis_pajak,
            "data": {
                "bulan": tanggal_obj.strftime("%B"),
                "tanggal": tanggal_obj.strftime("%Y-%m-%d"),
                "keterangan": keterangan,
                "npwp_lawan_transaksi": npwp_rekanan_match.group(1).strip() if npwp_rekanan_match else "N/A",
                "nama_lawan_transaksi": nama_rekanan_match.group(1).strip() if nama_rekanan_match else "N/A",
                "no_faktur": no_faktur_match.group(1).strip() if no_faktur_match else "N/A",
                "dpp": dpp,
                "ppn": ppn
            }
        }), 200

    except Exception:
        return jsonify(error=traceback.format_exc()), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

# ==============================================================================
# ENDPOINT BARU: HANYA UNTUK MENYIMPAN DATA
# ==============================================================================
@app.route('/api/save', methods=['POST'])
def save_data():
    data = request.get_json()
    jenis_pajak = data.get('klasifikasi')
    detail_data = data.get('data')

    if not all([jenis_pajak, detail_data]):
        return jsonify(error="Data tidak lengkap"), 400

    model_to_use = PpnMasukan if jenis_pajak == 'PPN_MASUKAN' else PpnKeluaran

    # Cek duplikasi
    existing_record = db.session.execute(db.select(model_to_use).filter_by(no_faktur=detail_data['no_faktur'])).scalar_one_or_none()
    if existing_record:
        return jsonify(message=f"Error: Faktur dengan nomor '{detail_data['no_faktur']}' sudah ada."), 409

    # Simpan data baru
    new_record = model_to_use(
        bulan=detail_data['bulan'],
        tanggal=datetime.strptime(detail_data['tanggal'], '%Y-%m-%d').date(),
        keterangan=detail_data['keterangan'],
        npwp_lawan_transaksi=detail_data['npwp_lawan_transaksi'],
        nama_lawan_transaksi=detail_data['nama_lawan_transaksi'],
        no_faktur=detail_data['no_faktur'],
        dpp=detail_data['dpp'],
        ppn=detail_data['ppn']
    )
    db.session.add(new_record)
    db.session.commit()

    return jsonify(message="Data berhasil disimpan ke database!"), 201

# Endpoint ekspor tidak berubah
@app.route('/api/export', methods=['GET'])
def export_excel():
    return "Fitur ekspor akan dikembangkan di fase selanjutnya."

# ==============================================================================
# MENJALANKAN APLIKASI (Tidak ada perubahan)
# ==============================================================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)