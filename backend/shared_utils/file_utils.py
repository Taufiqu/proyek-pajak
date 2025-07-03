# shared_utils/file_utils.py

from PIL import Image

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

import os
import hashlib
from io import BytesIO
from flask import current_app

def simpan_preview_image(pil_image, upload_folder, page_num=1, original_filename="preview"):
    try:
        pil_image = pil_image.convert("RGB")
        buffer = BytesIO()
        pil_image.save(buffer, format="JPEG", quality=85)
        img_bytes = buffer.getvalue()
        img_hash = hashlib.md5(img_bytes).hexdigest()

        safe_name = os.path.splitext(os.path.basename(original_filename))[0]
        filename = f"{safe_name}_hal_{page_num}_{img_hash[:8]}.jpg"
        filepath = os.path.join(upload_folder, filename)

        if not os.path.exists(filepath):
            with open(filepath, "wb") as f:
                f.write(img_bytes)
            current_app.logger.info(f"[📸 PREVIEW DISIMPAN] {filename}")
        else:
            current_app.logger.info(f"[📎 PREVIEW SUDAH ADA] {filename}")

        return filename
    except Exception as e:
        current_app.logger.error(f"[❌ ERROR SIMPAN PREVIEW] {e}")
        return None

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image_file(filename):
    return filename.lower().endswith((".jpg", ".jpeg", ".png"))

def is_valid_image(path):
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:
        return False
