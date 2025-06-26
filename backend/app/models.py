# backend/app/models.py
from . import db # Kita akan membuat 'db' di __init__.py nanti
from datetime import datetime

class PpnMasukan(db.Model):
    __tablename__ = 'ppn_masukan'
    id = db.Column(db.Integer, primary_key=True)
    bulan = db.Column(db.String(20), nullable=False)
    tanggal = db.Column(db.Date, nullable=False)
    keterangan = db.Column(db.Text, nullable=True)
    npwp_lawan_transaksi = db.Column(db.String(100), nullable=False)
    nama_lawan_transaksi = db.Column(db.String(255), nullable=False)
    no_faktur = db.Column(db.String(100), unique=True, nullable=False)
    dpp = db.Column(db.Numeric(15, 2), nullable=False)
    ppn = db.Column(db.Numeric(15, 2), nullable=False)

class PpnKeluaran(db.Model):
    __tablename__ = 'ppn_keluaran'
    id = db.Column(db.Integer, primary_key=True)
    bulan = db.Column(db.String(20), nullable=False)
    tanggal = db.Column(db.Date, nullable=False)
    keterangan = db.Column(db.Text, nullable=True)
    npwp_lawan_transaksi = db.Column(db.String(100), nullable=False)
    nama_lawan_transaksi = db.Column(db.String(255), nullable=False)
    no_faktur = db.Column(db.String(100), unique=True, nullable=False)
    dpp = db.Column(db.Numeric(15, 2), nullable=False)
    ppn = db.Column(db.Numeric(15, 2), nullable=False)

class BuktiSetor(db.Model):
    __tablename__ = 'bukti_setor'
    id = db.Column(db.Integer, primary_key=True)
    tanggal = db.Column(db.Date, nullable=False)
    kode_setor = db.Column(db.String(100), nullable=False)
    jumlah = db.Column(db.Numeric(15, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())