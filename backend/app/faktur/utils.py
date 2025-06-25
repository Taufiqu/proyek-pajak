import re
from datetime import datetime
import numpy as np
import cv2
import pytesseract
import os
from thefuzz import fuzz
from flask import current_app
import hashlib
from io import BytesIO
from PIL import Image


# ==============================================================================
# FUNGSI-FUNGSI HELPER UNTUK FAKTUR
# ==============================================================================

def clean_number(text):
    """Membersihkan string angka dari format Rupiah ke format standar float."""
    if not text: return 0.0
    # Hanya sisakan digit, koma, dan tanda minus
    cleaned_text = re.sub(r'[^\d,-]', '', text).strip()
    try:
        # Ubah koma desimal Indonesia menjadi titik
        cleaned_text = cleaned_text.replace(',', '.')
        return float(cleaned_text)
    except (ValueError, TypeError):
        current_app.logger.warning(f"clean_number gagal mengubah '{text}'")
        return 0.0

def clean_string(text):
    """Membersihkan string nama perusahaan untuk perbandingan yang andal."""
    if not text: return ""
    
    if ':' in text: text = text.split(':', 1)[1]
    text = text.upper()
    text = re.sub(r'[^A-Z\s]', '', text) # Hanya sisakan huruf dan spasi
    text = re.sub(r'\b(PT|CV|TBK|PERSERO|PERUM|UD)\b', '', text)
    
    words = [word for word in text.split() if len(word) > 2]
    return " ".join(words).strip()

def extract_faktur_info(raw_text):
    """Mengekstrak No. Faktur dan Tanggal dari teks mentah."""
    no_faktur = None
    tanggal_obj = None

    # Ekstrak No. Faktur dengan pola yang lebih umum
    # Format: 010.000-24.00000001
    faktur_match = re.search(r'(\d{3})\.?(\d{3})-?(\d{2})\.?(\d{8})', raw_text)
    if faktur_match:
        no_faktur = f"{faktur_match.group(1)}.{faktur_match.group(2)}-{faktur_match.group(3)}.{faktur_match.group(4)}"
        current_app.logger.info(f"Nomor Faktur ditemukan: {no_faktur}")

    # Ekstraksi Tanggal
    tanggal_match = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", raw_text)
    if tanggal_match:
        hari, bulan_str, tahun = tanggal_match.groups()
        bulan_map = {
            "januari": "January", "februari": "February", "maret": "March", "april": "April",
            "mei": "May", "juni": "June", "juli": "July", "agustus": "August", "september": "September",
            "oktober": "October", "november": "November", "desember": "December"
        }
        bulan_inggris = bulan_map.get(bulan_str.lower())
        if bulan_inggris:
            try:
                tanggal_obj = datetime.strptime(f"{hari} {bulan_inggris} {tahun}", "%d %B %Y").date()
                current_app.logger.info(f"Tanggal ditemukan: {tanggal_obj}")
            except ValueError:
                pass
    
    return no_faktur, tanggal_obj

def extract_classification_and_parties(raw_text, pt_utama):
    """Menentukan jenis pajak dan memisahkan blok teks penjual/pembeli."""
    pt_clean = clean_string(pt_utama)
    # Keyword pemisah yang lebih andal
    parts = re.split(r"pembeli\s+barang\s+kena\s+pajak", raw_text, flags=re.IGNORECASE | re.DOTALL)
    
    if len(parts) < 2:
        current_app.logger.warning("Keyword 'Pembeli Barang Kena Pajak' tidak ditemukan.")
        return None, None, None

    blok_sebelum, blok_pembeli = parts
    
    # Blok penjual adalah semua teks sebelum blok pembeli
    penjual_match = re.search(r"pengusaha\s+kena\s+pajak", blok_sebelum, flags=re.IGNORECASE | re.DOTALL)
    blok_penjual = blok_sebelum[penjual_match.end():] if penjual_match else blok_sebelum

    if any(fuzz.ratio(clean_string(line), pt_clean) > 75 for line in blok_pembeli.splitlines()):
        return 'PPN_MASUKAN', blok_penjual, blok_pembeli
    elif any(fuzz.ratio(clean_string(line), pt_clean) > 75 for line in blok_penjual.splitlines()):
        return 'PPN_KELUARAN', blok_pembeli, blok_penjual

    return None, None, None

def extract_rekanan_details(blok_rekanan):
    """Mengekstrak Nama dan NPWP dari blok teks rekanan."""
    nama = "Tidak Ditemukan"
    npwp = "Tidak Ditemukan"

    # Ekstraksi Nama
    nama_match = re.search(r"Nama\s*:\s*([^\n]+)", blok_rekanan, re.IGNORECASE)
    if nama_match:
        nama = nama_match.group(1).strip()

    # Ekstraksi NPWP
    npwp_match = re.search(r"NPWP\s*:\s*([\d.,-]+)", blok_rekanan, re.IGNORECASE)
    if npwp_match:
        digits = re.sub(r'\D', '', npwp_match.group(1))
        if len(digits) >= 15:
            npwp15 = digits[:15]
            npwp = f"{npwp15[:2]}.{npwp15[2:5]}.{npwp15[5:8]}.{npwp15[8]}.{npwp15[9:12]}.{npwp15[12:15]}"

    return nama, npwp

def extract_financials(raw_text):
    """Mengekstrak DPP dan PPN dari teks mentah."""
    dpp = 0.0
    ppn = 0.0

    # Cari Total DPP
    dpp_match = re.search(r"Dasar\s+Pengenaan\s+Pajak\s*[:\s]*Rp?([\d.,]+)", raw_text, re.IGNORECASE)
    if dpp_match:
        dpp = clean_number(dpp_match.group(1))
    
    # Cari Total PPN
    ppn_match = re.search(r"Total\s+PPN\s*[:=\s]*Rp?([\d.,]+)", raw_text, re.IGNORECASE)
    if ppn_match:
        ppn = clean_number(ppn_match.group(1))
    
    # Fallback: Jika PPN 0 tapi DPP ada, hitung PPN 11%
    if dpp > 0 and ppn == 0:
        ppn = round(dpp * 0.11, 2)
        current_app.logger.info(f"PPN dihitung dari DPP (11%): {ppn}")
        
    return dpp, ppn

def save_preview_image(pil_image, page_num):
    """Menyimpan gambar preview dan mengembalikan nama filenya."""
    buffer = BytesIO()
    pil_image.convert("RGB").save(buffer, format="JPEG", quality=75)
    img_bytes = buffer.getvalue()
    img_hash = hashlib.md5(img_bytes).hexdigest()
    
    filename = f"{img_hash}_page_{page_num}.jpg"
    filepath = current_app.root_path[:-4] + f"/{current_app.config['UPLOAD_FOLDER']}/{filename}"
    
    if not os.path.exists(filepath):
        with open(filepath, 'wb') as f:
            f.write(img_bytes)
    return filename