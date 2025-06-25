# backend/app/laporan/routes.py

import io
import pandas as pd
from datetime import datetime
from flask import Blueprint, jsonify, send_file
from ..models import PpnMasukan, PpnKeluaran, BuktiSetor
from .. import db

laporan_bp = Blueprint('laporan', __name__, url_prefix='/api/laporan')

@laporan_bp.route('/<jenis_pajak>', methods=['GET'])
def get_laporan(jenis_pajak):
    data = []
    if jenis_pajak == 'ppn_masukan':
        records = db.session.execute(db.select(PpnMasukan).order_by(PpnMasukan.tanggal.desc())).scalars()
        data = [{"id": r.id, "tanggal": r.tanggal.strftime('%Y-%m-%d'), "no_faktur": r.no_faktur, "nama_lawan_transaksi": r.nama_lawan_transaksi, "dpp": float(r.dpp), "ppn": float(r.ppn)} for r in records]
    elif jenis_pajak == 'ppn_keluaran':
        records = db.session.execute(db.select(PpnKeluaran).order_by(PpnKeluaran.tanggal.desc())).scalars()
        data = [{"id": r.id, "tanggal": r.tanggal.strftime('%Y-%m-%d'), "no_faktur": r.no_faktur, "nama_lawan_transaksi": r.nama_lawan_transaksi, "dpp": float(r.dpp), "ppn": float(r.ppn)} for r in records]
    elif jenis_pajak == 'bukti_setor':
        records = db.session.execute(db.select(BuktiSetor).order_by(BuktiSetor.tanggal.desc())).scalars()
        data = [{"id": r.id, "tanggal": r.tanggal.strftime('%Y-%m-%d'), "kode_setor": r.kode_setor, "jumlah": float(r.jumlah)} for r in records]
    
    return jsonify(data)

@laporan_bp.route('/export/<jenis_pajak>', methods=['GET'])
def export_laporan(jenis_pajak):
    model_map = {'ppn_masukan': PpnMasukan, 'ppn_keluaran': PpnKeluaran, 'bukti_setor': BuktiSetor}
    if jenis_pajak not in model_map:
        return "Jenis pajak tidak valid", 400

    Model = model_map[jenis_pajak]
    query = db.session.execute(db.select(Model)).scalars().all()
    if not query:
        return "Tidak ada data untuk diekspor", 404

    # Konversi data ke DataFrame
    df_data = [
        {key: (float(value) if isinstance(value, db.Numeric) else value) for key, value in r.__dict__.items() if not key.startswith('_')}
        for r in query
    ]
    df = pd.DataFrame(df_data)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Laporan')
    output.seek(0)
    
    return send_file(
        output,
        as_attachment=True,
        download_name=f'laporan_{jenis_pajak}_{datetime.now().strftime("%Y%m%d")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )