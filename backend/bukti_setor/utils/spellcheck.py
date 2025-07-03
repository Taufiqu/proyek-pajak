from spellchecker import SpellChecker
import os

SPELL = SpellChecker(language=None, case_sensitive=False)
try:
    kamus_path = os.path.join(os.path.dirname(__file__), 'kamus_indonesia.txt')
    SPELL.word_frequency.load_text_file(kamus_path)
    print(f"Kamus Indonesia berhasil dimuat dari: {kamus_path}")
except Exception as e:
    print(f"Error memuat kamus Indonesia: {e}")

def correct_spelling(text):
    return ' '.join([SPELL.correction(w) if w not in SPELL and SPELL.correction(w) else w for w in text.split()])
