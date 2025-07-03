import re
from datetime import datetime
from shared_utils.text_utils import fuzzy_month_match
# utils/parsing/tanggal.py
def parse_tanggal(text_blocks):
    date_pattern_fuzzy = re.compile(r"(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4})", re.IGNORECASE)
    date_pattern_slash = re.compile(r"(\d{1,2})[-/ ](\d{1,2})[-/ ](\d{4})")

    all_months = {
        "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
        "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "nopember": 11, "desember": 12
    }
    all_months.update({k.capitalize(): v for k, v in all_months.items()})
    all_months.update({k[:3]: v for k, v in all_months.items()})

    for text in text_blocks:
        match_fuzzy = date_pattern_fuzzy.search(text)
        if match_fuzzy:
            day, month_ocr, year = match_fuzzy.groups()
            best_match = fuzzy_month_match(month_ocr, all_months)
            if best_match:
                try:
                    return datetime(int(year), all_months[best_match], int(day)).date()
                except ValueError:
                    continue
        match_slash = date_pattern_slash.search(text)
        if match_slash:
            try:
                day, month, year = map(int, match_slash.groups())
                return datetime(year, month, day).date()
            except ValueError:
                continue
    return None
