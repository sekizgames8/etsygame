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
import { Store, Library, History, X, LogOut, Gamepad2, ChevronRight, Menu, User, HelpCircle, CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";
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
    status: 'IDLE' | 'QUEUED' | 'PROCESSING' | 'WAITING_MAIL' | 'DONE' | 'ERROR' | 'LIMIT' | 'SECURITY_BLOCK' | 'SECURITY_UNKNOWN';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
      setSidebarOpen(false);
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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-gradient-to-b from-[#0d1117] to-[#0a0a0f] border-r border-white/5 flex flex-col fixed h-full z-40
        transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">sekizgames</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Game Library</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => handleTabChange('store')}
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
            onClick={() => handleTabChange('library')}
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

          <div className="my-4 border-t border-white/5" />

          <button
            onClick={() => { setShowHelp(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
          >
            <HelpCircle className="w-5 h-5 text-gray-500 group-hover:text-gray-300" />
            <span className="font-medium">{t("nav.help")}</span>
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
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex-1">
              {activeTab === 'store' ? (
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2 lg:gap-3">
                    <Store className="w-5 h-5 lg:w-6 lg:h-6 text-cyan-400" />
                    {t("store.title")}
                  </h1>
                  <p className="text-gray-500 text-sm mt-0.5 hidden sm:block">{t("store.subtitle")}</p>
                </div>
              ) : (
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2 lg:gap-3">
                    <Library className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400" />
                    {t("dashboard.title")}
                  </h1>
                  <p className="text-gray-500 text-sm mt-0.5 hidden sm:block">{t("dashboard.subtitle")}</p>
                </div>
              )}
            </div>

            {/* Mobile User Avatar */}
            <button 
              onClick={() => setShowProfile(true)}
              className="lg:hidden w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold"
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'store' ? (
              // Store View - All Games
              allGames.length === 0 ? (
                <div className="text-center py-16 lg:py-20">
                  <Store className="w-12 h-12 lg:w-16 lg:h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg lg:text-xl">{t("store.empty")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                  {allGames.map((game) => {
                    const isOwned = ownedGameIds.has(game.id);
                    return (
                      <div key={game.id} className="group relative">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-100/10 via-slate-700/5 to-transparent p-[1px] shadow-[0_10px_25px_rgba(0,0,0,0.4)] sm:shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-[1.02]">
                          <div className="relative w-full h-full rounded-lg sm:rounded-xl overflow-hidden bg-zinc-950">
                            <img 
                              src={game.coverImage} 
                              alt={game.title} 
                              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Owned Badge */}
                            {isOwned && (
                              <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-emerald-500/90 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                                {t("store.owned")}
                              </div>
                            )}
                            
                            {/* Title overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                              <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2">
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
                <div className="text-center py-16 lg:py-20">
                  <Library className="w-12 h-12 lg:w-16 lg:h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg lg:text-xl mb-4">{t("library.empty")}</p>
                  <Button onClick={() => setActiveTab('store')} variant="primary">
                    {t("nav.store")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
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

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0d1117]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'store' 
                ? 'text-cyan-400' 
                : 'text-gray-500'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t("nav.store")}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('library')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative ${
              activeTab === 'library' 
                ? 'text-purple-400' 
                : 'text-gray-500'
            }`}
          >
            <Library className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t("nav.library")}</span>
            {myGames.length > 0 && (
              <span className="absolute -top-1 right-1 w-4 h-4 rounded-full bg-purple-500 text-[9px] font-bold text-white flex items-center justify-center">
                {myGames.length}
              </span>
            )}
          </button>

          <button
            onClick={fetchHistory}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-gray-500 transition-all"
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t("nav.history")}</span>
          </button>

          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-gray-500 transition-all"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profil</span>
          </button>
        </div>
      </nav>

      {/* Mobile Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowProfile(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-[#12151f] border-t border-white/10 rounded-t-3xl p-6 animate-slide-up safe-area-pb">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{user?.name}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <span className="text-gray-300">Dil / Language</span>
                <LanguageSwitcher />
              </div>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push("/");
                }}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t("dashboard.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12151f] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg sm:text-xl font-bold text-white">İstek Geçmişi</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Henüz geçmiş isteğiniz bulunmuyor.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white text-sm sm:text-base truncate">{req.game.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(req.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                        </p>
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-3 flex-shrink-0">
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

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12151f] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg sm:text-xl font-bold text-white">{t("help.title")}</h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Nasıl Kullanılır */}
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  {t("help.howto.title")}
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <p>{t("help.howto.step1")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <p>{t("help.howto.step2")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-emerald-400 font-bold">3.</span>
                    <p>{t("help.howto.step3")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-emerald-400 font-bold">4.</span>
                    <p>{t("help.howto.step4")}</p>
                  </div>
                </div>
              </div>

              {/* Uyarılar */}
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  {t("help.warnings.title")}
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p>{t("help.warnings.item1")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p>{t("help.warnings.item2")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p>{t("help.warnings.item3")}</p>
                  </div>
                </div>
              </div>

              {/* Yasaklar */}
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  {t("help.forbidden.title")}
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p>{t("help.forbidden.item1")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p>{t("help.forbidden.item2")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p>{t("help.forbidden.item3")}</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p>{t("help.forbidden.item4")}</p>
                  </div>
                </div>
              </div>

              {/* Güvenlik Notu */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">{t("help.security.title")}</h4>
                    <p className="text-sm text-gray-300">{t("help.security.desc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
