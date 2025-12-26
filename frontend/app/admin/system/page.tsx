"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Activity, Database, Server, RefreshCw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SystemStatus {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  dbLatency: number;
  redisLatency: number;
  timestamp: string;
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/system-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}g ${h}s ${m}d ${s}sn`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Sistem Sağlığı</h1>
        <Button 
          variant="secondary" 
          onClick={fetchStatus} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Yenile
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
          Hata: {error}
        </div>
      )}

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-blue-500/20 text-blue-400">
              <Activity size={32} />
            </div>
            <div>
              <p className="text-gray-400">Sunucu Uptime</p>
              <h3 className="text-xl font-bold text-white">{formatUptime(status.uptime)}</h3>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-purple-500/20 text-purple-400">
              <Cpu size={32} />
            </div>
            <div>
              <p className="text-gray-400">RAM Kullanımı</p>
              <h3 className="text-xl font-bold text-white">{formatBytes(status.memory.rss)}</h3>
              <p className="text-xs text-gray-500">Heap: {formatBytes(status.memory.heapUsed)}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-green-500/20 text-green-400">
              <Database size={32} />
            </div>
            <div>
              <p className="text-gray-400">DB Gecikme</p>
              <h3 className={`text-xl font-bold ${status.dbLatency > 100 ? 'text-yellow-400' : 'text-white'}`}>
                {status.dbLatency} ms
              </h3>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-red-500/20 text-red-400">
              <Server size={32} />
            </div>
            <div>
              <p className="text-gray-400">Redis Gecikme</p>
              <h3 className={`text-xl font-bold ${status.redisLatency > 50 ? 'text-yellow-400' : 'text-white'}`}>
                {status.redisLatency} ms
              </h3>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

