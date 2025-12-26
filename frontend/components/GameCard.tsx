import { Button } from "./ui/Button";
import { useLang } from "@/lib/lang";
import { useState } from "react";
import { ShieldAlert, ShieldX } from "lucide-react";

interface GameCardProps {
  id: string;
  title: string;
  coverImage: string;
  steamUsername: string;
  steamPassword?: string;
  onSendCode: (id: string) => void;
  status: 'IDLE' | 'QUEUED' | 'PROCESSING' | 'WAITING_MAIL' | 'DONE' | 'ERROR' | 'LIMIT' | 'SECURITY_BLOCK' | 'SECURITY_UNKNOWN';
  code?: string;
}

export const GameCard = ({ id, title, coverImage, steamUsername, steamPassword, onSendCode, status, code }: GameCardProps) => {
  const isLoading = status === 'QUEUED' || status === 'PROCESSING' || status === 'WAITING_MAIL';
  const isSecurityIssue = status === 'SECURITY_BLOCK' || status === 'SECURITY_UNKNOWN';
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (value: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (e) {
      console.error("Failed to copy code", e);
    }
  };

  return (
    <div className="flex flex-col w-40 sm:w-48 md:w-56 flex-shrink-0 group cursor-pointer">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100/10 via-slate-700/5 to-transparent p-[2px] shadow-[0_20px_45px_rgba(0,0,0,0.7)]">
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950">
        <img 
          src={coverImage} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

        {/* Status pill */}
        {status !== "IDLE" && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full border text-[10px] font-medium uppercase tracking-[0.16em] flex items-center gap-1 ${
            isSecurityIssue 
              ? 'bg-red-900/90 border-red-500/50 text-red-200' 
              : 'bg-black/70 border-white/10 text-gray-200'
          }`}>
            <span
              className={
                status === "DONE"
                  ? "w-1.5 h-1.5 rounded-full bg-emerald-400"
                  : status === "ERROR" || status === "LIMIT"
                  ? "w-1.5 h-1.5 rounded-full bg-red-400"
                  : isSecurityIssue
                  ? "w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                  : "w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse"
              }
            />
            {status === "QUEUED" && t("status.QUEUED")}
            {status === "PROCESSING" && t("status.PROCESSING")}
            {status === "WAITING_MAIL" && t("status.WAITING_MAIL")}
            {status === "DONE" && t("status.DONE")}
            {status === "ERROR" && t("status.ERROR")}
            {status === "LIMIT" && t("status.LIMIT")}
            {status === "SECURITY_BLOCK" && t("status.SECURITY")}
            {status === "SECURITY_UNKNOWN" && t("status.SECURITY")}
          </div>
        )}

        {/* Title / status overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-white line-clamp-2">
              {title}
            </h3>
          </div>

          {status === 'WAITING_MAIL' && (
            <p className="text-[11px] text-yellow-300 animate-pulse">
              {t("status.msg.WAITING_MAIL")}
            </p>
          )}
          {status === 'PROCESSING' && (
            <p className="text-[11px] text-blue-300">
              {t("status.msg.PROCESSING")}
            </p>
          )}
          {status === 'ERROR' && (
            <p className="text-[11px] text-red-300">
              {t("status.msg.ERROR")}
            </p>
          )}
          {status === "LIMIT" && (
            <p className="text-[11px] text-red-300">
              {t("status.msg.LIMIT")}
            </p>
          )}
        </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 w-full">
        {/* Security Warning Box */}
        {isSecurityIssue && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-3 text-center">
            <ShieldAlert className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-[11px] text-red-300 font-medium">
              {status === 'SECURITY_BLOCK' 
                ? t("status.msg.SECURITY_BLOCK")
                : t("status.msg.SECURITY_UNKNOWN")
              }
            </p>
          </div>
        )}

        <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-[11px] text-gray-200 flex flex-col gap-0.5">
          <div>
            <span className="text-gray-400 mr-1">{t("account.label")}</span>
            <span className="font-mono tracking-wide break-all">{steamUsername}</span>
          </div>
          {steamPassword && (
            <div>
              <span className="text-gray-400 mr-1">{t("password.label")}</span>
              <span className="font-mono tracking-wide break-all">{steamPassword}</span>
            </div>
          )}
        </div>

        {status === "DONE" && code && (
          <button
            type="button"
            onClick={() => handleCopyCode(code)}
            className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-2 text-center space-y-1 hover:bg-emerald-500/25 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
          >
            <div className="text-[10px] text-emerald-200 uppercase tracking-[0.25em]">
              {t("code.label")}
            </div>
            <div className="text-2xl font-mono font-bold tracking-[0.3em] text-white">
              {code}
            </div>
            {copied && (
              <div className="text-[10px] text-emerald-200/90 mt-1">
                Copied to clipboard
              </div>
            )}
          </button>
        )}

        <Button
          onClick={() => onSendCode(id)}
          isLoading={isLoading}
          disabled={isSecurityIssue}
          className="w-full text-sm py-2.5"
          variant={status === "DONE" ? "secondary" : isSecurityIssue ? "secondary" : "primary"}
        >
          {isSecurityIssue ? t("btn.blocked") : status === "DONE" ? t("btn.newCode") : t("btn.send")}
        </Button>
      </div>
    </div>
  );
};
