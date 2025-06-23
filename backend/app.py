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
import imutils
import thresh

# ==============================================================================
# KONFIGURASI APLIKASI
# ==============================================================================
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# --- Konfigurasi Database (WAJIB DISESUAIKAN) ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:1234@localhost/proyek_pajak'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Konfigurasi Path (Sesuaikan jika perlu) ---
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
POPPLER_PATH = r'C:\Program Files\poppler-24.08.0\Library\bin'
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ==============================================================================
# MODEL DATABASE (Tidak ada perubahan)
# ==============================================================================
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

class BuktiSetor(db.Model):
    __tablename__ = 'bukti_setor'
    id = db.Column(db.Integer, primary_key=True)
    tanggal = db.Column(db.Date, nullable=False)
    kode_setor = db.Column(db.String(100), nullable=False, unique=True) 
    jumlah = db.Column(db.Numeric(15, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

# ==============================================================================
# FUNGSI HELPER (Tidak ada perubahan)
# ==============================================================================
def clean_number(text):
    if not text: return 0.0
    cleaned_text = re.sub(r'[^\d,.-]', '', text).strip()
    return float(cleaned_text.replace('.', '').replace(',', '.'))

def clean_string(text):
    if not text: return ""
    text = text.upper()
    text = re.sub(r'[.,]', '', text)
    text = re.sub(r'\b(PT|CV)\b', '', text)
    return text.strip()

def clean_transaction_value(text):
    if not text: return 0.0
    cleaned_text = re.sub(r'[^\d,.]', '', text).strip()
    cleaned_text = cleaned_text.replace('.', '').replace(',', '.')
    try:
        return float(cleaned_text)
    except (ValueError, TypeError):
        return 0.0

# ==============================================================================
# ENDPOINTS UNTUK FAKTUR PPN
# ==============================================================================
@app.route('/api/process_faktur', methods=['POST'])
def process_faktur_endpoint():
    if 'file' not in request.files: return jsonify(error="File tidak ditemukan"), 400
    file = request.files['file']
    nama_pt_utama = request.form.get('nama_pt_utama', '').strip()
    if not nama_pt_utama: return jsonify(error="Nama PT Utama wajib diisi"), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        images = convert_from_path(filepath, poppler_path=POPPLER_PATH)
        img_cv = cv2.cvtColor(np.array(images[0]), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        
        raw_text = pytesseract.image_to_string(thresh, lang='ind', config='--psm 6')
        
        # --- (Logika klasifikasi tidak berubah) ---
        pt_utama_cleaned = clean_string(nama_pt_utama)
        pembeli_keyword = "Pembeli Barang Kena Pajak"
        parts = re.split(pembeli_keyword, raw_text, flags=re.IGNORECASE)
        if len(parts) < 2: return jsonify(error="Format faktur tidak standar, keyword 'Pembeli' tidak ditemukan."), 400
        
        blok_penjual_text, blok_pembeli_text = parts
        jenis_pajak, blok_rekanan_text = None, None
        
        for line in blok_pembeli_text.splitlines():
            if fuzz.ratio(pt_utama_cleaned, clean_string(line)) > 70:
                jenis_pajak, blok_rekanan_text = 'PPN_MASUKAN', blok_penjual_text
                break
        
        if not jenis_pajak:
            for line in blok_penjual_text.splitlines():
                if fuzz.ratio(pt_utama_cleaned, clean_string(line)) > 70:
                    jenis_pajak, blok_rekanan_text = 'PPN_KELUARAN', blok_pembeli_text
                    break
        
        if not jenis_pajak: return jsonify(error=f"Nama PT Utama '{nama_pt_utama}' tidak dapat ditemukan."), 400
        
        # ==========================================================
        # PENYEMPURNAAN KUNCI: Logika Ekstraksi Data yang Lebih Andal
        # ==========================================================
        
        # Regex yang lebih fleksibel, tidak peka huruf besar/kecil, dan non-greedy
        nama_rekanan_match = re.search(r"Nama\s*:\s*(.*?)\n", blok_rekanan_text, re.IGNORECASE)
        npwp_rekanan_match = re.search(r"NPWP\s*:\s*([\d.,-]+)", blok_rekanan_text, re.IGNORECASE)
        no_faktur_match = re.search(r"(?:Nomor Seri Faktur Pajak|No\. Faktur|Nomor Faktur)\s*:\s*([\d.-]+)", raw_text, re.IGNORECASE)
        tanggal_match = re.search(r"(\d{2}\s+\w+\s+\d{4})", raw_text, re.IGNORECASE)

        dpp, ppn = 0.0, 0.0
        lines = raw_text.splitlines()
        for line in lines:
            line_lower = line.lower()
            if "dasar pengenaan pajak" in line_lower:
                numbers_in_line = re.findall(r'[\d.,]+', line)
                if numbers_in_line:
                    dpp = clean_number(numbers_in_line[-1])
            if "total ppn" in line_lower or "ppn =" in line_lower:
                numbers_in_line = re.findall(r'[\d.,]+', line)
                if numbers_in_line:
                    ppn = clean_number(numbers_in_line[-1])

        if not tanggal_match: return jsonify(error="Tanggal dokumen tidak dapat ditemukan."), 400
        
        bulan_map = {"januari": "January", "februari": "February", "maret": "March", "april": "April", "mei": "May", "juni": "June", "juli": "July", "agustus": "August", "september": "September", "oktober": "October", "november": "November", "desember": "December"}
        tanggal_str_parts = tanggal_match.group(1).lower().split()
        tanggal_str_en = f"{tanggal_str_parts[0]} {bulan_map.get(tanggal_str_parts[1], '')} {tanggal_str_parts[2]}"
        tanggal_obj = datetime.strptime(tanggal_str_en, '%d %B %Y').date()
        
        return jsonify({
            "success": True, "klasifikasi": jenis_pajak,
            "data": {
                "bulan": tanggal_obj.strftime("%B"), "tanggal": tanggal_obj.strftime("%Y-%m-%d"),
                "keterangan": "Perlu ekstraksi lebih lanjut",
                "npwp_lawan_transaksi": npwp_rekanan_match.group(1).strip() if npwp_rekanan_match else "N/A",
                "nama_lawan_transaksi": nama_rekanan_match.group(1).strip() if nama_rekanan_match else "N/A",
                "no_faktur": no_faktur_match.group(1).strip() if no_faktur_match else "N/A",
                "dpp": dpp, "ppn": ppn
            }
        }), 200
    except Exception as e:
        return jsonify(error=str(e)), 500
    finally:
        if os.path.exists(filepath): os.remove(filepath)

@app.route('/api/save_faktur', methods=['POST'])
def save_faktur_endpoint():
    # --- (Tidak ada perubahan di fungsi ini) ---
    data = request.get_json()
    jenis_pajak, detail_data = data.get('klasifikasi'), data.get('data')

    if not all([jenis_pajak, detail_data]): return jsonify(error="Data tidak lengkap"), 400
    
    model_to_use = PpnMasukan if jenis_pajak == 'PPN_MASUKAN' else PpnKeluaran
    
    if db.session.execute(db.select(model_to_use).filter_by(no_faktur=detail_data['no_faktur'])).scalar_one_or_none():
        return jsonify(message=f"Error: Faktur dengan nomor '{detail_data['no_faktur']}' sudah ada."), 409

    new_record = model_to_use(
        bulan=detail_data['bulan'],
        tanggal=datetime.strptime(detail_data['tanggal'], '%Y-%m-%d').date(),
        keterangan=detail_data['keterangan'],
        npwp_lawan_transaksi=detail_data['npwp_lawan_transaksi'],
        nama_lawan_transaksi=detail_data['nama_lawan_transaksi'],
        no_faktur=detail_data['no_faktur'],
        dpp=detail_data['dpp'], ppn=detail_data['ppn']
    )
    db.session.add(new_record)
    db.session.commit()
    return jsonify(message="Data faktur berhasil disimpan!"), 201

# ==============================================================================
# ENDPOINTS UNTUK BUKTI SETOR
# ==============================================================================

def auto_rotate_image(image):
    osd = pytesseract.image_to_osd(image)
    angle = int(re.search('(?<=Rotate: )\d+', osd).group(0))
    return imutils.rotate_bound(image, angle)

def preprocess_for_ocr(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Denoise
    blur = cv2.medianBlur(gray, 3)
    # Thresholding adaptif
    thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C,cv2.THRESH_BINARY, 11, 2)
    return thresh

@app.route('/api/process_bukti_setor', methods=['POST'])
def process_bukti_setor_endpoint():
    if 'file' not in request.files:
        return jsonify(error="File tidak ditemukan"), 400
    file = request.files['file']
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # Konversi ke gambar
        if file.filename.lower().endswith('.pdf'):
            images = convert_from_path(filepath, poppler_path=POPPLER_PATH, first_page=1, last_page=1)
            if not images:
                return jsonify(error="Gagal mengonversi file PDF ke gambar."), 500
            img_cv = cv2.cvtColor(np.array(images[0]), cv2.COLOR_RGB2BGR)
        else:
            img_cv = cv2.imread(filepath)
            if img_cv is None:
                return jsonify(error="Format gambar tidak didukung atau file rusak."), 400

        # Preprocessing & Rotate
        img_cv = auto_rotate_image(img_cv)
        thresh = preprocess_for_ocr(img_cv)

        # ✅ OCR dengan fallback bahasa
        try:
            raw_text = pytesseract.image_to_string(thresh, lang='ind', config='--psm 6')
        except pytesseract.TesseractError:
            try:
                raw_text = pytesseract.image_to_string(thresh, lang='eng', config='--psm 6')
            except Exception as e:
                print("❌ OCR total gagal:", str(e))
                raw_text = ""
                
        if raw_text:
            print("=== OCR RESULT ===")
            print(raw_text)
            print("==================")

        # ✅ REGEX PARSING YANG DIPERBAIKI
        # 1. Regex untuk Rekening Debet/Kode Setor - Multiple patterns
        kode_setor = None
        rek_patterns = [
        r"(?:rek|mek)\.?\s*debet\s*[iIl1:\s]*\s*(\d{6,})",  # yang bener dari OCR: mek. Debet i 4121411937
        r"(?:rekening|no\.?\s*rek)\s*[:;]?\s*(\d{6,})",
        r"debet\s*[:;]?\s*(\d{6,})",
        # fallback terakhir HARUS hati-hati:
        r"\b(\d{10,})\b"  # hanya angka berdiri sendiri
]
        
        for pattern in rek_patterns:
            match = re.search(pattern, raw_text, re.IGNORECASE)
            if match:
                kode_setor = match.group(1).strip()
                print(f"✅ Kode Setor found with pattern '{pattern}': {kode_setor}")
                break

        # 2. Regex untuk Nilai Transaksi - Multiple patterns
        nilai_patterns = [
        # Toleransi OCR dan kemungkinan posisi angka langsung
        r"(?:nilai|siilai|silai|jumlah|sukti|siama).*?(?:trx|transaksi)?\s*[:;]?\s*(?:idr|tdr|rp)?\s*[iIl1]?\s*([\d\.,]{7,})",
        r"(?:idr|tdr|rp)[\s:]*[iIl1]?\s*([\d\.,]{7,})",
        r"(?:^|\s)([\d\.,]{7,})(?:\s|$)"  # Fallback angka besar
    ]
        
        for pattern in nilai_patterns:
            match = re.search(pattern, raw_text, re.IGNORECASE | re.MULTILINE)
            if match:
                jumlah_raw = match.group(1).strip()
                jumlah = clean_transaction_value(jumlah_raw)
                print(f"✅ Nilai Trx found with pattern '{pattern}': {jumlah_raw} -> {jumlah}")
                break

        # 3. Regex untuk Tanggal - Multiple patterns
        tanggal_obj = None
        tanggal_patterns = [
        r"(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})",
        r"(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})",
        # tambahkan fallback OCR kacau:
        r"(\d{1,2})[\s\-\/\.]+(des|okt|nov|jul|jun|mei|apr|mar|feb|jan)[\s\-\/\.]+(\d{4})"
]

        
        bulan_map = {
        "january": "January", "february": "February", "march": "March", "april": "April",
        "may": "May", "june": "June", "july": "July", "august": "August",
        "september": "September", "october": "October", "november": "November", "december": "December",
        "jan": "January", "feb": "February", "mar": "March", "apr": "April",
        "may": "May", "jun": "June", "jul": "July", "aug": "August", "sep": "September",
        "oct": "October", "nov": "November", "dec": "December",
        "des": "December", "okt": "October"  # OCR Indo
    }

        
        for i, pattern in enumerate(tanggal_patterns):
            match = re.search(pattern, raw_text, re.IGNORECASE)
            if match:
                try:
                    if i == 0 or i == 1:  # Format: DD Month YYYY
                        day, month, year = match.groups()
                        month_eng = bulan_map.get(month.lower(), month)
                        tanggal_str = f"{day} {month_eng} {year}"
                        tanggal_obj = datetime.strptime(tanggal_str, '%d %B %Y').date()
                    elif i == 2:  # Format: DD/MM/YYYY
                        day, month, year = match.groups()
                        tanggal_obj = datetime.strptime(f"{day}/{month}/{year}", '%d/%m/%Y').date()
                    elif i == 3:  # Format: YYYY/MM/DD
                        year, month, day = match.groups()
                        tanggal_obj = datetime.strptime(f"{year}/{month}/{day}", '%Y/%m/%d').date()
                    
                    print(f"✅ Tanggal found with pattern '{pattern}': {tanggal_obj}")
                    break
                except ValueError as e:
                    print(f"❌ Error parsing date: {e}")
                    continue

        # ✅ DEBUG OUTPUT
        print("\n=== EXTRACTION RESULTS ===")
        print(f"Kode Setor: {kode_setor if kode_setor else '❌ Not found'}")
        print(f"Nilai Trx : {jumlah if jumlah else '❌ Not found'}")
        print(f"Tanggal   : {tanggal_obj if tanggal_obj else '❌ Not found'}")
        print("==========================")

        # ✅ VALIDASI DATA
        missing_fields = []
        if not kode_setor:
            missing_fields.append("Kode Setor/Rekening Debet")
        if not jumlah:
            missing_fields.append("Nilai Transaksi")
        if not tanggal_obj:
            missing_fields.append("Tanggal")
            
        if missing_fields:
            return jsonify(
                error=f"Gagal mengekstrak data: {', '.join(missing_fields)} tidak ditemukan. Pastikan dokumen jelas dan format sesuai.",
                raw_text=raw_text  # Untuk debugging
            ), 400

        return jsonify(message="Data berhasil diekstrak. Silakan periksa dan simpan.",data={
        "kode_setor": kode_setor,
        "jumlah": jumlah,
        "tanggal": tanggal_obj.isoformat()
    }
),200

    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify(error=f"Terjadi kesalahan di server: {str(e)}"), 500
    finally:
        if os.path.exists(filepath): 
            os.remove(filepath)

@app.route('/api/save_bukti_setor', methods=['POST'])

def save_bukti_setor():
    data = request.get_json()

    kode_setor = data.get('kode_setor')
    tanggal = data.get('tanggal')
    jumlah = data.get('jumlah')

    if not all([kode_setor, tanggal, jumlah]):
        return jsonify(error="Field tidak lengkap"), 400

    # Cek duplikat
    if db.session.execute(db.select(BuktiSetor).filter_by(kode_setor=kode_setor)).scalar_one_or_none():
        return jsonify(error=f"Bukti setor dengan kode '{kode_setor}' sudah ada."), 409

    try:
        tanggal_obj = datetime.strptime(tanggal, '%Y-%m-%d').date()
        new_record = BuktiSetor(
            tanggal=tanggal_obj,
            kode_setor=kode_setor,
            jumlah=int(jumlah)
        )
        db.session.add(new_record)
        db.session.commit()
        return jsonify(message="Data bukti setor berhasil disimpan!"), 201
    except Exception as e:
        return jsonify(error=f"Kesalahan saat menyimpan: {str(e)}"), 500

# ✅ HELPER FUNCTION UNTUK MEMBERSIHKAN NILAI TRANSAKSI
def clean_transaction_value(value_str):
    """
    Membersihkan string nilai transaksi menjadi integer
    Contoh: "178,312,294" -> 178312294
    """
    if not value_str:
        return None
    
    # Hapus semua karakter non-digit kecuali titik dan koma
    cleaned = re.sub(r'[^\d\.,]', '', str(value_str))
    
    # Tentukan apakah menggunakan titik atau koma sebagai pemisah ribuan
    if ',' in cleaned and '.' in cleaned:
        # Jika ada keduanya, yang terakhir adalah desimal
        if cleaned.rfind(',') > cleaned.rfind('.'):
            # Koma sebagai desimal
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            # Titik sebagai desimal
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        # Jika hanya ada koma, anggap sebagai pemisah ribuan
        if cleaned.count(',') > 1 or len(cleaned.split(',')[-1]) == 3:
            cleaned = cleaned.replace(',', '')
        else:
            # Jika hanya satu koma dan tidak 3 digit di belakang, anggap desimal
            cleaned = cleaned.replace(',', '.')
    
    try:
        # Konversi ke float dulu, lalu ke int untuk menghilangkan desimal
        return int(float(cleaned))
    except (ValueError, TypeError):
        return None

# ==============================================================================
# ENDPOINTS UNTUK LAPORAN & EKSPOR (Tidak ada perubahan)
# ==============================================================================
@app.route('/api/laporan/<jenis_pajak>', methods=['GET'])
def get_laporan(jenis_pajak):
    data = []
    if jenis_pajak == 'ppn_masukan':
        records = db.session.execute(db.select(PpnMasukan).order_by(PpnMasukan.tanggal.desc())).scalars()
        data = [{"id": r.id, "tanggal": r.tanggal.strftime('%Y-%m-%d'), "no_faktur": r.no_faktur, "nama_lawan_transaksi": r.nama_lawan_transaksi, "dpp": float(r.dpp), "ppn": float(r.ppn)} for r in records]
    elif jenis_pajak == 'ppn_keluaran':
        records = db.session.execute(db.select(PpnKeluaran).order_by(PpnKeluaran.tanggal.desc())).scalars()
        data = [{"id": r.id, "tanggal": r.tanggal.strftime('%Y-%m-%d'), "no_faktur": r.no_faktur, "nama_lawan_transaksi": r.nama_lawan_transaksi, "dpp": float(r.dpp), "ppn": float(r.ppn)} for r in records]
    elif jenis_pajak == 'bukti_setor':
        records = db.session.execute(db.select(BuktiSetor).order_by(BuktiSetor.tanggal.desc())).scalars()
        data = [{"id": r.id, "tanggal": r.tanggal.strftime('%Y-%m-%d'), "kode_setor": r.kode_setor, "jumlah": float(r.jumlah)} for r in records]
    
    return jsonify(data)

@app.route('/api/export/<jenis_pajak>', methods=['GET'])
def export_laporan(jenis_pajak):
    model_map = {'ppn_masukan': PpnMasukan, 'ppn_keluaran': PpnKeluaran, 'bukti_setor': BuktiSetor}
    if jenis_pajak not in model_map: return "Jenis pajak tidak valid", 400

    Model = model_map[jenis_pajak]
    query = db.session.execute(db.select(Model)).scalars().all()
    if not query: return "Tidak ada data untuk diekspor", 404

    df = pd.DataFrame([r.__dict__ for r in query])
    df.pop('_sa_instance_state', None)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Laporan')
    output.seek(0)
    
    return send_file(output, as_attachment=True, download_name=f'laporan_{jenis_pajak}_{datetime.now().strftime("%Y%m%d")}.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# ==============================================================================
# MENJALANKAN APLIKASI
# ==============================================================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
    app.run(debug=True, port=5000)