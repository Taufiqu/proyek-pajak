import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import LoadingSpinner from "./LoadingSpinner";
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_API_URL;

const HistoryPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/history`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Gagal fetch riwayat:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jenis, id) => {
    if (!window.confirm("Yakin ingin menghapus faktur ini?")) return;

    try {
      const res = await fetch(`${API_URL}/api/delete/${jenis}/${id}`, {
        method: "DELETE",
      });

      const result = await res.json();
       if (res.ok) {
        // 2. GANTI: Notifikasi sukses dari alert ke toast
        toast.success(result.message || "Faktur berhasil dihapus!");
        fetchHistory(); // Refresh data
      } else {
        // Notifikasi jika response dari server tidak ok
        toast.error(result.message || "Gagal menghapus faktur.");
      }

    } catch (err) {
      // 3. GANTI: Notifikasi error dari alert ke toast
      toast.error("Gagal terhubung ke server untuk menghapus faktur.");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 2. Gunakan spinner saat loading
  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Mengambil data riwayat..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <h2 className="page-title">📜 Riwayat Faktur Disimpan</h2>
      {loading ? (
        <p>⏳ Mengambil data riwayat...</p>
      ) : data.length === 0 ? (
        <p>Tidak ada data tersimpan.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Jenis</th>
                <th>No Faktur</th>
                <th>Nama Lawan Transaksi</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={`${row.jenis}-${row.id}`}>
                  <td>{row.jenis}</td>
                  <td>{row.no_faktur}</td>
                  <td>{row.nama_lawan_transaksi}</td>
                  <td>{row.tanggal}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(row.jenis, row.id)}
                      className="delete-button"
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.length > 0 && (
        <a
          className="export-button"
          href={`${process.env.REACT_APP_API_URL}/api/export`}
          target="_blank"
          rel="noopener noreferrer"
        >
          📤 Export ke Excel
        </a>
      )}
    </Layout>
  );
};

export default HistoryPage;
