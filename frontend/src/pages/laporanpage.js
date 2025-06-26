import React, { useState, useEffect } from 'react';
import { getLaporan, getExportUrl, formatRupiah } from '../services/api';

const LaporanPage = () => {
    const [laporanData, setLaporanData] = useState([]);
    const [jenisLaporan, setJenisLaporan] = useState('ppn_masukan');
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        const fetchLaporan = async () => {
            setLoading(true);
            try {
                const data = await getLaporan(jenisLaporan);
                setLaporanData(data);
                setSelectedIds([]);
            } catch (error) {
                console.error("Gagal mengambil data laporan:", error);
                setLaporanData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchLaporan();
    }, [jenisLaporan]);

    const handleExport = async () => {
        const url = getExportUrl(jenisLaporan);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan_${jenisLaporan}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        const confirmed = window.confirm("Apakah kamu yakin ingin menghapus data terpilih?");
        if (!confirmed) return;

        try {
            await fetch(`/api/laporan/${jenisLaporan}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            setLaporanData(prev => prev.filter(item => !selectedIds.includes(item.id)));
            setSelectedIds([]);
            alert("Data berhasil dihapus");
        } catch (err) {
            console.error("Gagal menghapus data:", err);
            alert("Terjadi kesalahan saat menghapus.");
        }
    };

    const renderTable = () => {
        if (loading) return <p>Memuat data...</p>;
        if (laporanData.length === 0) return <p>Tidak ada data untuk ditampilkan.</p>;

        const headers = jenisLaporan === 'bukti_setor'
            ? ['Tanggal', 'Kode Setor', 'Jumlah']
            : ['Tanggal', 'No. Faktur', 'Nama Lawan Transaksi', 'DPP', 'PPN'];

        return (
            <table>
                <thead>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                onChange={(e) => {
                                    const all = e.target.checked;
                                    setSelectedIds(all ? laporanData.map(i => i.id) : []);
                                }}
                                checked={laporanData.length > 0 && selectedIds.length === laporanData.length}
                            />
                        </th>
                        {headers.map(h => <th key={h}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {laporanData.map(item => (
                        <tr key={item.id}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item.id)}
                                    onChange={() => toggleSelect(item.id)}
                                />
                            </td>
                            {jenisLaporan === 'bukti_setor' ? (
                                <>
                                    <td>{item.tanggal}</td>
                                    <td>{item.kode_setor}</td>
                                    <td>{formatRupiah(item.jumlah)}</td>
                                </>
                            ) : (
                                <>
                                    <td>{item.tanggal}</td>
                                    <td>{item.no_faktur}</td>
                                    <td>{item.nama_lawan_transaksi}</td>
                                    <td>{formatRupiah(item.dpp)}</td>
                                    <td>{formatRupiah(item.ppn)}</td>
                                </>
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
                    <div>
                        <button className="button" onClick={handleExport} disabled={laporanData.length === 0}>
                            Download Excel
                        </button>
                        <button className="button red" onClick={handleDeleteSelected} disabled={selectedIds.length === 0}>
                            Hapus Terpilih
                        </button>
                    </div>
                </div>
                <div className="table-container">{renderTable()}</div>
            </div>
        </div>
    );
};

export default LaporanPage;