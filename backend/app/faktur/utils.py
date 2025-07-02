# /faktur_project/app/faktur/utils.py

import re
import os
import hashlib
from io import BytesIO
from datetime import datetime
from PIL import Image
from thefuzz import fuzz

def allowed_file(filename):
    """Memeriksa apakah ekstensi file diizinkan."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in {"pdf", "png", "jpg", "jpeg"}

def clean_number(text):
    """Mengonversi string mata uang ke float, menangani berbagai format."""
    if not text:
        return 0.0
    cleaned_text = re.sub(r"[^\d,.-]", "", text).strip()
    try:
        if "," in cleaned_text and "." in cleaned_text:
            cleaned_text = cleaned_text.replace(".", "").replace(",", ".")
        elif "." in cleaned_text and "," not in cleaned_text:
            cleaned_text = cleaned_text.replace(".", "")
        elif "," in cleaned_text:
             cleaned_text = cleaned_text.replace(",", ".")
        return float(cleaned_text)
    except (ValueError, TypeError):
        return 0.0

def clean_string(text):
    """Membersihkan string nama perusahaan untuk perbandingan fuzzy logic."""
    if not text:
        return ""
    if ":" in text:
        text = text.split(":", 1)[1]
    text = text.upper()
    text = re.sub(r"[^A-Z\s]", "", text)
    text = re.sub(r"\b(PT|CV|TBK|PERSERO|PERUM|UD)\b", "", text)
    words = [w for w in text.split() if len(w) > 2]
    return " ".join(words).strip()

def simpan_preview_image(pil_image, halaman_ke, upload_folder):
    """Menyimpan gambar preview dengan nama unik berbasis hash."""
    try:
        pil_image = pil_image.convert("RGB")
        buffer = BytesIO()
        pil_image.save(buffer, format="JPEG", quality=85)
        img_bytes = buffer.getvalue()
        img_hash = hashlib.md5(img_bytes).hexdigest()
        filename = f"preview_{img_hash}_halaman_{halaman_ke}.jpg"
        filepath = os.path.join(upload_folder, filename)
        if not os.path.exists(filepath):
            with open(filepath, "wb") as f:
                f.write(img_bytes)
        return filename
    except Exception as e:
        print(f"[ERROR] Gagal menyimpan preview: {e}")
        return None

def extract_faktur_tanggal(raw_text):
    """Mengekstrak No. Faktur dan Tanggal dari teks mentah."""
    no_faktur, tanggal_obj = None, None
    tolerant_pattern = r"0[0-9a-zA-Z]{2}[-.\s]?[0-9a-zA-Z]{3}[-.\s]?[0-9a-zA-Z]{2}[-.\s]?[0-9a-zA-Z]{8,}"
    all_candidates = re.findall(tolerant_pattern, raw_text, re.IGNORECASE)
    valid_candidates = [cand for cand in all_candidates if "npwp" not in raw_text[max(0, raw_text.find(cand)-20):raw_text.find(cand)].lower()]
    if valid_candidates:
        candidate_str = valid_candidates[0]
        corrections = {"O": "0", "o": "0", "I": "1", "l": "1", "S": "5", "s": "5", "B": "8", "g": "9"}
        normalized_str = "".join(corrections.get(char, char) for char in candidate_str)
        digits_only = re.sub(r"\D", "", normalized_str)[:16]
        if len(digits_only) >= 14:
            no_faktur = f"{digits_only[:3]}.{digits_only[3:6]}-{digits_only[6:8]}.{digits_only[8:16]}"

    bulan_list = "Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember"
    pola_tgl = rf"(\d{{1,2}})\s+({bulan_list})\s+(\d{{4}})"
    matches = re.findall(pola_tgl, raw_text, re.IGNORECASE)
    if matches:
        hari, bulan, tahun = matches[-1]
        bulan_map = {b.lower(): i+1 for i, b in enumerate(bulan_list.split('|'))}
        try:
            tanggal_obj = datetime(int(tahun), bulan_map[bulan.lower()], int(hari))
        except (ValueError, KeyError): pass
    return no_faktur, tanggal_obj

def extract_jenis_pajak(raw_text, pt_utama):
    """Menentukan jenis pajak dengan logika pembagian blok dan fuzzy matching."""
    pt_clean = clean_string(pt_utama)
    splitter_pattern = r"Pembel[il]\s*.*?Kena\s*Pajak"
    parts = re.split(splitter_pattern, raw_text, flags=re.IGNORECASE | re.DOTALL)

    if len(parts) >= 2:
        blok_penjual, blok_pembeli = parts[0], parts[1]
        if fuzz.partial_ratio(clean_string(blok_pembeli), pt_clean) > 75:
            return "PPN_MASUKAN", blok_penjual
        if fuzz.partial_ratio(clean_string(blok_penjual), pt_clean) > 75:
            return "PPN_KELUARAN", blok_pembeli
    
    lines = raw_text.splitlines()
    for line in lines:
        if fuzz.ratio(clean_string(line), pt_clean) > 80:
            return "PPN_MASUKAN", "N/A"
    
    return None, None
    
def extract_npwp_nama_rekanan(blok_rekanan):
    """Mengekstrak Nama dan NPWP dari blok teks rekanan."""
    if blok_rekanan == "N/A":
        return "Periksa Manual", "Periksa Manual"
    nama, npwp = "Tidak Ditemukan", "Tidak Ditemukan"
    lines = blok_rekanan.splitlines()
    for line in lines:
        if "nama" in line.lower():
            nama_candidate = line.split(':')[-1].strip()
            if len(nama_candidate) > 3: nama = nama_candidate
        if "npwp" in line.lower():
            digits = re.sub(r'\D', '', line)
            if len(digits) >= 15:
                npwp15 = digits[:15]
                npwp = f"{npwp15[:2]}.{npwp15[2:5]}.{npwp15[5:8]}.{npwp15[8]}-{npwp15[9:12]}.{npwp15[12:15]}"
    
    if nama == "Tidak Ditemukan" and lines:
        first_line_cleaned = lines[0].strip()
        if len(first_line_cleaned) > 5 and "pengusaha" not in first_line_cleaned.lower():
            nama = first_line_cleaned
            
    return nama, npwp

def extract_dpp_ppn(raw_text):
    """
    Mengekstrak DPP dan PPN.
    [PENYEMPURNAAN V2] Regex dibuat lebih toleran terhadap newline (\n)
    antara label dan nilai, meningkatkan akurasi pada hasil OCR yang tidak rapi.
    """
    dpp, ppn = 0.0, 0.0

    dpp_pattern = r"Dasar\s+Pengenaan\s+Pajak\s*[:=\s]*Rp?[\s\n]*([\d.,]+)"
    ppn_pattern = r"(?:Total\s+PPN|PPN\s*=\s*|PPN\s+Terutang)\s*[:=\s]*Rp?[\s\n]*([\d.,]+)"

    dpp_match = re.search(dpp_pattern, raw_text, re.IGNORECASE)
    if dpp_match:
        dpp = clean_number(dpp_match.group(1))
    
    ppn_match = re.search(ppn_pattern, raw_text, re.IGNORECASE)
    if ppn_match:
        ppn = clean_number(ppn_match.group(1))
    
    # Fallback logic tetap dipertahankan
    elif dpp > 0 and ppn == 0:
        ppn = round(dpp * 0.11, 2)
        
    return dpp, ppn

def extract_keterangan(raw_text):

    try:
        # Penanda awal tetap sama: mencari header tabel deskripsi
        start_match = re.search(r"Harga\s+Jual/Penggantian|Nama\s+Barang\s+Kena\s+Pajak", raw_text, re.IGNORECASE)
        
        # Penanda akhir juga tetap sama: mencari awal bagian total
        end_match = re.search(r"Dasar\s+Pengenaan\s+Pajak|Jumlah\s+Harga\s+Jual|Total\s+DPP", raw_text, re.IGNORECASE)
        
        if start_match and end_match:
            # Ambil blok teks di antara dua penanda
            block = raw_text[start_match.end() : end_match.start()]
            
            cleaned_lines = []
            for line in block.splitlines():
                clean_line = line.strip()
                if not clean_line:
                    continue
                if (re.search(r'\d[\d.,\s]*x\s*\d', clean_line) or 
                    re.match(r'^[\d.,\s]+$', clean_line) or
                    clean_line.lower() in ["termin", "potongan harga", "uang muka"]):
                    continue
                
                cleaned_lines.append(clean_line)

            # Gabungkan baris-baris yang sudah bersih
            return " || ".join(cleaned_lines) if cleaned_lines else "Tidak ditemukan"

    except Exception as e:
        print(f"[ERROR] Gagal mengekstrak keterangan: {e}")
        return "Gagal mengekstrak keterangan"
        
    return "Tidak ditemukan"