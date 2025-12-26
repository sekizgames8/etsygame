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
import { History, X } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Game {
  gameId: string;
  title: string;
  coverImage: string;
  steamUsername: string;
  steamPassword?: string;
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

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [statuses, setStatuses] = useState<GameStatus>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { t } = useLang();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      router.push("/");
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);

    // Fetch Games
    axios.get(`${API_BASE_URL}/api/code/my-games`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setGames(res.data);
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
      // Set local state to QUEUED immediately
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
    <div className="min-h-screen p-6 md:p-10 lg:p-12 flex flex-col items-center">
      <header className="w-full max-w-6xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("dashboard.title")}</h1>
          <p className="text-gray-400">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher />
          <span className="text-gray-300 text-sm sm:text-base">
            {t("dashboard.welcome")}, {user?.name}
          </span>
          <Button
            variant="secondary"
            onClick={fetchHistory}
            className="flex items-center gap-2"
          >
            <History size={16} />
            Geçmiş
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              localStorage.clear();
              router.push("/");
            }}
            >
            {t("dashboard.logout")}
          </Button>
        </div>
      </header>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">İstek Geçmişi</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Henüz geçmiş isteğiniz bulunmuyor.</p>
              ) : (
                <div className="space-y-4">
                  {history.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <h3 className="font-semibold text-white">{req.game.title}</h3>
                        <p className="text-xs text-gray-400">
                          {format(new Date(req.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                        </p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
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

      <div className="w-full max-w-6xl">
        {games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">{t("dashboard.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
            {games.map((game) => (
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
        )}
      </div>
    </div>
  );
}
