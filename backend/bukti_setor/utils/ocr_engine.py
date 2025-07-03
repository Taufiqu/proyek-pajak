import easyocr

try:
    print("Inisialisasi EasyOCR Reader...")
    OCR_READER = easyocr.Reader(['id', 'en'], gpu=True)
    print("✅ EasyOCR Reader berhasil diinisialisasi.")
except Exception as e:
    print(f"❌ Error initializing EasyOCR: {e}")
    OCR_READER = None
