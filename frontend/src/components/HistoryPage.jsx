import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import LoadingSpinner from "./LoadingSpinner";
import { toast } from "react-toastify";
import {
  fetchFakturHistory,
  fetchBuktiSetorHistory,
  deleteFaktur,
  deleteBuktiSetor,
} from "../services/api";

const HistoryPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("faktur");
  const [buktiSetorData, setBuktiSetorData] = useState([]);

const loadHistories = async () => {
  try {
    const [fakturRes, setorRes] = await Promise.all([
      fetchFakturHistory(),
      fetchBuktiSetorHistory(),
    ]);

    setData(fakturRes.data || []);

    // ✅ Validasi array dulu sebelum set
    if (Array.isArray(setorRes.data?.data)) {
      setBuktiSetorData(setorRes.data.data);
    } else {
      console.warn("⚠️ Response bukti setor bukan array:", setorRes.data);
      setBuktiSetorData([]);
    }

  } catch (err) {
    toast.error("Gagal memuat data riwayat.");
    console.error(err);
    setBuktiSetorData([]); // fallback tambahan
    setData([]);           // fallback tambahan
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (jenis, id) => {
    const confirmMsg =
      jenis === "setor"
        ? "Yakin ingin menghapus bukti setor ini?"
        : "Yakin ingin menghapus faktur ini?";
    if (!window.confirm(confirmMsg)) return;

    try {
      if (jenis === "setor") {
        const res = await deleteBuktiSetor(id);
        toast.success(res.data.message || "Bukti setor berhasil dihapus!");
        const updated = buktiSetorData.filter((item) => item.id !== id);
        setBuktiSetorData(updated);
      } else {
        const res = await deleteFaktur(jenis, id);
        toast.success(res.data.message || "Faktur berhasil dihapus!");
        const updated = data.filter((item) => item.id !== id);
        setData(updated);
      }
    } catch (err) {
      toast.error("Gagal menghapus data.");
      console.error(err);
    }
  };

  useEffect(() => {
    loadHistories();
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Mengambil data riwayat..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tab-wrapper flex gap-4 mb-4 border-b">
        <button
          onClick={() => setActiveTab("faktur")}
          className={`py-2 px-4 font-semibold ${
            activeTab === "faktur"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
        >
          📄 Faktur Pajak
        </button>
        <button
          onClick={() => setActiveTab("setor")}
          className={`py-2 px-4 font-semibold ${
            activeTab === "setor"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
        >
          🧾 Bukti Setor
        </button>
      </div>

      {activeTab === "faktur" && (
        <>
          <h2 className="page-title">📜 Riwayat Faktur Disimpan</h2>
          {data.length === 0 ? (
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
        </>
      )}

      {activeTab === "setor" && (
        <>
          <h2 className="page-title">🧾 Riwayat Bukti Setor</h2>
          {buktiSetorData.length === 0 ? (
            <p>Tidak ada data bukti setor tersimpan.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Kode Setor</th>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {buktiSetorData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.kode_setor}</td>
                      <td>{item.tanggal}</td>
                      <td>{parseFloat(item.jumlah).toLocaleString("id-ID")}</td>
                      <td>
                        <button
                          onClick={() => handleDelete("setor", item.id)}
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
              href={`${process.env.REACT_APP_API_URL}/api/export_bukti_setor`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📤 Export ke Excel
            </a>
          )}
        </>
      )}
    </Layout>
  );
};

export default HistoryPage;
