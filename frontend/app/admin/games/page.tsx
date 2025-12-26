"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Trash2, Pencil, ExternalLink } from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";

export default function GamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", coverImage: "", listingUrl: "" });
  const [editingGame, setEditingGame] = useState<any | null>(null);

  const fetchGames = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/dashboard-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGames(res.data.games);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchGames(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      if (editingGame) {
        await axios.put(
          `${API_BASE_URL}/api/admin/games/${editingGame.id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/games`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowForm(false);
      setEditingGame(null);
      setFormData({ title: "", coverImage: "", listingUrl: "" });
      fetchGames();
    } catch (e) { console.error(e); }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Bu oyunu silmek istediğinize emin misiniz? İlgili Steam hesapları ve atamalar da silinecek."
      )
    ) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/games/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGames();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Oyunlar</h1>
        <Button
          onClick={() => {
            if (editingGame) {
              setEditingGame(null);
              setFormData({ title: "", coverImage: "", listingUrl: "" });
            }
            setShowForm(!showForm);
          }}
        >
          {editingGame ? "Düzenlemeyi İptal Et" : "+ Yeni Oyun"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Oyun Adı"
              className="p-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
            <input
              placeholder="Kapak Resmi URL"
              className="p-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70"
              value={formData.coverImage}
              onChange={(e) =>
                setFormData({ ...formData, coverImage: e.target.value })
              }
            />
            <input
              placeholder="İlan Linki (Etsy, Web sitesi vb.)"
              className="p-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70 md:col-span-2"
              value={formData.listingUrl}
              onChange={(e) =>
                setFormData({ ...formData, listingUrl: e.target.value })
              }
            />
            <div className="md:col-span-2">
              <Button type="submit" className="w-full md:w-auto">
                {editingGame ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className={`flex flex-col group cursor-pointer text-left ${
              editingGame?.id === game.id ? "scale-[1.03]" : ""
            } transition-transform`}
          >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-lg shadow-black/40">
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                {game.listingUrl && (
                  <a
                    href={game.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/70 text-gray-200 hover:text-cyan-300 hover:bg-black/90 transition-colors"
                    title="İlan Linki"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingGame(game);
                    setFormData({
                      title: game.title ?? "",
                      coverImage: game.coverImage ?? "",
                      listingUrl: game.listingUrl ?? "",
                    });
                    setShowForm(true);
                  }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/70 text-gray-200 hover:text-yellow-300 hover:bg-black/90 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGame(game.id);
                  }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/70 text-gray-300 hover:text-red-300 hover:bg-black/90 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <img
                src={game.coverImage}
                alt={game.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              
              {/* Listing URL indicator */}
              {game.listingUrl && (
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-[10px] text-cyan-300 flex items-center gap-1">
                  <ExternalLink size={10} />
                  İlan Bağlı
                </div>
              )}
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-white line-clamp-2">
                {game.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
