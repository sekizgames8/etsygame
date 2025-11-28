"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

interface Game {
  id: string;
  title: string;
  coverImage: string;
}

export default function GameOwnersPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [owners, setOwners] = useState<any[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  useEffect(() => {
    const fetchGames = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get("http://localhost:3001/api/admin/dashboard-data", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGames(res.data.games || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchGames();
  }, []);

  const filteredGames = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return games.slice(0, 12);
    return games.filter((g) => g.title.toLowerCase().includes(q));
  }, [games, search]);

  const fetchOwners = async (game: Game) => {
    const token = localStorage.getItem("token");
    setSelectedGame(game);
    setLoadingOwners(true);
    try {
      const res = await axios.get(
        `http://localhost:3001/api/admin/games/${game.id}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOwners(res.data || []);
    } catch (e) {
      console.error(e);
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `http://localhost:3001/api/admin/users/${userId}/active`,
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (selectedGame) {
        fetchOwners(selectedGame);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Oyun Sahiplikleri</h1>
          <p className="text-sm text-gray-400">
            Oyun adına göre arama yaparak oyuna sahip kullanıcıları görüntüleyin.
          </p>
        </div>
      </div>

      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            type="text"
            placeholder="Oyun ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGames.map((game) => (
            <button
              key={game.id}
              type="button"
              onClick={() => fetchOwners(game)}
              className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors ${
                selectedGame?.id === game.id ? "ring-2 ring-purple-500/60" : ""
              }`}
            >
              <div className="w-10 h-14 rounded-md overflow-hidden bg-zinc-900 flex-shrink-0">
                {game.coverImage && (
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <span className="text-sm text-white line-clamp-2">{game.title}</span>
            </button>
          ))}

          {filteredGames.length === 0 && (
            <p className="col-span-full text-sm text-gray-400">
              Arama kriterine uygun oyun bulunamadı.
            </p>
          )}
        </div>
      </GlassCard>

      {selectedGame && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">
            Seçilen oyun:{" "}
            <span className="text-purple-300">{selectedGame.title}</span>
          </h2>

          <GlassCard className="p-0 overflow-hidden">
            {loadingOwners ? (
              <div className="p-6 text-center text-gray-300 text-sm">
                Kullanıcılar yükleniyor...
              </div>
            ) : owners.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Bu oyuna atanmış kullanıcı bulunamadı.
              </div>
            ) : (
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
                      <th className="px-4 py-3 font-medium text-gray-300 text-center">
                        Durum
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-300 text-right">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-2 text-white">
                          {u.name || "İsimsiz Kullanıcı"}
                        </td>
                        <td className="px-4 py-2 text-gray-300">{u.email}</td>
                        <td className="px-4 py-2 text-gray-200">
                          {u.steamUsername}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${
                              u.isActive
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                : "bg-zinc-700/40 text-zinc-200 border border-zinc-500/40"
                            }`}
                          >
                            {u.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant={u.isActive ? "secondary" : "primary"}
                            className="text-xs px-3 py-1.5"
                            onClick={() => toggleActive(u.id, u.isActive)}
                          >
                            {u.isActive ? "Pasifleştir" : "Aktifleştir"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}


