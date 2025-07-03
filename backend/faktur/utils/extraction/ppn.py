import re
from shared_utils.text_utils import clean_number, format_currency

def extract_ppn(raw_text, dpp, override_ppn=None):
    try:
        if override_ppn:
            print(f"[✅ Override PPN] {override_ppn:,.2f}")
            return override_ppn, format_currency(override_ppn)

        ppn = 0.0
        harga_jual = None
        angka_terdeteksi = []

        # Cek 'Total PPN' di seluruh teks (lebih andal)
        total_ppn_match = re.search(
            r"Total\s*PPN\s*[:\-]?\s*([\d.,]+)", raw_text, re.IGNORECASE
        )
        if total_ppn_match:
            ppn_val = clean_number(total_ppn_match.group(1))
            print(f"[✅ PPN by 'Total PPN'] {ppn_val:,.2f}")
            return ppn_val, format_currency(ppn_val)

        # Cari di dalam baris-baris relevan
        lines = raw_text.splitlines()
        for line in lines:
            text = line.lower()

            # --- PERUBAHAN DI SINI ---
            # Tambahkan kondisi untuk mengabaikan baris yang mengandung teks hukum
            is_legal_text = "pasal" in text or "uu" in text or "keterangan" in text

            if "ppn" in text and "ppnbm" not in text and not is_legal_text:
                match = re.search(r"([\d.,]+)", line)
                if match:
                    ppn = round(clean_number(match.group(1)))
                    print(f"[✅ PPN by keyword] {ppn:,} ← {line}")
                    return ppn, format_currency(ppn)

            # Heuristik lainnya (tidak ada perubahan)
            if "harga jual" in text or "penggantian" in text:
                match = re.search(r"([\d.,]+)", line)
                if match:
                    harga_jual = clean_number(match.group(1))

            match_all = re.findall(r"([\d.,]{7,})", line)
            for m in match_all:
                angka_terdeteksi.append(clean_number(m))

        # Fallback jika PPN tidak ditemukan dengan cara di atas
        if harga_jual and dpp and harga_jual > dpp:
            ppn_calculated = round(harga_jual - dpp)
            # Validasi sederhana: PPN harus sekitar 11% dari DPP
            if abs(ppn_calculated - (dpp * 0.11)) < (dpp * 0.01):
                print(f"[🟠 Fallback PPN = Harga Jual - DPP] {ppn_calculated:,}")
                return ppn_calculated, format_currency(ppn_calculated)

        if angka_terdeteksi and dpp > 0:
            kandidat_harga_jual = max(angka_terdeteksi)
            if kandidat_harga_jual > dpp:
                ppn_calculated = round(kandidat_harga_jual - dpp)
                if abs(ppn_calculated - (dpp * 0.11)) < (dpp * 0.01):
                    print(f"[🔵 PPN dari Max-Angka - DPP] {ppn_calculated:,}")
                    return ppn_calculated, format_currency(ppn_calculated)

        print("[⚠️ PPN tidak dapat ditentukan, fallback ke 11% dari DPP]")
        ppn_fallback = round(dpp * 0.11)
        return ppn_fallback, format_currency(ppn_fallback)

    except Exception as e:
        print(f"[ERROR extract_ppn] {e}")
        return 0.0, format_currency(0.0)

