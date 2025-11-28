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

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [statuses, setStatuses] = useState<GameStatus>({});
  const [socket, setSocket] = useState<Socket | null>(null);
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
            onClick={() => {
              localStorage.clear();
              router.push("/");
            }}
            >
            {t("dashboard.logout")}
          </Button>
        </div>
      </header>

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

