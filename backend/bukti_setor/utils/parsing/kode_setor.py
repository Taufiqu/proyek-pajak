import re

def parse_kode_setor(full_text):
    rek_patterns = [
        r"(rek|debet|debit)[\s\S]{0,25}(\d[\d\s-]{8,}\d)",
        r"(referensi)[\s\S]{0,15}(\w+)",
        r"(ntpn)[\s\S]{0,15}(\w{16})"
    ]
    for pattern in rek_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            return re.sub(r'[\s.-]', '', match.group(2).strip())
    return None
