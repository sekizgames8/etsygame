"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { API_BASE_URL } from "@/lib/utils";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/Button";
import { useLang } from "@/lib/lang";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Store, Library, History, X, LogOut, Gamepad2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Game {
  gameId: string;
  title: string;
  coverImage: string;
  steamUsername: string;
  steamPassword?: string;
}

interface StoreGame {
  id: string;
  title: string;
  coverImage: string;
}

interface GameStatus {
  [gameId: string]: {
    status: 'IDLE' | 'QUEUED' | 'PROCESSING' | 'WAITING_MAIL' | 'DONE' | 'ERROR' | 'LIMIT';
    code?: string;
  };
}

interface RequestHistory {
  id: string;
  createdAt: string;
  game: {
    title: string;
  };
}

type TabType = 'store' | 'library';

export default function Dashboard() {
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [allGames, setAllGames] = useState<StoreGame[]>([]);
  const [statuses, setStatuses] = useState<GameStatus>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('store');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { t } = useLang();

  // Get owned game IDs for checking in store view
  const ownedGameIds = new Set(myGames.map(g => g.gameId));

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      router.push("/");
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);

    // Fetch All Games (Store)
    axios.get(`${API_BASE_URL}/api/code/all-games`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setAllGames(res.data);
    }).catch(err => {
      console.error(err);
    });

    // Fetch My Games (Library)
    axios.get(`${API_BASE_URL}/api/code/my-games`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setMyGames(res.data);
    }).catch(err => {
      console.error(err);
      if (err.response?.status === 401) router.push("/");
    });

    // Connect Socket
    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket");
      newSocket.emit("join_user", userData.id);
    });

    newSocket.on("code_status", (data: { status: string, gameId: string, code?: string }) => {
      console.log("Status update:", data);
      setStatuses(prev => ({
        ...prev,
        [data.gameId]: {
          status: data.status as any,
          code: data.code
        }
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [router]);

  const fetchHistory = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/code/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
      setShowHistory(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendCode = async (gameId: string) => {
    try {
      const token = localStorage.getItem("token");
      setStatuses(prev => ({
        ...prev,
        [gameId]: { status: 'QUEUED' }
      }));

      await axios.post(`${API_BASE_URL}/api/code/request`, { gameId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      console.error(err);
      const statusCode = err?.response?.status;

      setStatuses(prev => ({
        ...prev,
        [gameId]:
          statusCode === 429
            ? { status: "LIMIT" }
            : { status: "ERROR" }
      }));
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#0d1117] to-[#0a0a0f] border-r border-white/5 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">sekizgames</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Game Library</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('store')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === 'store'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Store className={`w-5 h-5 ${activeTab === 'store' ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
            <span className="font-medium">{t("nav.store")}</span>
            {activeTab === 'store' && <ChevronRight className="w-4 h-4 ml-auto" />}
          </button>
          
          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === 'library'
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Library className={`w-5 h-5 ${activeTab === 'library' ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
            <span className="font-medium">{t("nav.library")}</span>
            {myGames.length > 0 && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'library' 
                  ? 'bg-purple-500/30 text-purple-300' 
                  : 'bg-white/10 text-gray-400'
              }`}>
                {myGames.length}
              </span>
            )}
          </button>

          <button
            onClick={fetchHistory}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
          >
            <History className="w-5 h-5 text-gray-500 group-hover:text-gray-300" />
            <span className="font-medium">{t("nav.history")}</span>
          </button>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => {
                localStorage.clear();
                router.push("/");
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              {t("dashboard.logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 px-8 py-5">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'store' ? (
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Store className="w-6 h-6 text-cyan-400" />
                  {t("store.title")}
                </h1>
                <p className="text-gray-500 mt-1">{t("store.subtitle")}</p>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Library className="w-6 h-6 text-purple-400" />
                  {t("dashboard.title")}
                </h1>
                <p className="text-gray-500 mt-1">{t("dashboard.subtitle")}</p>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'store' ? (
              // Store View - All Games
              allGames.length === 0 ? (
                <div className="text-center py-20">
                  <Store className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-xl">{t("store.empty")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {allGames.map((game) => {
                    const isOwned = ownedGameIds.has(game.id);
                    return (
                      <div key={game.id} className="group relative">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100/10 via-slate-700/5 to-transparent p-[1px] shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-[1.02]">
                          <div className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-950">
                            <img 
                              src={game.coverImage} 
                              alt={game.title} 
                              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Owned Badge */}
                            {isOwned && (
                              <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-emerald-500/90 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                                {t("store.owned")}
                              </div>
                            )}
                            
                            {/* Title overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-3">
                              <h3 className="text-sm font-semibold text-white line-clamp-2">
                                {game.title}
                              </h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // Library View - My Games
              myGames.length === 0 ? (
                <div className="text-center py-20">
                  <Library className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-xl mb-4">{t("library.empty")}</p>
                  <Button onClick={() => setActiveTab('store')} variant="primary">
                    {t("nav.store")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                  {myGames.map((game) => (
                    <GameCard
                      key={game.gameId}
                      id={game.gameId}
                      title={game.title}
                      coverImage={game.coverImage}
                      steamUsername={game.steamUsername}
                      steamPassword={game.steamPassword}
                      onSendCode={handleSendCode}
                      status={statuses[game.gameId]?.status || "IDLE"}
                      code={statuses[game.gameId]?.code}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12151f] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">İstek Geçmişi</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Henüz geçmiş isteğiniz bulunmuyor.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors">
                      <div>
                        <h3 className="font-semibold text-white">{req.game.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(req.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                        </p>
                      </div>
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Tamamlandı
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
