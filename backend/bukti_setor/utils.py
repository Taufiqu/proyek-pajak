import re
import os
import hashlib
from io import BytesIO
from datetime import datetime
import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_path
import easyocr
import textdistance
from spellchecker import SpellChecker
from flask import current_app
import time

# ==============================================================================
# Inisialisasi & Konfigurasi Awal
# ==============================================================================
try:
    print("Inisialisasi EasyOCR Reader...")
    OCR_READER = easyocr.Reader(['id', 'en'], gpu=True)
    print("EasyOCR Reader berhasil diinisialisasi.")
except Exception as e:
    print(f"Error initializing EasyOCR: {e}")
    OCR_READER = None

SPELL = SpellChecker(language=None, case_sensitive=False)
try:
    kamus_path = os.path.join(os.path.dirname(__file__), 'kamus_indonesia.txt')
    SPELL.word_frequency.load_text_file(kamus_path)
    print(f"Kamus Indonesia berhasil dimuat dari: {kamus_path}")
except Exception as e:
    print(f"Error memuat kamus Indonesia: {e}")


# ==============================================================================
# Fungsi-Fungsi Helper (Tidak berubah)
# ==============================================================================
def simpan_preview_image(pil_image, upload_folder):
    try:
        pil_image = pil_image.convert("RGB")
        buffer = BytesIO()
        pil_image.save(buffer, format="JPEG", quality=85)
        img_bytes = buffer.getvalue()
        img_hash = hashlib.md5(img_bytes).hexdigest()
        filename = f"preview_{img_hash}.jpg"
        filepath = os.path.join(upload_folder, filename)
        if not os.path.exists(filepath):
            with open(filepath, "wb") as f:
                f.write(img_bytes)
            current_app.logger.info(f"[📸 PREVIEW DISIMPAN] {filename}")
        else:
            current_app.logger.info(f"[📎 PREVIEW SUDAH ADA] {filename}")
        return filename
    except Exception as e:
        current_app.logger.error(f"[❌ ERROR SIMPAN PREVIEW] {e}")
        return None

def preprocess_for_ocr(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    return denoised

def clean_transaction_value(value_str):
    if not value_str:
        return None

    cleaned = re.sub(r'[^\d,.]', '', str(value_str))

    if ',' in cleaned and '.' in cleaned:
        if cleaned.rfind(',') > cleaned.rfind('.'):
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        if len(cleaned.split(',')[-1]) <= 2:
            cleaned = cleaned.replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')

    try:
        final_val = int(float(cleaned))
        # Batasi hasil absurd, minimal 4 digit (ribuan)
        return final_val if final_val > 1000 else None
    except (ValueError, TypeError):
        return None

def fuzzy_month_match(input_month, all_months):
    matches = [m for m in all_months if textdistance.levenshtein.normalized_similarity(input_month.lower(), m.lower()) > 0.6]
    return matches[0] if matches else None

def correct_spelling(text):
    return ' '.join([SPELL.correction(w) if w not in SPELL and SPELL.correction(w) else w for w in text.split()])


# ==============================================================================
# Fungsi Inti untuk Mengekstrak Data dari SATU Gambar
# ==============================================================================
def _extract_data_from_image(pil_image, upload_folder, page_num=1):
    start_total = time.time()
    preview_filename = simpan_preview_image(pil_image, upload_folder)

    img_cv = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    # ✅ Resize protection
    MAX_WIDTH = 1000
    if img_cv.shape[1] > MAX_WIDTH:
        ratio = MAX_WIDTH / img_cv.shape[1]
        img_cv = cv2.resize(img_cv, None, fx=ratio, fy=ratio, interpolation=cv2.INTER_AREA)
        print(f"[🧪 RESIZE] Gambar dikecilkan ke lebar {MAX_WIDTH}px")

    # ✅ Preprocess
    processed_img = preprocess_for_ocr(img_cv)

    # 🧠 Time OCR specifically
    print("🧠 [OCR] Mulai baca teks...")
    ocr_start = time.time()
    ocr_results = OCR_READER.readtext(processed_img, detail=1, paragraph=False)
    # Filter hasil OCR yang valid
    cleaned_ocr = []
    for res in ocr_results:
        text = res[1].strip()
        if len(text) >= 3 and re.search(r'\w', text):  # minimal panjang & ada karakter huruf/angka
            cleaned_ocr.append(text.lower())
    ocr_end = time.time()
    print(f"✅ [OCR] Selesai dalam {ocr_end - ocr_start:.2f} detik")

    full_text_for_logging = " ".join([res[1] for res in ocr_results])
    print(f"📋 [TEXT DUMP] {full_text_for_logging[:300]}...")  # crop biar gak kepanjangan

    all_text_blocks = [correct_spelling(text) for text in cleaned_ocr]
    full_text_str = " ".join(all_text_blocks)
    
    print(f"🔍 OCR result awal: {len(ocr_results)} blok, setelah filter: {len(cleaned_ocr)} blok")

    kode_setor, tanggal_obj, jumlah = None, None, None

    # Parse Kode Setor
    print("🔍 [PARSE] Mencari kode setor...")
    rek_patterns = [r"(rek|debet|debit)[\s\S]{0,25}(\d[\d\s-]{8,}\d)", r"(referensi)[\s\S]{0,15}(\w+)", r"(ntpn)[\s\S]{0,15}(\w{16})"]
    for pattern in rek_patterns:
        match = re.search(pattern, full_text_str, re.IGNORECASE)
        if match:
            kode_setor = re.sub(r'[\s.-]', '', match.group(2).strip())
            print(f"✅ [FOUND] Kode Setor: {kode_setor}")
            break

    # Parse Tanggal
    print("🔍 [PARSE] Mencari tanggal...")
    date_pattern_fuzzy = re.compile(r"(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4})", re.IGNORECASE)
    date_pattern_slash = re.compile(r"(\d{1,2})[-/ ](\d{1,2})[-/ ](\d{4})")

    all_months = {"januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
                  "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "nopember": 11, "desember": 12}
    all_months.update({k.capitalize(): v for k, v in all_months.items()})
    all_months.update({k[:3]: v for k, v in all_months.items()})

    for text in all_text_blocks:
        print(f"⏳ [DATE BLOCK] {text}")
        match_fuzzy = date_pattern_fuzzy.search(text)
        if match_fuzzy:
            day, month_ocr, year = match_fuzzy.groups()
            best_match = fuzzy_month_match(month_ocr, all_months)
            if best_match:
                try:
                    tanggal_obj = datetime(int(year), all_months[best_match], int(day)).date()
                    print(f"✅ [FOUND] Tanggal: {tanggal_obj}")
                    break
                except ValueError:
                    pass
        match_slash = date_pattern_slash.search(text)
        if match_slash:
            try:
                day, month, year = map(int, match_slash.groups())
                tanggal_obj = datetime(year, month, day).date()
                print(f"✅ [FOUND] Tanggal (slash): {tanggal_obj}")
                break
            except ValueError:
                pass

    # Parse Jumlah
    print("🔍 [PARSE] Mencari jumlah...")
    candidate_values = []
    money_pattern = re.compile(r'([\d.,]+[\d])')
    keywords = ['jumlah', 'total', 'amount', 'nilai', 'setor', 'rp', 'idr']
    for text in all_text_blocks:
        if any(key in text for key in keywords):
            for num_str in money_pattern.findall(text):
                value = clean_transaction_value(num_str)
                print(f"💰 [VALUE] Ditemukan: {num_str} → {value}")
                if value and len(str(value)) >= 4:
                    candidate_values.append(value)

    if not candidate_values:
        for text in all_text_blocks:
            for num_str in money_pattern.findall(text):
                value = clean_transaction_value(num_str)
                print(f"💰 [FALLBACK VALUE] {num_str} → {value}")
                if value and len(str(value)) >= 4:
                    candidate_values.append(value)

    if candidate_values:
        jumlah = max(candidate_values)
        print(f"✅ [FINAL JUMLAH] {jumlah}")

    print(f"🎉 [SELESAI] Halaman {page_num} diproses dalam {time.time() - start_total:.2f} detik")

    return {
        "kode_setor": kode_setor,
        "jumlah": jumlah,
        "tanggal": tanggal_obj.isoformat() if tanggal_obj else None,
        "preview_filename": preview_filename
    }
# ==============================================================================
# Fungsi Utama yang Dipanggil oleh routes.py
# ==============================================================================
def extract_bukti_setor_data(filepath, poppler_path):
    """
    Menerima path file, memprosesnya, dan mengembalikan sebuah LIST dari hasil.
    SELALU mengembalikan satu item per halaman/gambar, bahkan jika kosong.
    """
    upload_folder = current_app.config['UPLOAD_FOLDER']
    if not OCR_READER:
        raise ConnectionError("EasyOCR reader tidak berhasil diinisialisasi.")

    list_of_results = []
    
    if filepath.lower().endswith('.pdf'):
        all_pages_as_images = convert_from_path(filepath, poppler_path=poppler_path)
        if not all_pages_as_images:
            raise ValueError("Gagal mengonversi PDF atau PDF tidak berisi gambar.")

        for i, page_image in enumerate(all_pages_as_images):
            page_num = i + 1
            current_app.logger.info(f"--- Mulai memproses Halaman PDF ke-{page_num} ---")
            result_data = _extract_data_from_image(page_image, upload_folder, page_num)
            
            # --- PERUBAHAN UTAMA DI SINI ---
            # Hapus kondisi IF. Selalu tambahkan hasil ke daftar.
            # Ini memastikan frontend akan selalu menerima form untuk setiap halaman.
            list_of_results.append(result_data)
            
            # Logika baru untuk memberikan feedback tanpa menghentikan proses.
            if not (result_data.get("kode_setor") or result_data.get("jumlah")):
                current_app.logger.warning(f"Halaman {page_num} tidak menghasilkan data, tapi form kosong akan tetap dibuat untuk input manual.")
            
    else: # Jika bukan PDF (file gambar tunggal)
        try:
            pil_image = Image.open(filepath)
            result_data = _extract_data_from_image(pil_image, upload_folder)
            list_of_results.append(result_data)
        except Exception as e:
            raise ValueError(f"Format gambar tidak didukung atau file rusak: {e}")

    current_app.logger.info(f"Total {len(list_of_results)} kartu hasil dibuat dari file yang diupload.")
    return list_of_results