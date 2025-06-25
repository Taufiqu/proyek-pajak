# Gunakan Python base image
FROM python:3.11-slim

# Install poppler dan tesseract untuk OCR
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Salin semua file project
COPY . .

# Install dependency
RUN pip install --no-cache-dir -r requirements.txt

# Jalankan app
CMD ["python", "app.py"]
