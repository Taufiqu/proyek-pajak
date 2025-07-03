import time
from PIL import Image
import numpy as np
import cv2
from pdf2image import convert_from_path
from flask import current_app
from .ocr_engine import OCR_READER
from .spellcheck import correct_spelling
from shared_utils.text_utils import clean_transaction_value, fuzzy_month_match
from shared_utils.file_utils import allowed_file, is_valid_image, is_image_file
from .helpers import simpan_preview_image, preprocess_for_ocr
from .parsing.tanggal import parse_tanggal
from .parsing.jumlah import parse_jumlah
from .parsing.kode_setor import parse_kode_setor

def _extract_data_from_image(pil_image, upload_folder, page_num=1):
    start_total = time.time()
    preview_filename = simpan_preview_image(pil_image, upload_folder)

    img_cv = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    MAX_WIDTH = 1000
    if img_cv.shape[1] > MAX_WIDTH:
        ratio = MAX_WIDTH / img_cv.shape[1]
        img_cv = cv2.resize(img_cv, None, fx=ratio, fy=ratio, interpolation=cv2.INTER_AREA)

    processed_img = preprocess_for_ocr(img_cv)
    ocr_results = OCR_READER.readtext(processed_img, detail=1, paragraph=False)

    cleaned_ocr = [res[1].strip().lower() for res in ocr_results if len(res[1].strip()) >= 3]
    all_text_blocks = [correct_spelling(text) for text in cleaned_ocr]
    full_text_str = " ".join(all_text_blocks)

    kode_setor = parse_kode_setor(full_text_str)
    tanggal_obj = parse_tanggal(all_text_blocks)
    jumlah = parse_jumlah(all_text_blocks)

    return {
        "kode_setor": kode_setor,
        "jumlah": jumlah,
        "tanggal": tanggal_obj.isoformat() if tanggal_obj else None,
        "preview_filename": preview_filename
    }

def extract_bukti_setor_data(filepath, poppler_path):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    if not OCR_READER:
        raise ConnectionError("EasyOCR reader tidak berhasil diinisialisasi.")

    list_of_results = []
    if filepath.lower().endswith('.pdf'):
        all_pages_as_images = convert_from_path(filepath, poppler_path=poppler_path)
        for i, page_image in enumerate(all_pages_as_images):
            result_data = _extract_data_from_image(page_image, upload_folder, i + 1)
            list_of_results.append(result_data)
    else:
        pil_image = Image.open(filepath)
        result_data = _extract_data_from_image(pil_image, upload_folder)
        list_of_results.append(result_data)

    return list_of_results
