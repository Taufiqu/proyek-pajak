# faktur/services/delete.py

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

def delete_bukti_setor(id):
    from models import BuktiSetor  # import di sini biar tidak circular
    bukti = db.session.get(BuktiSetor, id)

    if not bukti:
        return jsonify(message="Data bukti setor tidak ditemukan"), 404

    db.session.delete(bukti)
    db.session.commit()
    return jsonify(message="Bukti setor berhasil dihapus!"), 200
