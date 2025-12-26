"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Request {
  id: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
  game: {
    title: string;
  };
}

export default function AdminHistoryPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  const fetchHistory = async (p = 1) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/history?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data.requests);
      setPagination(res.data.pagination);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">İstek Geçmişi</h1>
        <div className="text-gray-400 text-sm">
          Toplam: {pagination.total} İstek
        </div>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Kullanıcı</th>
                <th className="px-6 py-4">Oyun</th>
                <th className="px-6 py-4">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                    {format(new Date(req.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    <div className="flex flex-col">
                      <span className="font-medium">{req.user.name || "İsimsiz"}</span>
                      <span className="text-xs text-gray-500">{req.user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {req.game.title}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      Tamamlandı
                    </span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Henüz hiç istek yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="secondary"
            disabled={page === 1 || loading}
            onClick={() => fetchHistory(page - 1)}
          >
            Önceki
          </Button>
          <div className="flex items-center px-4 text-gray-400">
            Sayfa {page} / {pagination.totalPages}
          </div>
          <Button
            variant="secondary"
            disabled={page === pagination.totalPages || loading}
            onClick={() => fetchHistory(page + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}

