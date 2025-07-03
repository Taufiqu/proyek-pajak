# shared_utils/text_utils.py

import re
import textdistance

def clean_number(text):
    if not text:
        return 0.0
    cleaned_text = re.sub(r"[^\d,.-]", "", text).strip()
    try:
        if "," in cleaned_text and "." in cleaned_text:
            cleaned_text = cleaned_text.replace(".", "").replace(",", ".")
        elif "." in cleaned_text and "," not in cleaned_text:
            cleaned_text = cleaned_text.replace(".", "")
        return float(cleaned_text)
    except ValueError:
        return 0.0

def format_currency(value, with_symbol=True):
    try:
        value = float(value)
        formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"Rp {formatted}" if with_symbol else formatted
    except:
        return "Rp 0,00" if with_symbol else "0,00"

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
        return final_val if final_val > 1000 else None
    except (ValueError, TypeError):
        return None

def clean_string(text):
    if not text:
        return ""
    if ":" in text:
        text = text.split(":", 1)[1]
    text = text.upper()
    text = re.sub(r"[^A-Z\s]", "", text)
    text = re.sub(r"\b(PT|CV|TBK|PERSERO|PERUM|UD)\b", "", text)
    words = [w for w in text.split() if len(w) > 2]
    return " ".join(words).strip()

def fuzzy_month_match(input_month, all_months):
    matches = [m for m in all_months if textdistance.levenshtein.normalized_similarity(input_month.lower(), m.lower()) > 0.6]
    return matches[0] if matches else None
