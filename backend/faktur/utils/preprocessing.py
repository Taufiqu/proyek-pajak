# utils/preprocessing.py

import os
import cv2
import hashlib
from io import BytesIO
from PIL import Image

def preprocess_for_ocr(img):
    """Convert BGR → Grayscale + Adaptive Threshold (binarization)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    return thresh

def simpan_preview_image(pil_image, halaman_ke, upload_folder, original_filename):
    """
    Convert image to JPG, generate unique name via hash, save ke disk
    """
    pil_image = pil_image.convert("RGB")
    buffer = BytesIO()
    pil_image.save(buffer, format="JPEG", quality=80)
    img_bytes = buffer.getvalue()
    img_hash = hashlib.md5(img_bytes).hexdigest()
    filename = f"{img_hash}_halaman_{halaman_ke}.jpg"
    filepath = os.path.join(upload_folder, filename)

    if not os.path.exists(filepath):
        with open(filepath, "wb") as f:
            f.write(img_bytes)
        print(f"[📸 PREVIEW DISIMPAN] {filename}")
    else:
        print(f"[📎 PREVIEW SUDAH ADA] {filename}")

    return filename
