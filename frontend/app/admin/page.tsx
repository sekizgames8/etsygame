"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Users, Gamepad2, Key } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, games: 0, accounts: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/dashboard-data`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats({
          users: res.data.users.length,
          games: res.data.games.length,
          accounts: res.data.accounts.length
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Genel Bakış</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-blue-500/20 text-blue-400">
            <Users size={32} />
          </div>
          <div>
            <p className="text-gray-400">Toplam Kullanıcı</p>
            <h3 className="text-3xl font-bold text-white">{stats.users}</h3>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-purple-500/20 text-purple-400">
            <Gamepad2 size={32} />
          </div>
          <div>
            <p className="text-gray-400">Toplam Oyun</p>
            <h3 className="text-3xl font-bold text-white">{stats.games}</h3>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-green-500/20 text-green-400">
            <Key size={32} />
          </div>
          <div>
            <p className="text-gray-400">Steam Hesapları</p>
            <h3 className="text-3xl font-bold text-white">{stats.accounts}</h3>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

