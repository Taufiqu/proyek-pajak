import re
from datetime import datetime
import cv2
import numpy as np
from pdf2image import convert_from_path
import easyocr
from thefuzz import process as fuzz_process
import textdistance
from spellchecker import SpellChecker
import os
import hashlib
from io import BytesIO
from PIL import Image

# Inisialisasi reader EasyOCR dan kamus Indonesia
try:
    print("Inisialisasi EasyOCR Reader...")
    ocr_reader = easyocr.Reader(['id', 'en'], gpu=False)
    print("EasyOCR Reader berhasil diinisialisasi.")
except Exception as e:
    print(f"Error initializing EasyOCR: {e}")
    ocr_reader = None

spell = SpellChecker(language=None, case_sensitive=False)
spell.word_frequency.load_text_file("D:/WEB KP/proyek-pajak/backend/app/bukti_setor/kamus_indonesia.txt")


# --- FUNGSI BARU UNTUK MENYIMPAN PREVIEW ---
def simpan_preview_image(pil_image, upload_folder):
    """
    Mengonversi gambar PIL ke JPG, menghasilkan nama unik via hash, 
    dan menyimpannya ke disk. Mengembalikan nama file yang disimpan.
    """
    try:
        # Konversi ke RGB untuk konsistensi, terutama dari gambar Grayscale/RGBA
        pil_image = pil_image.convert("RGB")
        
        # Simpan gambar ke buffer di memori
        buffer = BytesIO()
        pil_image.save(buffer, format="JPEG", quality=85) # Kualitas 85 cukup baik untuk preview
        img_bytes = buffer.getvalue()
        
        # Buat hash unik dari konten gambar untuk nama file
        img_hash = hashlib.md5(img_bytes).hexdigest()
        filename = f"preview_{img_hash}.jpg"
        filepath = os.path.join(upload_folder, filename)

        # Hanya simpan jika file belum ada untuk menghindari duplikasi
        if not os.path.exists(filepath):
            with open(filepath, "wb") as f:
                f.write(img_bytes)
            print(f"[📸 PREVIEW DISIMPAN] {filename}")
        else:
            print(f"[📎 PREVIEW SUDAH ADA] {filename}")
            
        return filename
    except Exception as e:
        print(f"[❌ ERROR SIMPAN PREVIEW] {e}")
        return None


def preprocess_for_ocr(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    return denoised

def clean_transaction_value(value_str):
    if not value_str: return None
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
        return int(float(cleaned))
    except (ValueError, TypeError):
        return None

def fuzzy_month_match(input_month, all_months):
    best = None
    best_score = 0
    for m in all_months:
        score = textdistance.levenshtein.normalized_similarity(input_month.lower(), m.lower())
        if score > best_score:
            best = m
            best_score = score
    return best if best_score > 0.6 else None

def fuzzy_search_nearby(text_blocks, keyword, pattern):
    for i, block in enumerate(text_blocks):
        if keyword.lower() in block:
            for j in range(max(0, i-1), min(len(text_blocks), i+2)):
                match = re.search(pattern, text_blocks[j])
                if match:
                    return match.group()
    return None

def correct_spelling(text):
    return ' '.join([spell.correction(w) if w not in spell and spell.correction(w) else w for w in text.split()])

def extract_bukti_setor_data(filepath, poppler_path):
    from flask import current_app
    upload_folder = current_app.config['UPLOAD_FOLDER']

    if not ocr_reader:
        raise ConnectionError("EasyOCR reader tidak berhasil diinisialisasi.")

    preview_filename = None
    
    if filepath.lower().endswith('.pdf'):
        images = convert_from_path(filepath, poppler_path=poppler_path, first_page=1, last_page=1)
        if not images: raise ValueError("Gagal mengonversi PDF.")
        
        pil_image_from_pdf = images[0]
        preview_filename = simpan_preview_image(pil_image_from_pdf, upload_folder)
        img_cv = cv2.cvtColor(np.array(pil_image_from_pdf), cv2.COLOR_RGB2BGR)
    else:
        img_cv = cv2.imread(filepath)
        if img_cv is None: raise ValueError("Format gambar tidak didukung.")

        # Konversi dari format OpenCV (BGR) ke PIL (RGB)
        pil_image_from_cv = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))
        preview_filename = simpan_preview_image(pil_image_from_cv, upload_folder)

    processed_img = preprocess_for_ocr(img_cv)
    ocr_results = ocr_reader.readtext(processed_img, detail=1, paragraph=False)

    full_text_for_logging = " ".join([res[1] for res in ocr_results])
    current_app.logger.info(f"--- EasyOCR Full Text ---\n{full_text_for_logging}\n--------------------")

    all_text_blocks = [correct_spelling(res[1].lower()) for res in ocr_results]
    full_text_str = " ".join(all_text_blocks)

    # KODE SETOR
    kode_setor = None
    rek_patterns = [
        r"(rek|debet|debit)[\s\S]{0,25}(\d[\d\s-]{8,}\d)",
        r"(referensi)[\s\S]{0,15}(\w+)",
        r"(ntpn)[\s\S]{0,15}(\w{16})",
    ]
    for pattern in rek_patterns:
        match = re.search(pattern, full_text_str, re.IGNORECASE)
        if match:
            kode_setor = re.sub(r'[\s.-]', '', match.group(2).strip())
            current_app.logger.info(f"Kode Setor ditemukan: {kode_setor}")
            break

    # TANGGAL
    tanggal_obj = None
    all_months = {"januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,"juli": 7, "agustus": 8, "september": 9, "oktober": 10, "nopember": 11, "desember": 12}
    all_months.update({k.capitalize(): v for k, v in all_months.items()})
    all_months.update({k[:3]: v for k, v in all_months.items()})

    date_pattern_fuzzy = re.compile(r"(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4})", re.IGNORECASE)
    date_pattern_slash = re.compile(r"(\d{1,2})[-/ ](\d{1,2})[-/ ](\d{4})")

    for text in all_text_blocks:
        match = date_pattern_fuzzy.search(text)
        if match:
            day, month_ocr, year = match.groups()
            best_match = fuzzy_month_match(month_ocr, all_months)
            if best_match:
                try:
                    tanggal_obj = datetime(int(year), all_months[best_match], int(day)).date()
                    current_app.logger.info(f"Tanggal ditemukan (fuzzy): {tanggal_obj}")
                    break
                except ValueError: pass
        match = date_pattern_slash.search(text)
        if match:
            try:
                day, month, year = map(int, match.groups())
                tanggal_obj = datetime(year, month, day).date()
                current_app.logger.info(f"Tanggal ditemukan (slash/dash): {tanggal_obj}")
                break
            except ValueError: pass

    if not tanggal_obj:
        fallback = fuzzy_search_nearby(all_text_blocks, 'tanggal', r'\d{1,2}[-/ ]\d{1,2}[-/ ]\d{4}')
        if fallback:
            try:
                tanggal_obj = datetime.strptime(fallback, '%d-%m-%Y').date()
            except: pass

    # JUMLAH
    jumlah = None
    candidate_values = []
    money_pattern = re.compile(r'([\d.,]+[\d])')
    keywords = ['jumlah', 'total', 'amount', 'nilai', 'setor', 'rp', 'idr']

    for text in all_text_blocks:
        if any(key in text for key in keywords):
            matches = money_pattern.findall(text)
            for num_str in matches:
                value = clean_transaction_value(num_str)
                if value and len(str(value)) < 15:
                    candidate_values.append(value)
                    current_app.logger.info(f"Kandidat jumlah ditemukan dekat keyword '{text}': {value}")

    if not candidate_values:
        for text in all_text_blocks:
            matches = money_pattern.findall(text)
            for num_str in matches:
                value = clean_transaction_value(num_str)
                if value and len(str(value)) < 15:
                    candidate_values.append(value)

    if candidate_values:
        valid_candidates = [v for v in candidate_values if v > 10000]
        current_app.logger.info(f"Semua kandidat jumlah ditemukan: {candidate_values}")
        jumlah = max(valid_candidates) if valid_candidates else max(candidate_values)
        current_app.logger.info(f"Jumlah final dipilih: {jumlah}")

    return {
        "kode_setor": kode_setor,
        "jumlah": jumlah,
        "tanggal": tanggal_obj.isoformat() if tanggal_obj else None,
        "preview_filename": preview_filename
    }