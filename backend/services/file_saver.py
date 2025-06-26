from flask import jsonify
from datetime import datetime
from decimal import Decimal
from models import PpnMasukan, PpnKeluaran  # asumsi lo udah pindahin model ke models.py

def save_invoice_data(data, db):
    # langsung ambil jenis_pajak dari field eksplisit
    jenis_pajak = data.get("klasifikasi") or "PPN_KELUARAN"  # fallback default

    # validasi field penting
    required_fields = [
        "no_faktur", "tanggal", "npwp_lawan_transaksi",
        "nama_lawan_transaksi", "keterangan", "dpp", "ppn"
    ]
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Field '{field}' wajib diisi.")

    try:
        tanggal_obj = datetime.strptime(data["tanggal"], "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Format tanggal tidak valid. Gunakan YYYY-MM-DD.")

    bulan_str = data.get("bulan") or tanggal_obj.strftime("%B")
    model_to_use = PpnMasukan if jenis_pajak == "PPN_MASUKAN" else PpnKeluaran

    existing = db.session.execute(
        db.select(model_to_use).filter_by(no_faktur=data["no_faktur"])
    ).scalar_one_or_none()
    if existing:
        raise ValueError(f"Faktur '{data['no_faktur']}' sudah ada.")

    record = model_to_use(
        bulan=bulan_str,
        tanggal=tanggal_obj,
        keterangan=data["keterangan"],
        npwp_lawan_transaksi=data["npwp_lawan_transaksi"],
        nama_lawan_transaksi=data["nama_lawan_transaksi"],
        no_faktur=data["no_faktur"],
        dpp=Decimal(str(data["dpp"])),
        ppn=Decimal(str(data["ppn"])),
    )

    db.session.add(record)