"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

interface DashboardData {
  users: any[];
  games: any[];
  accounts: any[];
  assignments?: any[];
}

export default function AssignmentsPage() {
  const [data, setData] = useState<DashboardData>({
    users: [],
    games: [],
    accounts: [],
    assignments: [],
  });
  const [assignData, setAssignData] = useState({
    userId: "",
    steamAccountId: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get<DashboardData>(
        `${API_BASE_URL}/api/admin/dashboard-data`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/assign`,
        assignData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAssignData({ userId: "", steamAccountId: "" });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Hesap Atama</h1>
        <p className="text-sm text-gray-400">
          Steam hesaplarını kullanıcılara buradan atayın.
        </p>
      </div>

      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Yeni Atama Oluştur
        </h2>
        <form
          onSubmit={handleAssign}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="flex-1 space-y-2">
            <label className="text-sm text-gray-400">Kullanıcı</label>
            <select
              className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
              value={assignData.userId}
              onChange={(e) =>
                setAssignData({ ...assignData, userId: e.target.value })
              }
            >
              <option value="" className="text-black">
                Kullanıcı Seç
              </option>
              {data.users.map((u) => (
                <option
                  key={u.id}
                  value={u.id}
                  className="text-black"
                >
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm text-gray-400">Hesap</label>
            <div className="relative">
              <select
                className="w-full p-2 rounded bg-white/5 border border-white/10 text-white appearance-none"
                value={assignData.steamAccountId}
                onChange={(e) =>
                  setAssignData({
                    ...assignData,
                    steamAccountId: e.target.value,
                  })
                }
              >
                <option value="" className="text-black">
                  Hesap Seç
                </option>
                {data.accounts.map((a) => (
                  <option
                    key={a.id}
                    value={a.id}
                    className="text-black"
                  >
                    {a.game?.title} - {a.username}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {/* Custom visualizer for selected account if needed, but select with images is tricky.
                Instead, we show the image of the selected account below if selected. */}
            {assignData.steamAccountId && (() => {
              const selectedAccount = data.accounts.find(a => a.id === assignData.steamAccountId);
              if (selectedAccount && selectedAccount.game?.coverImage) {
                return (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <img 
                      src={selectedAccount.game.coverImage} 
                      alt={selectedAccount.game.title} 
                      className="w-10 h-14 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedAccount.game.title}</p>
                      <p className="text-xs text-gray-400">{selectedAccount.username}</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <Button type="submit" isLoading={loading}>
            Ata
          </Button>
        </form>
      </GlassCard>

      {!!data.assignments?.length && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-300">
                    Kullanıcı
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-300">
                    E-posta
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-300">
                    Steam Kullanıcı Adı
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-300">
                    Oyun
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.assignments!.map((a: any) => (
                  <tr
                    key={a.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-2 text-white">
                      {a.user?.name || "İsimsiz Kullanıcı"}
                    </td>
                    <td className="px-4 py-2 text-gray-300">
                      {a.user?.email}
                    </td>
                    <td className="px-4 py-2 text-gray-200">
                      {a.steamAccount?.username}
                    </td>
                    <td className="px-4 py-2 text-gray-200">
                      {a.steamAccount?.game?.title}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}


