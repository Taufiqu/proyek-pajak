import re
from shared_utils.text_utils import clean_string

def extract_npwp_nama_rekanan(blok_text):
    """
    Menangkap nama dan NPWP rekanan dari blok teks pembeli/penjual
    dengan logika pembersihan noise yang lebih baik.
    """
    nama = "Tidak Ditemukan"
    npwp = "Tidak Ditemukan"
    lines = blok_text.splitlines()
    nama_ditemukan = False

    for line in lines:
        # line_clean = line.lower().strip()
        line_lower = line.lower()

        # --- LOGIKA PENCARIAN NAMA YANG DISEMPURNAKAN ---
        # 1. Hanya proses jika nama belum ditemukan DAN baris mengandung 'nama'
        if not nama_ditemukan and "nama" in line_lower:

            # 2. Aturan Pengecualian: Abaikan jika ini adalah header tabel
            if "barang" in line_lower or "jasa" in line_lower or "pajak" in line_lower:
                continue  # Lanjut ke baris berikutnya

            # Ini akan membuang semua noise di awalan seperti "25 Nama".
            match = re.search(r"nama\s*:?", line, re.IGNORECASE)
            if match:
                # Ambil sisa string setelah 'nama :' ditemukan
                nama_candidate = line[match.end() :].strip()
            else:
                # Fallback jika 'nama' ada tapi formatnya aneh (tanpa spasi/titik dua)
                nama_candidate = re.sub(
                    r".*nama", "", line, flags=re.IGNORECASE
                ).strip()

            # Pisahkan menjadi kata-kata, lalu buang kata-kata pendek dari akhir.
            words = nama_candidate.split()
            while words and not words[-1].isupper():
                words.pop()

            nama_candidate = " ".join(words)

            if len(nama_candidate) > 4:
                nama = nama_candidate
                nama_ditemukan = True  # Kunci: Berhenti mencari nama setelah ini

        # Ekstraksi NPWP (logika Anda sudah cukup baik)
        if "npwp" in line_lower:
            digits = re.sub(r"\D", "", line)
            if len(digits) >= 15:
                npwp15 = digits[:15]
                npwp = f"{npwp15[:2]}.{npwp15[2:5]}.{npwp15[5:8]}.{npwp15[8]}-{npwp15[9:12]}.{npwp15[12:15]}"

    # Pastikan nama yang dikembalikan tidak kosong
    return nama.strip() if nama.strip() else "Tidak Ditemukan", npwp.strip()

