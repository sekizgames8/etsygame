"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "ru" | "ar";

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  en: {
    "login.title": "sekizgames",
    "login.subtitle": "Secure Code Delivery",
    "login.email": "Email Address",
    "login.password": "Password",
    "login.button": "Sign In to Dashboard",
    "login.footer": "Protected by enterprise grade encryption",

    "dashboard.title": "My Library",
    "dashboard.subtitle": "Manage your Steam accounts",
    "dashboard.welcome": "Welcome",
    "dashboard.logout": "Logout",
    "dashboard.empty": "No games assigned to you yet.",
    
    "nav.store": "Store",
    "nav.library": "Library",
    "nav.history": "History",
    "store.title": "Game Store",
    "store.subtitle": "Browse all available games",
    "store.empty": "No games available yet.",
    "store.owned": "Owned",
    "library.empty": "You don't own any games yet. Visit the Store to see available games.",

    "status.QUEUED": "QUEUED",
    "status.PROCESSING": "LOGGING IN",
    "status.WAITING_MAIL": "WAITING EMAIL",
    "status.DONE": "READY",
    "status.ERROR": "ERROR",
    "status.LIMIT": "LIMIT",
    "status.SECURITY": "BLOCKED",

    "status.msg.WAITING_MAIL": "Waiting for Steam email...",
    "status.msg.PROCESSING": "Signing in to Steam...",
    "status.msg.ERROR": "Failed to get code. Try again.",
    "status.msg.LIMIT": "You can request a Steam Guard code for this game only once per week.",
    "status.msg.SECURITY_BLOCK": "⚠️ Security Alert! Steam Guard authenticator change detected. Code blocked for account protection.",
    "status.msg.SECURITY_UNKNOWN": "⚠️ Suspicious activity detected. Code blocked for security reasons.",

    "code.label": "Steam Guard Code",
    "account.label": "Account:",
    "password.label": "Password:",
    "btn.send": "Send Code",
    "btn.newCode": "Get New Code",
    "btn.blocked": "Blocked",
  },
  ru: {
    "login.title": "sekizgames",
    "login.subtitle": "Безопасная доставка кодов",
    "login.email": "E-mail",
    "login.password": "Пароль",
    "login.button": "Войти в кабинет",
    "login.footer": "Защищено шифрованием корпоративного уровня",

    "dashboard.title": "Моя библиотека",
    "dashboard.subtitle": "Управляйте своими Steam-аккаунтами",
    "dashboard.welcome": "Привет",
    "dashboard.logout": "Выйти",
    "dashboard.empty": "У вас пока нет привязанных игр.",
    
    "nav.store": "Магазин",
    "nav.library": "Библиотека",
    "nav.history": "История",
    "store.title": "Магазин игр",
    "store.subtitle": "Просмотр всех доступных игр",
    "store.empty": "Пока нет доступных игр.",
    "store.owned": "В библиотеке",
    "library.empty": "У вас пока нет игр. Посетите Магазин, чтобы увидеть доступные игры.",

    "status.QUEUED": "В ОЧЕРЕДИ",
    "status.PROCESSING": "ВХОД В STEAM",
    "status.WAITING_MAIL": "ОЖИДАНИЕ ПИСЬМА",
    "status.DONE": "ГОТОВО",
    "status.ERROR": "ОШИБКА",
    "status.LIMIT": "ЛИМИТ",
    "status.SECURITY": "ЗАБЛОКИРОВАНО",

    "status.msg.WAITING_MAIL": "Ожидаем письмо от Steam...",
    "status.msg.PROCESSING": "Выполняется вход в Steam...",
    "status.msg.ERROR": "Не удалось получить код. Попробуйте ещё раз.",
    "status.msg.LIMIT": "Для этой игры можно запросить код Steam Guard только один раз в неделю.",
    "status.msg.SECURITY_BLOCK": "⚠️ Обнаружена попытка изменения Steam Guard. Код заблокирован для защиты аккаунта.",
    "status.msg.SECURITY_UNKNOWN": "⚠️ Обнаружена подозрительная активность. Код заблокирован по соображениям безопасности.",

    "code.label": "Код Steam Guard",
    "account.label": "Аккаунт:",
    "password.label": "Пароль:",
    "btn.send": "Отправить код",
    "btn.newCode": "Получить новый код",
    "btn.blocked": "Заблокировано",
  },
  ar: {
    "login.title": "sekizgames",
    "login.subtitle": "تسليم آمن لرموز Steam",
    "login.email": "البريد الإلكتروني",
    "login.password": "كلمة المرور",
    "login.button": "تسجيل الدخول للوحة التحكم",
    "login.footer": "محمي بتشفير بمستوى الشركات",

    "dashboard.title": "مكتبتي",
    "dashboard.subtitle": "إدارة حسابات Steam الخاصة بك",
    "dashboard.welcome": "مرحباً",
    "dashboard.logout": "تسجيل الخروج",
    "dashboard.empty": "لا توجد ألعاب مضافة إلى حسابك بعد.",
    
    "nav.store": "المتجر",
    "nav.library": "المكتبة",
    "nav.history": "السجل",
    "store.title": "متجر الألعاب",
    "store.subtitle": "تصفح جميع الألعاب المتاحة",
    "store.empty": "لا توجد ألعاب متاحة بعد.",
    "store.owned": "مملوكة",
    "library.empty": "لا تملك أي ألعاب بعد. قم بزيارة المتجر لرؤية الألعاب المتاحة.",

    "status.QUEUED": "في الانتظار",
    "status.PROCESSING": "تسجيل الدخول",
    "status.WAITING_MAIL": "بانتظار البريد",
    "status.DONE": "جاهز",
    "status.ERROR": "خطأ",
    "status.LIMIT": "حد",
    "status.SECURITY": "محظور",

    "status.msg.WAITING_MAIL": "بانتظار رسالة Steam...",
    "status.msg.PROCESSING": "يتم تسجيل الدخول إلى Steam...",
    "status.msg.ERROR": "تعذر الحصول على الرمز. حاول مرة أخرى.",
    "status.msg.LIMIT": "يمكنك طلب رمز Steam Guard لهذه اللعبة مرة واحدة في الأسبوع فقط.",
    "status.msg.SECURITY_BLOCK": "⚠️ تم اكتشاف محاولة تغيير Steam Guard. تم حظر الرمز لحماية الحساب.",
    "status.msg.SECURITY_UNKNOWN": "⚠️ تم اكتشاف نشاط مشبوه. تم حظر الرمز لأسباب أمنية.",

    "code.label": "رمز Steam Guard",
    "account.label": "الحساب:",
    "password.label": "كلمة المرور:",
    "btn.send": "إرسال الرمز",
    "btn.newCode": "الحصول على رمز جديد",
    "btn.blocked": "محظور",
  },
};

interface LangContextValue {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("lang") as Lang | null;
    if (stored && ["en", "ru", "ar"].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", l);
    }
  };

  const t = (key: string) => {
    const dict = dictionaries[lang] || dictionaries.en;
    return dict[key] || dictionaries.en[key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within LanguageProvider");
  }
  return ctx;
}


