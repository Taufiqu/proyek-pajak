# services/delete.py

from flask import jsonify
from models import PpnMasukan, PpnKeluaran
from models import db  # penting! karena lo butuh akses session

def delete_faktur(jenis, id):
    model = PpnMasukan if jenis.lower() == "masukan" else PpnKeluaran
    faktur = db.session.get(model, id)

    if not faktur:
        return jsonify(message="Data tidak ditemukan"), 404

    db.session.delete(faktur)
    db.session.commit()
    return jsonify(message="Faktur berhasil dihapus!"), 200
