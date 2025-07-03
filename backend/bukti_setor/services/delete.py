# bukti_setor/services/delete.py

from flask import jsonify
from models import db  # penting! karena lo butuh akses session

def delete_bukti_setor(id):
    from models import BuktiSetor  # import di sini biar tidak circular
    bukti = db.session.get(BuktiSetor, id)

    if not bukti:
        return jsonify(message="Data bukti setor tidak ditemukan"), 404

    db.session.delete(bukti)
    db.session.commit()
    return jsonify(message="Bukti setor berhasil dihapus!"), 200
