import re
from thefuzz import fuzz
from shared_utils.text_utils import clean_string

def extract_jenis_pajak(raw_text, pt_utama):
    print("[DEBUG] Mulai extract_jenis_pajak...")
    pt_clean = clean_string(pt_utama)

    # UBAH DI SINI: Jadikan "Barang" opsional dengan (Barang\s+)?
    # Ini akan cocok dengan "Pembeli Barang Kena Pajak" DAN "Pembeli Kena Pajak"
    splitter_pattern = r"Pembeli\s+(?:Barang\s+)?Kena\s+Pajak"
    parts = re.split(splitter_pattern, raw_text, flags=re.IGNORECASE)

    if len(parts) < 2:
        print(
            "[DEBUG] ❌ Bagian 'Pembeli Kena Pajak' tidak ditemukan, fallback ke full text."
        )
        for line in raw_text.splitlines():
            # Menggunakan pencarian nama PT yang sudah dibersihkan untuk akurasi lebih baik
            if (
                fuzz.ratio(clean_string(line), pt_clean) > 80
            ):  # Sedikit menaikkan rasio untuk fallback
                print(f"[DEBUG] ✅ Ditemukan nama PT utama di full text → PPN MASUKAN")
                return "PPN_MASUKAN", "", raw_text
        print("[DEBUG] ❌ Nama PT utama tidak ditemukan di fallback.")
        return None, None, None

    blok_penjual, blok_pembeli = parts
    print("[DEBUG] Bagian pembeli dan penjual ditemukan.")

    for line in blok_pembeli.splitlines():
        if fuzz.ratio(clean_string(line), pt_clean) > 70:
            print(f"[DEBUG] ✅ Nama PT cocok di blok pembeli: {line}")
            return "PPN_MASUKAN", blok_penjual, blok_pembeli

    for line in blok_penjual.splitlines():
        if fuzz.ratio(clean_string(line), pt_clean) > 70:
            print(f"[DEBUG] ✅ Nama PT cocok di blok penjual: {line}")
            return "PPN_KELUARAN", blok_pembeli, blok_penjual

    print("[DEBUG] ❌ Nama PT tidak cocok di kedua blok.")
    return None, None, None

