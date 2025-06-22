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
from sqlalchemy import or_
from PIL import Image
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, Border, Side
import tempfile
from flask import send_file
from collections import OrderedDict

# ==============================================================================
# KONFIGURASI APLIKASI
# ==============================================================================
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:password@localhost/proyek_pajak'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
# Path ke folder bin dari poppler di Windows
POPPLER_PATH = r'C:\poppler\poppler-24.08.0\Library\bin'

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

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

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

def format_currency(value, with_symbol=True):
    try:
        value = float(value)
        formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"Rp {formatted}" if with_symbol else formatted
    except:
        return "Rp 0,00" if with_symbol else "0,00"

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image_file(filename):
    return filename.lower().endswith(('.jpg', '.jpeg', '.png'))

def is_valid_image(path):
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:
        return False

def extract_keterangan(raw_text):
    try:
        start_match = re.search(r"Nama Barang Kena Pajak\s*/?\s*Jasa Kena Pajak", raw_text, re.IGNORECASE)
        end_match = re.search(r"Dasar Pengenaan Pajak", raw_text, re.IGNORECASE)

        if not start_match or not end_match:
            print("[DEBUG] ❌ Tidak ditemukan anchor keterangan.")
            return "Tidak ditemukan"

        start = start_match.end()
        end = end_match.start()
        blok = raw_text[start:end]

        print("\n[DEBUG] 🔍 BLOK KETERANGAN MENTAH:")
        print(blok)
        print("-" * 60)

        blocklist_keywords = [
            "uang muka", "termin", "dikurangi", "ppnbm",
            "harga jual", "penggantian", "potongan harga",
            "dasar pengenaan pajak", "total ppn", "total ppnbm"
        ]
        token_blacklist = {"la", "td", "dl", "the"}
        typo_map = {
            "indusiri": "industri"
        }

        cleaned_lines = []
        for line in blok.splitlines():
            original = line
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()
            if any(re.search(rf"\b{kw}\b", lower_line) for kw in blocklist_keywords):
                print(f"[FILTERED] Blocklist ⛔ '{original}'")
                continue

            # Gabungkan baris seperti "Rp xxx x 1" ke baris sebelumnya
            if re.match(r"^rp\s*[\d.,]+\s*x\s*\d*", line.lower()):
                if cleaned_lines:
                    cleaned_lines[-1] = f"{cleaned_lines[-1]} {line}"
                    print(f"[MERGE] Gabung baris harga → {cleaned_lines[-1]}")
                continue

            # Normalisasi karakter
            line = re.sub(r"[^\w\s.,:;/\-()Rp&]", "", line)
            line = re.sub(r"[\|\-\"']+$", "", line).strip()

            # Token filtering
            tokens = line.split()
            filtered_tokens = []

            for token in tokens:
                token_lower = token.lower()
                if token_lower in token_blacklist:
                    print(f"[TOKEN ❌] '{token}' → blacklist")
                    continue
                if len(token_lower) <= 1 and not token_lower.isalpha():
                    print(f"[TOKEN ❌] '{token}' → terlalu pendek")
                    continue
                filtered_tokens.append(token)

            line = " ".join(filtered_tokens).strip()

            # Typo correction
            for typo, correction in typo_map.items():
                line = re.sub(rf"\b{typo}\b", correction, line, flags=re.IGNORECASE)

            if line in cleaned_lines:
                print(f"[DUPLICATE] 🔁 Baris duplikat di-skip: {line}")
                continue

            if line:
                cleaned_lines.append(line)

        # Hilangkan duplikasi & join jadi satu baris
        final_keterangan = " ".join(OrderedDict.fromkeys(cleaned_lines)).strip()
        final_keterangan = re.sub(r'\s{2,}', ' ', final_keterangan)

        print("\n[DEBUG] ✅ HASIL KETERANGAN FINAL:")
        print(final_keterangan)

        return final_keterangan if final_keterangan else "Tidak ditemukan"

    except Exception as e:
        print(f"[ERROR] extract_keterangan: {e}")
        return "Tidak ditemukan"
    
def extract_jenis_pajak(raw_text, pt_utama):
    parts = re.split("Pembeli Barang Kena Pajak", raw_text, flags=re.IGNORECASE)
    if len(parts) < 2:
        return None, None, None
    blok_penjual, blok_pembeli = parts
    pt_clean = clean_string(pt_utama)
    for line in blok_pembeli.splitlines():
        if fuzz.ratio(clean_string(line), pt_clean) > 70:
            return 'PPN_MASUKAN', blok_penjual, blok_pembeli
    for line in blok_penjual.splitlines():
        if fuzz.ratio(clean_string(line), pt_clean) > 70:
            return 'PPN_KELUARAN', blok_pembeli, blok_penjual
    return None, None, None

def extract_npwp_nama_rekanan(blok_text):
    nama, npwp, raw_npwp = "Tidak Ditemukan", "Tidak Ditemukan", ""
    for line in blok_text.splitlines():
        if fuzz.ratio(line.lower().split(':')[0], 'nama') > 70:
            nama = line.split(':')[-1].strip()
        digits = ''.join(re.findall(r'\d', line))
        if len(digits) >= 15:
            raw_npwp = digits
    if len(raw_npwp) >= 15:
        npwp15 = raw_npwp[:15]
        npwp = f"{npwp15[:2]}.{npwp15[2:5]}.{npwp15[5:8]}.{npwp15[8]}.{npwp15[9:12]}.{npwp15[12:15]}"
    return nama, npwp

def extract_faktur_tanggal(raw_text):
    faktur = tanggal = None
    no_match = re.search(r"Nomor Seri Faktur Pajak\s*:\s*([\d.-]+)", raw_text)
    tanggal_match = re.search(r"(\d{2}\s+\w+\s+\d{4})", raw_text)
    if no_match:
        faktur = no_match.group(1).strip()
    if tanggal_match:
        bulan_map = {
            "januari": "January", "februari": "February", "maret": "March", "april": "April",
            "mei": "May", "juni": "June", "juli": "July", "agustus": "August", "september": "September",
            "oktober": "October", "november": "November", "desember": "December"
        }
        t_parts = tanggal_match.group(1).lower().split()
        try:
            tanggal = datetime.strptime(
                f"{t_parts[0]} {bulan_map.get(t_parts[1], '')} {t_parts[2]}", "%d %B %Y"
            )
        except:
            pass
    return faktur, tanggal

def extract_dpp(raw_text):
    try:
        lines = raw_text.splitlines()
        dpp = 0.0
        dpp_line = ""

        for line in lines:
            if 'dasar pengenaan pajak' in line.lower():
                match = re.search(r"([\d.,]+)", line)
                if match:
                    dpp = clean_number(match.group(1))
                    dpp_line = line
                    print(f"[✅ DPP by 'Dasar Pengenaan Pajak'] {dpp:,.2f} ← {line}")
                    break

        # Cari kandidat lain yang mungkin lebih besar
        all_numbers = re.findall(r"[\d.]{1,3}(?:[.,]\d{3}){2,}", raw_text)
        candidates = [clean_number(n) for n in all_numbers if clean_number(n) > 10_000_000]

        if candidates:
            max_val = max(candidates)
            if dpp and max_val > dpp * 2:
                print(f"[🛑 MISMATCH DETECTED] DPP {dpp:,.2f} terlalu kecil dibanding {max_val:,.2f}")
                print(f"[🔁 Koreksi] Anggap DPP = {max_val:,.2f}, dan {dpp:,.2f} adalah PPN.")
                return max_val, format_currency(max_val), dpp  # ✅ 3 nilai

        if dpp:
            return dpp, format_currency(dpp), None  # ✅ 3 nilai

        if candidates:
            fallback = max(candidates)
            print(f"[⚠️ DPP fallback max_val] {fallback:,.2f}")
            return fallback, format_currency(fallback), None  # ✅ 3 nilai

        return 0.0, format_currency(0.0), None  # ✅ 3 nilai
    except Exception as e:
        print(f"[ERROR extract_dpp] {e}")
        return 0.0, format_currency(0.0), None
    
def extract_ppn(raw_text, dpp, override_ppn=None):
    try:
        if override_ppn:
            print(f"[✅ Override PPN] {override_ppn:,.2f}")
            return override_ppn, format_currency(override_ppn)

        ppn = 0.0
        harga_jual = None
        angka_terdeteksi = []

        lines = raw_text.splitlines()
        relevant_lines = []
        found_trigger = False
        for line in lines:
            if not found_trigger and re.search(r'Barang|Jasa|Harga Jual', line, re.IGNORECASE):
                found_trigger = True
            if found_trigger:
                relevant_lines.append(line)

        # PRIORITAS UTAMA: Langsung cari "Total PPN"
        total_ppn_match = re.search(r'Total\s*PPN\s*[:\-]?\s*([\d.,]+)', raw_text, re.IGNORECASE)
        if total_ppn_match:
            ppn_val = clean_number(total_ppn_match.group(1))
            print(f"[✅ PPN by 'Total PPN'] {ppn_val:,.2f}")
            return ppn_val, format_currency(ppn_val)

        # Kedua: cari baris yang menyebut 'ppn' (tidak termasuk 'ppnbm')
        for line in relevant_lines:
            text = line.lower()

            if 'ppn' in text and 'ppnbm' not in text:
                match = re.search(r'([\d.,]+)', line)
                if match:
                    ppn = round(clean_number(match.group(1)))
                    print(f"[✅ PPN by keyword] {ppn:,} ← {line}")
                    return ppn, format_currency(ppn)

            if 'harga jual' in text or 'penggantian' in text:
                match = re.search(r'([\d.,]+)', line)
                if match:
                    harga_jual = clean_number(match.group(1))
                    print(f"[🟡 Harga Jual Detected] {harga_jual:,.2f} ← {line}")

            match_all = re.findall(r'([\d.,]{7,})', line)
            for m in match_all:
                val = clean_number(m)
                if val > 1_000_000:
                    angka_terdeteksi.append(val)

        # Ketiga: fallback by harga jual - dpp
        if harga_jual and dpp and harga_jual > dpp:
            ppn = round(harga_jual - dpp)
            print(f"[🟠 Fallback PPN = Harga Jual - DPP] {ppn:,}")
            return ppn, format_currency(ppn)

        # Keempat: fallback dari angka terbesar
        if not harga_jual and angka_terdeteksi and dpp > 0:
            kandidat = max(angka_terdeteksi)
            if kandidat > dpp:
                ppn = round(kandidat - dpp)
                print(f"[🔵 PPN dari Max-Angka - DPP] {ppn:,}")
                return ppn, format_currency(ppn)

        print("[⚠️ PPN tidak dapat ditentukan]")
        return 0.0, format_currency(0.0)
    except Exception as e:
        print(f"[ERROR extract_ppn] {e}")
        return 0.0, format_currency(0.0)
    
def preprocess_for_ocr(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)  # reduce noise
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    return thresh

import json

def save_debug_json(nama_file_pdf: str, hasil_halaman: list):
    debug_path = os.path.join(UPLOAD_FOLDER, f"debug_{os.path.splitext(nama_file_pdf)[0]}.json")
    try:
        with open(debug_path, 'w', encoding='utf-8') as f:
            json.dump({
                "debug_of": nama_file_pdf,
                "total_halaman": len(hasil_halaman),
                "results": hasil_halaman
            }, f, ensure_ascii=False, indent=2)
        print(f"[DEBUG] 📄 File debug disimpan di: {debug_path}")
    except Exception as e:
        print(f"[ERROR] Gagal menyimpan file debug: {e}")

# Tambahkan ke app.py, ubah function process_file agar support multi-halaman hasil OCR
@app.route('/api/process', methods=['POST'])
def process_file():
    if 'file' not in request.files:
        return jsonify(error="File tidak ditemukan"), 400

    file = request.files['file']
    nama_pt_utama = request.form.get('nama_pt_utama', '').strip()

    if not nama_pt_utama:
        return jsonify(error="Nama PT Utama wajib diisi"), 400

    if not allowed_file(file.filename):
        return jsonify(error="File tidak didukung. Gunakan PDF atau gambar"), 400
    
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        if file.filename.lower().endswith('.pdf'):
            images = convert_from_path(filepath, poppler_path=POPPLER_PATH)
        else:
            with Image.open(filepath) as img:
                images = [img.copy()]  # salinan aman

        hasil_semua_halaman = []

        for i, image in enumerate(images):
            halaman_ke = i + 1
            print(f"\n=== [📝 DEBUG] MEMPROSES HALAMAN {halaman_ke} ===")

            if isinstance(image, np.ndarray):
                img_cv = image
            else:
                img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

            thresh = preprocess_for_ocr(img_cv)

            # Simpan preview image
            preview_filename = f"{os.path.splitext(file.filename)[0]}_halaman_{halaman_ke}.jpg"
            preview_path = os.path.join(UPLOAD_FOLDER, preview_filename)
            cv2.imwrite(preview_path, thresh)
            print(f"[📸 PREVIEW DISIMPAN] {preview_filename}")

            raw_text = pytesseract.image_to_string(thresh, lang='ind', config='--psm 6')

            jenis_pajak, blok_rekanan, _ = extract_jenis_pajak(raw_text, nama_pt_utama)
            if not jenis_pajak:
                hasil_semua_halaman.append({"error": f"Hal {halaman_ke}: Nama PT Utama tidak ditemukan."})
                continue

            nama_rekanan, npwp_rekanan = extract_npwp_nama_rekanan(blok_rekanan)
            no_faktur, tanggal_obj = extract_faktur_tanggal(raw_text)
            if not no_faktur or not tanggal_obj:
                hasil_semua_halaman.append({"error": f"Hal {halaman_ke}: Tidak ditemukan tanggal/faktur"})
                continue

            dpp, dpp_str, override_ppn = extract_dpp(raw_text)
            ppn, ppn_str = extract_ppn(raw_text, dpp, override_ppn)
            keterangan = extract_keterangan(raw_text)

            hasil_halaman = {
                "klasifikasi": jenis_pajak,
                "data": {
                    "bulan": tanggal_obj.strftime("%B"),
                    "tanggal": tanggal_obj.strftime("%Y-%m-%d"),
                    "keterangan": keterangan,
                    "npwp_lawan_transaksi": npwp_rekanan,
                    "nama_lawan_transaksi": nama_rekanan,
                    "no_faktur": no_faktur,
                    "dpp": dpp,
                    "dpp_str": dpp_str,
                    "ppn": ppn,
                    "ppn_str": ppn_str,
                    "formatted_dpp": dpp_str,
                    "formatted_ppn": ppn_str,
                    "halaman": halaman_ke,
                    "preview_image": preview_filename,
                    "raw_ocr": raw_text
                }
            }

            hasil_semua_halaman.append(hasil_halaman)

            # Simpan debug JSON dan TXT
            debug_dir = os.path.join(UPLOAD_FOLDER, "debug")
            os.makedirs(debug_dir, exist_ok=True)
            json_path = os.path.join(debug_dir, f"{os.path.splitext(file.filename)[0]}_hal_{halaman_ke}.json")
            txt_path = os.path.join(debug_dir, f"debug_page_{halaman_ke}.txt")

            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(hasil_halaman, f, ensure_ascii=False, indent=2)
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(raw_text)

            print(f"[✅ HALAMAN {halaman_ke}] Faktur: {no_faktur} | DPP: {dpp_str} | PPN: {ppn_str}")

        return jsonify({
            "success": True,
            "results": hasil_semua_halaman,
            "total_halaman": len(images)
        }), 200

    except Exception as err:
        print(f"[❌ ERROR] {traceback.format_exc()}")
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

from openpyxl import Workbook

@app.route('/api/export', methods=['GET'])
def export_excel():
    try:

        wb = Workbook()
        ws = wb.active

        masukan = PpnMasukan.query.all()
        keluaran = PpnKeluaran.query.all()
        print("[DEBUG] Masukan:", len(masukan), "| Keluaran:", len(keluaran))

        def serialize_row(row):
            print(f"[DEBUG] Serialize: {row.id} | {row.no_faktur}")
            dpp_val = float(row.dpp)
            ppn_val = float(row.ppn)
            return [
                row.tanggal.strftime('%Y-%m-%d'),
                "PPN MASUKAN" if isinstance(row, PpnMasukan) else "PPN KELUARAN",
                row.keterangan,
                row.npwp_lawan_transaksi,
                row.nama_lawan_transaksi,
                row.no_faktur,
                dpp_val,
                ppn_val,
                dpp_val + ppn_val  # 👈 Tambahan di akhir
            ]

        headers = ['Tanggal', 'Jenis', 'Keterangan', 'NPWP Rekanan', 'Nama Rekanan', 'No Faktur', 'DPP', 'PPN', 'Jumlah (DPP + PPN)']
        for col, title in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col, value=title)
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center", vertical="center")

        data_rows = []
        for r in masukan + keluaran:
            try:
                data_rows.append(serialize_row(r))
            except Exception as e:
                print(f"[ERROR] Gagal serialize row ID={r.id}: {e}")

        # Load template
        template_path = os.path.join(os.getcwd(), 'rekap_template.xlsx')
        wb = load_workbook(template_path)
        ws = wb.active

        start_row = 2  # Anggap data mulai dari baris ke-3
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )

        for idx, row_data in enumerate(data_rows, start=start_row):
            for col_index, value in enumerate(row_data, start=1):
                cell = ws.cell(row=idx, column=col_index, value=value)
                cell.alignment = Alignment(vertical="center")
                cell.border = thin_border
                if isinstance(value, (int, float)) and col_index in [7,8,9]:
                    cell.number_format = '#,##0.00'

        # Simpan ke file sementara
        temp = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
        wb.save(temp.name)
        print("[DEBUG] Berhasil menyimpan file:", temp.name)
        return send_file(temp.name, as_attachment=True, download_name="rekap_pajak.xlsx")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    masukan = PpnMasukan.query.all()
    keluaran = PpnKeluaran.query.all()

    def serialize(row, jenis):
        return {
            "id": row.id,
            "jenis": jenis,
            "no_faktur": row.no_faktur,
            "nama_lawan_transaksi": row.nama_lawan_transaksi,
            "tanggal": row.tanggal.strftime('%Y-%m-%d'),
        }

    hasil = [serialize(r, 'masukan') for r in masukan] + [serialize(r, 'keluaran') for r in keluaran]
    return jsonify(hasil), 200

@app.route('/api/delete/<string:jenis>/<int:id>', methods=['DELETE'])
def delete_faktur(jenis, id):
    model = PpnMasukan if jenis.lower() == 'masukan' else PpnKeluaran
    faktur = db.session.get(model, id)
    if not faktur:
        return jsonify(message="Data tidak ditemukan"), 404

    db.session.delete(faktur)
    db.session.commit()
    return jsonify(message="Faktur berhasil dihapus!"), 200

@app.route('/preview/<filename>')
def serve_preview(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    return send_file(filepath, mimetype='image/jpeg')

# ==============================================================================
# MENJALANKAN APLIKASI (Tidak ada perubahan)
# ==============================================================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)