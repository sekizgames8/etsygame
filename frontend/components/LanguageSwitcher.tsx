"use client";
import { useLang, Lang } from "@/lib/lang";

const labels: Record<Lang, string> = {
  en: "EN",
  ru: "РУ",
  ar: "ع",
};

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  const langs: Lang[] = ["en", "ru", "ar"];

  return (
    <div className="inline-flex items-center rounded-full bg-black/40 border border-white/10 p-1 gap-1">
      {langs.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
            lang === code
              ? "bg-white text-black"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}


