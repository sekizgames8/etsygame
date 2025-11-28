"use client";
import { useEffect, useState } from "react";
import axios from "axios";
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
        "http://localhost:3001/api/admin/dashboard-data",
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
        "http://localhost:3001/api/admin/assign",
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
            <select
              className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
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
                  {a.username} - {a.game?.title}
                </option>
              ))}
            </select>
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


