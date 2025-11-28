"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { API_BASE_URL } from "@/lib/utils";

interface SteamAccountRow {
  id: string;
  username: string;
  gmailEmail: string;
  gameTitle: string;
  password: string;
}

export default function SteamAccountsPage() {
  const [rows, setRows] = useState<SteamAccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get<SteamAccountRow[]>(
          `${API_BASE_URL}/api/admin/steam-accounts-detail`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setRows(res.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.gameTitle.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.gmailEmail.toLowerCase().includes(q)
    );
  });

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Bu Steam hesabını silmek istediğinize emin misiniz?");
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setDeleting((prev) => ({ ...prev, [id]: true }));
      await axios.delete(`${API_BASE_URL}/api/admin/accounts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Steam Hesap Listesi</h1>
          <p className="text-sm text-gray-400">
            Tüm Steam hesaplarını oyun adı ve giriş bilgileriyle görüntüleyin.
          </p>
        </div>
      </div>

      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Oyun, kullanıcı adı veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-300">Oyun</th>
                <th className="px-4 py-3 font-medium text-gray-300">
                  Steam Kullanıcı Adı
                </th>
                <th className="px-4 py-3 font-medium text-gray-300">Gmail</th>
                <th className="px-4 py-3 font-medium text-gray-300">Şifre</th>
                <th className="px-4 py-3 font-medium text-gray-300 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => (
                <tr
                  key={acc.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2 text-white whitespace-nowrap">
                    {acc.gameTitle}
                  </td>
                  <td className="px-4 py-2 text-gray-200 whitespace-nowrap">
                    {acc.username}
                  </td>
                  <td className="px-4 py-2 text-gray-300 whitespace-nowrap">
                    {acc.gmailEmail}
                  </td>
                  <td className="px-4 py-2 text-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="font-mono tracking-wider">
                        {visiblePasswords[acc.id] ? acc.password : "••••••••"}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        onClick={() => togglePassword(acc.id)}
                      >
                        {visiblePasswords[acc.id] ? "Gizle" : "Göster"}
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      type="button"
                      variant="danger"
                      className="text-xs px-3 py-1.5"
                      onClick={() => handleDelete(acc.id)}
                      disabled={!!deleting[acc.id]}
                    >
                      {deleting[acc.id] ? "Siliniyor..." : "Sil"}
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-4 text-center text-sm text-gray-400"
                  >
                    Kriterlere uygun hesap bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}


