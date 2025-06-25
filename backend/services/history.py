# services/history.py

from flask import jsonify
from models import PpnMasukan, PpnKeluaran

def get_history():
    masukan = PpnMasukan.query.all()
    keluaran = PpnKeluaran.query.all()

    def serialize(row, jenis):
        return {
            "id": row.id,
            "jenis": jenis,
            "no_faktur": row.no_faktur,
            "nama_lawan_transaksi": row.nama_lawan_transaksi,
            "tanggal": row.tanggal.strftime("%Y-%m-%d"),
        }

    hasil = [serialize(r, "masukan") for r in masukan] + [
        serialize(r, "keluaran") for r in keluaran
    ]
    return jsonify(hasil), 200
