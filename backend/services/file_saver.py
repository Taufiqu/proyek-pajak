from flask import jsonify
from datetime import datetime
from models import PpnMasukan, PpnKeluaran  # asumsi lo udah pindahin model ke models.py

def save_invoice_data(request, db):
    data = request.get_json()
    jenis_pajak = data.get("klasifikasi")
    detail_data = data.get("data")

    if not all([jenis_pajak, detail_data]):
        return jsonify(error="Data tidak lengkap"), 400

    # VALIDASI TANGGAL SEBELUM MENYIMPAN
    tanggal_str = detail_data.get("tanggal")
    if not tanggal_str:
        return (
            jsonify(error="Tanggal tidak boleh kosong. Mohon isi sebelum menyimpan."),
            400,
        )

    try:
        # Coba konversi tanggal, jika gagal akan masuk ke blok except
        tanggal_obj = datetime.strptime(tanggal_str, "%Y-%m-%d").date()

        # Validasi bulan juga, pastikan tidak kosong
        bulan_str = detail_data.get("bulan")
        if not bulan_str:
            # Buat bulan dari tanggal jika kosong
            bulan_str = tanggal_obj.strftime("%B")

        model_to_use = PpnMasukan if jenis_pajak == "PPN_MASUKAN" else PpnKeluaran

        # Cek duplikasi
        existing_record = db.session.execute(
            db.select(model_to_use).filter_by(no_faktur=detail_data["no_faktur"])
        ).scalar_one_or_none()
        if existing_record:
            return (
                jsonify(
                    error=f"Error: Faktur dengan nomor '{detail_data['no_faktur']}' sudah ada."
                ),
                409,
            )

        # Simpan data baru
        new_record = model_to_use(
            bulan=bulan_str,
            tanggal=tanggal_obj,
            keterangan=detail_data["keterangan"],
            npwp_lawan_transaksi=detail_data["npwp_lawan_transaksi"],
            nama_lawan_transaksi=detail_data["nama_lawan_transaksi"],
            no_faktur=detail_data["no_faktur"],
            dpp=detail_data["dpp"],
            ppn=detail_data["ppn"],
        )
        db.session.add(new_record)
        db.session.commit()

        return jsonify(message="Data berhasil disimpan ke database!"), 201

    except ValueError:
        return (
            jsonify(error="Format tanggal tidak valid. Gunakan format YYYY-MM-DD."),
            400,
        )
    except Exception as e:
        # Menangani error lain yang mungkin terjadi
        db.session.rollback()  # Batalkan transaksi jika ada error
        print(f"[ERROR /api/save] {e}")
        return jsonify(error=f"Terjadi kesalahan di server: {e}"), 500

