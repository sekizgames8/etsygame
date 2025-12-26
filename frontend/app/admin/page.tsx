"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Users, Gamepad2, Key } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, games: 0, accounts: 0 });
  const [popularGames, setPopularGames] = useState<any[]>([]);

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

        // Calculate popular games based on assignments
        if (res.data.assignments && Array.isArray(res.data.assignments)) {
          const gameCounts: { [key: string]: { count: number, title: string, image: string } } = {};
          
          res.data.assignments.forEach((assign: any) => {
            const game = assign.steamAccount?.game;
            if (game) {
              if (!gameCounts[game.id]) {
                gameCounts[game.id] = { count: 0, title: game.title, image: game.coverImage };
              }
              gameCounts[game.id].count++;
            }
          });

          const sortedGames = Object.values(gameCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
            
          setPopularGames(sortedGames);
        }

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

      {/* Popular Games Section */}
      {popularGames.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Popüler Oyunlar (En Çok Atanan)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {popularGames.map((game, index) => (
              <GlassCard key={index} className="flex items-center gap-3 p-4">
                <img 
                  src={game.image || "https://placehold.co/60x90"} 
                  alt={game.title} 
                  className="w-12 h-16 object-cover rounded-md shadow-sm"
                />
                <div>
                  <h4 className="font-bold text-white text-sm line-clamp-1" title={game.title}>{game.title}</h4>
                  <p className="text-xs text-gray-400">{game.count} Kullanıcıya Atandı</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

