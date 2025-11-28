"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import axios from "axios";
import { useLang } from "@/lib/lang";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { t } = useLang();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:3001/api/auth/login", {
        email,
        password
      });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      
      if (res.data.user.role === 'ADMIN') {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#101015] to-black">
      <GlassCard className="w-full max-w-md space-y-8 p-10 border border-white/10 shadow-2xl shadow-purple-900/20">
        <div className="flex items-start justify-between gap-2">
          <div className="text-left space-y-3">
            <div className="inline-block p-3 rounded-full bg-white/5 mb-1">
             <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 11l-.993 1.414 2.828 2.829-1.415 1.414-2.828-2.828-.993 1.414L3 11l7.743-7.743A6 6 0 0115 7z"></path></svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t("login.title")}
            </h1>
            <p className="text-gray-400 text-sm tracking-wide uppercase">
              {t("login.subtitle")}
            </p>
          </div>
          <LanguageSwitcher />
        </div>

        {error && (
          <div className="p-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">
              {t("login.email")}
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/20 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all text-white placeholder-gray-600"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">
              {t("login.password")}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/20 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all text-white placeholder-gray-600"
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full py-4 text-lg font-semibold shadow-purple-500/25" isLoading={loading}>
            {t("login.button")}
          </Button>
        </form>
        
        <div className="text-center">
          <p className="text-xs text-gray-600">
            {t("login.footer")}
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
