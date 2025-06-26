from flask import jsonify
from datetime import datetime
from models import PpnMasukan, PpnKeluaran  # asumsi lo udah pindahin model ke models.py

def save_invoice_data(data, db):
    jenis_pajak = data.get("klasifikasi")
    detail_data = data.get("data")

    if not all([jenis_pajak, detail_data]):
        raise ValueError("Data tidak lengkap")

    tanggal_str = detail_data.get("tanggal")
    if not tanggal_str:
        raise ValueError("Tanggal tidak boleh kosong")

    try:
        tanggal_obj = datetime.strptime(tanggal_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Format tanggal tidak valid. Gunakan format YYYY-MM-DD.")

    bulan_str = detail_data.get("bulan") or tanggal_obj.strftime("%B")

    model_to_use = PpnMasukan if jenis_pajak == "PPN_MASUKAN" else PpnKeluaran

    existing = db.session.execute(
        db.select(model_to_use).filter_by(no_faktur=detail_data["no_faktur"])
    ).scalar_one_or_none()

    if existing:
        raise ValueError(f"Faktur '{detail_data['no_faktur']}' sudah ada di database.")

    record = model_to_use(
        bulan=bulan_str,
        tanggal=tanggal_obj,
        keterangan=detail_data["keterangan"],
        npwp_lawan_transaksi=detail_data["npwp_lawan_transaksi"],
        nama_lawan_transaksi=detail_data["nama_lawan_transaksi"],
        no_faktur=detail_data["no_faktur"],
        dpp=detail_data["dpp"],
        ppn=detail_data["ppn"],
    )

    db.session.add(record)

