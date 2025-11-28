"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Gamepad2,
  Key,
  LogOut,
  LayoutDashboard,
  Search,
  Link2,
  Menu,
  X,
} from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard },
    { href: "/admin/users", label: "Kullanıcılar", icon: Users },
    { href: "/admin/games", label: "Oyunlar", icon: Gamepad2 },
    { href: "/admin/game-owners", label: "Oyun Sahiplikleri", icon: Search },
    { href: "/admin/accounts", label: "Steam Hesapları", icon: Key },
    { href: "/admin/assignments", label: "Hesap Atama", icon: Link2 },
  ];

  const renderLinks = (onClick?: () => void) =>
    links.map((link) => {
      const Icon = link.icon;
      const isActive = pathname === link.href;
      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => {
            onClick?.();
          }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
            isActive
              ? "bg-white/10 text-white shadow-lg shadow-purple-500/10"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Icon size={20} />
          <span>{link.label}</span>
        </Link>
      );
    });

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-semibold text-white">Yönetim Paneli</h1>
          <p className="text-xs text-gray-400">SteamGuard Admin</p>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-gray-100 hover:bg-white/20 transition-colors"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-black/20 backdrop-blur-lg border-r border-white/10 p-6 flex-col">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Yönetim Paneli
          </h2>
        </div>

        <nav className="flex-1 space-y-2">{renderLinks()}</nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={20} />
          <span>Çıkış Yap</span>
        </button>
      </aside>

      {/* Mobile slide-over menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-full h-full bg-black/90 border-r border-white/10 p-6 flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Yönetim Paneli
              </h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-gray-100 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto">
              {renderLinks(() => setMobileOpen(false))}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={20} />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}

