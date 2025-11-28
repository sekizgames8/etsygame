"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "", role: "USER" });

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://localhost:3001/api/admin/dashboard-data", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.users);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.post("http://localhost:3001/api/admin/users", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const toggleActive = async (userId: string, current: boolean) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `http://localhost:3001/api/admin/users/${userId}/active`,
        { isActive: !current },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Kullanıcılar</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Yeni Kullanıcı</Button>
      </div>

      {showForm && (
        <GlassCard className="p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <input 
              placeholder="İsim" 
              className="p-2 rounded bg-white/5 border border-white/10 text-white"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input 
              placeholder="E-posta" 
              type="email"
              className="p-2 rounded bg-white/5 border border-white/10 text-white"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <input 
              placeholder="Şifre" 
              type="password"
              className="p-2 rounded bg-white/5 border border-white/10 text-white"
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
            />
            <select 
              className="p-2 rounded bg-white/5 border border-white/10 text-white"
              value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="USER" className="text-black">Kullanıcı</option>
              <option value="ADMIN" className="text-black">Yönetici</option>
            </select>
            <Button type="submit">Oluştur</Button>
          </form>
        </GlassCard>
      )}

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-300">İsim</th>
                <th className="px-4 py-3 font-medium text-gray-300">E-posta</th>
                <th className="px-4 py-3 font-medium text-gray-300">Rol</th>
                <th className="px-4 py-3 font-medium text-gray-300 text-center">
                  Durum
                </th>
                <th className="px-4 py-3 font-medium text-gray-300 text-right">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2 text-white">
                    {user.name || "İsimsiz Kullanıcı"}
                  </td>
                  <td className="px-4 py-2 text-gray-300">{user.email}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-white/10 text-[11px] uppercase tracking-wide text-gray-100">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        user.isActive
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                          : "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40"
                      }`}
                    >
                      {user.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant={user.isActive ? "secondary" : "primary"}
                      className="text-xs px-3 py-1.5"
                      onClick={() => toggleActive(user.id, user.isActive)}
                    >
                      {user.isActive ? "Pasifleştir" : "Aktifleştir"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

