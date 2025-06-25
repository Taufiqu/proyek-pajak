import React, { useState, useEffect } from 'react';
import { getLaporan, getExportUrl, formatRupiah } from '../services/api';

const LaporanPage = () => {
    const [laporanData, setLaporanData] = useState([]);
    const [jenisLaporan, setJenisLaporan] = useState('ppn_masukan');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLaporan = async () => {
            setLoading(true);
            try {
                const data = await getLaporan(jenisLaporan);
                setLaporanData(data);
            } catch (error) {
                console.error("Gagal mengambil data laporan:", error);
                setLaporanData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchLaporan();
    }, [jenisLaporan]);

    const handleExport = () => {
      const url = getExportUrl(jenisLaporan);
      window.open(url, '_blank');
    };

    const renderTable = () => {
        if (loading) return <p>Memuat data...</p>;
        if (laporanData.length === 0) return <p>Tidak ada data untuk ditampilkan.</p>;

        const headers = jenisLaporan === 'bukti_setor' 
            ? ['Tanggal', 'Kode Setor', 'Jumlah'] 
            : ['Tanggal', 'No. Faktur', 'Nama Lawan Transaksi', 'DPP', 'PPN'];

        return (
            <table>
                <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                    {laporanData.map(item => (
                        <tr key={item.id}>
                            {jenisLaporan === 'bukti_setor' ? (
                                <><td>{item.tanggal}</td><td>{item.kode_setor}</td><td>{formatRupiah(item.jumlah)}</td></>
                            ) : (
                                <><td>{item.tanggal}</td><td>{item.no_faktur}</td><td>{item.nama_lawan_transaksi}</td><td>{formatRupiah(item.dpp)}</td><td>{formatRupiah(item.ppn)}</td></>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Laporan Data Pajak</h2>
                <div className="laporan-controls">
                    <select value={jenisLaporan} onChange={(e) => setJenisLaporan(e.target.value)}>
                        <option value="ppn_masukan">PPN Masukan</option>
                        <option value="ppn_keluaran">PPN Keluaran</option>
                        <option value="bukti_setor">Bukti Setor</option>
                    </select>
                    <button className="button" onClick={handleExport} disabled={laporanData.length === 0}>
                        Download Excel
                    </button>
                </div>
                <div className="table-container">{renderTable()}</div>
            </div>
        </div>
    );
};

export default LaporanPage;