import re
from shared_utils.text_utils import clean_number, format_currency

def extract_dpp(raw_text):
    try:
        dpp = 0.0
        dpp_line = ""

        lines = raw_text.splitlines()
        for line in lines:
            if "dasar pengenaan pajak" in line.lower():
                numbers = re.findall(r"[\d.,]+", line)
                if numbers:
                    last_number = numbers[-1]
                    dpp = clean_number(last_number)
                    dpp_line = line
                    print(f"[✅ DPP dari baris] {dpp:,.2f} ← {line}")
                    break

        # Ambil semua angka besar
        all_numbers = re.findall(r"[\d.]{1,3}(?:[.,]\d{3}){2,}", raw_text)
        candidates = [
            clean_number(n) for n in all_numbers if clean_number(n) > 10_000_000
        ]

        if dpp > 0:
            # Jika ada kandidat yang terlalu jauh dari DPP, abaikan override
            if candidates:
                max_val = max(candidates)
                if max_val > dpp * 5:
                    print(
                        f"[❌ Abaikan fallback DPP] {max_val:,.2f} terlalu jauh dari {dpp:,.2f}"
                    )
                    return dpp, format_currency(dpp), None, None

            return dpp, format_currency(dpp), None, None

        # Kalau tidak ada "Dasar Pengenaan Pajak", fallback ke kandidat
        if candidates:
            fallback = max(candidates)
            print(f"[⚠️ Fallback DPP] {fallback:,.2f}")
            return fallback, format_currency(fallback), None, None

        return 0.0, format_currency(0.0), None, None

    except Exception as e:
        print(f"[ERROR extract_dpp] {e}")
        return 0.0, format_currency(0.0), None, None

