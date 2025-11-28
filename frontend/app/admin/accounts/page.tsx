"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export default function AccountsPage() {
  const [data, setData] = useState<{users: any[], games: any[], accounts: any[]}>({ users: [], games: [], accounts: [] });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    username: "", password: "", gmailEmail: "", gmailRefreshToken: "", gameId: "" 
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ username: "", gmailEmail: "", password: "", refreshToken: "" });
  const [showEditPassword, setShowEditPassword] = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem(\"token\");
    try {
      const [dashRes, detailRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/dashboard-data`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/admin/steam-accounts-detail`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setData({
        users: dashRes.data.users || [],
        games: dashRes.data.games || [],
        accounts: detailRes.data || [],
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem(\"token\");
    try {
      await axios.post(`${API_BASE_URL}/api/admin/accounts`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const token = localStorage.getItem(\"token\");
    try {
      await axios.put(`${API_BASE_URL}/api/admin/accounts/${editingId}`, {
        username: editValues.username,
        gmailEmail: editValues.gmailEmail,
        password: editValues.password,
        gmailRefreshToken: editValues.refreshToken,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingId(null);
      setShowEditPassword(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* CREATE ACCOUNT */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">Steam Hesapları</h1>
          <Button onClick={() => setShowForm(!showForm)}>+ Yeni Hesap</Button>
        </div>

        {showForm && (
          <GlassCard className="p-6 mb-6">
            <form onSubmit={handleCreateAccount} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Steam Kullanıcı Adı" 
                  className="p-2 rounded bg-white/5 border border-white/10 text-white"
                  value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                />
                <div className="relative">
                  <input 
                    placeholder="Steam Şifresi" 
                    type={showCreatePassword ? "text" : "password"}
                    className="w-full p-2 rounded bg-white/5 border border-white/10 text-white pr-20"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(v => !v)}
                    className="absolute inset-y-0 right-2 my-1 px-3 text-xs rounded bg-white/10 text-gray-200 hover:bg-white/20"
                  >
                    {showCreatePassword ? "Gizle" : "Göster"}
                  </button>
                </div>
                <input 
                  placeholder="Gmail E-posta" 
                  className="p-2 rounded bg-white/5 border border-white/10 text-white"
                  value={formData.gmailEmail} onChange={e => setFormData({...formData, gmailEmail: e.target.value})}
                />
                <input 
                  placeholder="Gmail Refresh Token" 
                  className="p-2 rounded bg-white/5 border border-white/10 text-white"
                  value={formData.gmailRefreshToken} onChange={e => setFormData({...formData, gmailRefreshToken: e.target.value})}
                />
              </div>
              <select 
                className="p-2 rounded bg-white/5 border border-white/10 text-white"
                value={formData.gameId} onChange={e => setFormData({...formData, gameId: e.target.value})}
              >
                <option value="" className="text-black">Oyun Seç</option>
                {data.games.map(g => (
                  <option key={g.id} value={g.id} className="text-black">{g.title}</option>
                ))}
              </select>
              <Button type="submit">Hesap Oluştur</Button>
            </form>
          </GlassCard>
        )}

        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-300">Oyun</th>
                  <th className="px-4 py-3 font-medium text-gray-300">Steam Kullanıcı Adı</th>
                  <th className="px-4 py-3 font-medium text-gray-300">Gmail</th>
                  <th className="px-4 py-3 font-medium text-gray-300">Şifre</th>
                  <th className="px-4 py-3 font-medium text-gray-300 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map(acc => (
                  <tr key={acc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2 text-white whitespace-nowrap">
                      {acc.gameTitle ?? acc.game?.title}
                    </td>
                    <td className="px-4 py-2 text-gray-200 whitespace-nowrap">
                      {editingId === acc.id ? (
                        <input
                          className="w-full p-1.5 rounded bg-black/40 border border-white/10 text-white text-xs"
                          value={editValues.username}
                          onChange={e => setEditValues(v => ({ ...v, username: e.target.value }))}
                        />
                      ) : (
                        acc.username
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-400 align-top min-w-[220px]">
                      {editingId === acc.id ? (
                        <div className="space-y-1.5">
                          <input
                            className="w-full p-1.5 rounded bg-black/40 border border-white/10 text-white text-xs"
                            value={editValues.gmailEmail}
                            onChange={e => setEditValues(v => ({ ...v, gmailEmail: e.target.value }))}
                            placeholder="Gmail E-posta"
                          />
                          <input
                            className="w-full p-1.5 rounded bg-black/40 border border-white/10 text-white text-[10px]"
                            value={editValues.refreshToken}
                            onChange={e => setEditValues(v => ({ ...v, refreshToken: e.target.value }))}
                            placeholder="Yeni Gmail Refresh Token (boş bırakılırsa aynı kalır)"
                          />
                        </div>
                      ) : (
                        acc.gmailEmail
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-200 align-top min-w-[160px]">
                      {editingId === acc.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type={showEditPassword ? "text" : "password"}
                            className="w-full p-1.5 rounded bg-black/40 border border-white/10 text-white text-xs"
                            value={editValues.password}
                            onChange={e => setEditValues(v => ({ ...v, password: e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditPassword(v => !v)}
                            className="px-2 py-1 text-[10px] rounded bg-white/10 text-gray-200 hover:bg-white/20"
                          >
                            {showEditPassword ? "Gizle" : "Göster"}
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono tracking-wide">
                          {"•".repeat(acc.password ? acc.password.length : 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {editingId === acc.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            type="button"
                            className="text-xs px-3 py-1.5"
                            onClick={handleSaveEdit}
                          >
                            Kaydet
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs px-3 py-1.5"
                            onClick={() => {
                              setEditingId(null);
                              setShowEditPassword(false);
                            }}
                          >
                            İptal
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          onClick={() => {
                            setEditingId(acc.id);
                            setEditValues({
                              username: acc.username || "",
                              gmailEmail: acc.gmailEmail || "",
                              password: "",
                              refreshToken: "",
                            });
                            setShowEditPassword(false);
                          }}
                        >
                          Düzenle
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.accounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-400">
                      Kayıtlı Steam hesabı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}

