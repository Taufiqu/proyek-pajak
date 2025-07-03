import re
from shared_utils.text_utils import clean_string

def extract_keterangan(raw_text):
    try:
        start_match = re.search(
            r"Nama\s+Barang\s+Kena\s+Pajak.*?", raw_text, re.IGNORECASE
        )
        end_match = re.search(r"Dasar\s+Pengenaan\s+Pajak", raw_text, re.IGNORECASE)

        if not start_match or not end_match:
            return "Tidak ditemukan"

        block = raw_text[start_match.end() : end_match.start()]
        lines = [line.strip() for line in block.splitlines() if line.strip()]

        cleaned_lines = []
        seen_lines = set()

        # Kata-kata noise umum dari OCR yang tidak relevan
        noise_words = {
            "oh",
            "ka",
            "bah",
            "iai",
            "aa",
            "tr",
            "id",
            "na",
            "in",
            "5",
            "2",
            "3",
            "4",
            "es",
            "po",
            "sz",
        }
        typo_map = {
            "DECA R": "DECANTER",
            "DESAND YCLON": "DESANDING CYCLONE",
            "PESIFIKA -SUA": "SPESIFIKASI SESUAI",
            "MATERI Tera": "MATERIAL",
            "MATER INSTALASI": "MATERIAL INSTALASI",
            "ikurangi": "Dikurangi",  # typo umum
        }

        for line in lines:
            if line in seen_lines:
                continue
            seen_lines.add(line)

            # Normalisasi dasar
            line = re.sub(r"[^\w\s.,:;/\-()Rp]", "", line).strip()

            # Koreksi typo
            for typo, correct in typo_map.items():
                if typo in line:
                    line = line.replace(typo, correct)

            # Hilangkan token noise (kata satuan pendek tak relevan)
            tokens = [tok for tok in line.split() if tok.lower() not in noise_words]
            if not tokens:
                continue

            # Gabung ulang dan tambahkan separator
            cleaned_line = " ".join(tokens).strip()
            if cleaned_line:
                cleaned_lines.append(cleaned_line)

        return " || ".join(cleaned_lines) if cleaned_lines else "Tidak ditemukan"

    except Exception as e:
        print(f"[ERROR extract_keterangan] {e}")
        return "Tidak ditemukan"

