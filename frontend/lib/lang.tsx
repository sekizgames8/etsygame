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
    "nav.help": "How to Use",
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

    "help.title": "How to Use",
    "help.howto.title": "How to Get Steam Guard Code",
    "help.howto.step1": "Go to Library and find the game you own.",
    "help.howto.step2": "Open Steam on your device and log in with the provided account credentials.",
    "help.howto.step3": "Click 'Send Code' button on the game card.",
    "help.howto.step4": "When Steam asks for the code, it will automatically appear on the game card. Enter the code into Steam.",
    "help.warnings.title": "Important Warnings",
    "help.warnings.item1": "You can request a code only once per week for each game.",
    "help.warnings.item2": "The code is valid for a short time. Use it immediately when you see it.",
    "help.warnings.item3": "Do not share your code with anyone else.",
    "help.forbidden.title": "Prohibited Actions",
    "help.forbidden.item1": "Do NOT add Steam Guard Mobile Authenticator to the account. This will block your access permanently.",
    "help.forbidden.item2": "Do NOT change account password or email address.",
    "help.forbidden.item3": "Do NOT share the account credentials with third parties.",
    "help.forbidden.item4": "Do NOT attempt to recover or transfer account ownership.",
    "help.security.title": "Security Notice",
    "help.security.desc": "Our system monitors all login attempts. Any attempt to add authenticator or change security settings will be detected and blocked automatically. Violators will lose access to all games.",
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
    "nav.help": "Как использовать",
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

    "help.title": "Как использовать",
    "help.howto.title": "Как получить код Steam Guard",
    "help.howto.step1": "Перейдите в Библиотеку и найдите игру, которой вы владеете.",
    "help.howto.step2": "Откройте Steam на своём устройстве и войдите с указанными учётными данными.",
    "help.howto.step3": "Нажмите кнопку 'Отправить код' на карточке игры.",
    "help.howto.step4": "Когда Steam запросит код, он автоматически появится на карточке игры. Введите код в Steam.",
    "help.warnings.title": "Важные предупреждения",
    "help.warnings.item1": "Вы можете запрашивать код только раз в неделю для каждой игры.",
    "help.warnings.item2": "Код действителен короткое время. Используйте его сразу, как увидите.",
    "help.warnings.item3": "Не делитесь своим кодом с другими людьми.",
    "help.forbidden.title": "Запрещённые действия",
    "help.forbidden.item1": "НЕ добавляйте мобильный аутентификатор Steam Guard к аккаунту. Это навсегда заблокирует ваш доступ.",
    "help.forbidden.item2": "НЕ меняйте пароль или email аккаунта.",
    "help.forbidden.item3": "НЕ передавайте учётные данные третьим лицам.",
    "help.forbidden.item4": "НЕ пытайтесь восстановить или передать право собственности на аккаунт.",
    "help.security.title": "Уведомление о безопасности",
    "help.security.desc": "Наша система отслеживает все попытки входа. Любая попытка добавить аутентификатор или изменить настройки безопасности будет обнаружена и заблокирована автоматически. Нарушители потеряют доступ ко всем играм.",
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
    "nav.help": "كيفية الاستخدام",
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

    "help.title": "كيفية الاستخدام",
    "help.howto.title": "كيفية الحصول على رمز Steam Guard",
    "help.howto.step1": "انتقل إلى المكتبة وابحث عن اللعبة التي تملكها.",
    "help.howto.step2": "افتح Steam على جهازك وسجّل الدخول باستخدام بيانات الحساب المقدمة.",
    "help.howto.step3": "انقر على زر 'إرسال الرمز' في بطاقة اللعبة.",
    "help.howto.step4": "عندما يطلب Steam الرمز، سيظهر تلقائياً على بطاقة اللعبة. أدخل الرمز في Steam.",
    "help.warnings.title": "تحذيرات مهمة",
    "help.warnings.item1": "يمكنك طلب رمز مرة واحدة فقط في الأسبوع لكل لعبة.",
    "help.warnings.item2": "الرمز صالح لفترة قصيرة. استخدمه فوراً عندما تراه.",
    "help.warnings.item3": "لا تشارك رمزك مع أي شخص آخر.",
    "help.forbidden.title": "الإجراءات المحظورة",
    "help.forbidden.item1": "لا تُضف مصادق Steam Guard المحمول إلى الحساب. سيؤدي ذلك إلى حظر وصولك بشكل دائم.",
    "help.forbidden.item2": "لا تُغيّر كلمة مرور الحساب أو عنوان البريد الإلكتروني.",
    "help.forbidden.item3": "لا تُشارك بيانات الحساب مع أطراف ثالثة.",
    "help.forbidden.item4": "لا تحاول استعادة أو نقل ملكية الحساب.",
    "help.security.title": "إشعار الأمان",
    "help.security.desc": "يراقب نظامنا جميع محاولات تسجيل الدخول. سيتم اكتشاف أي محاولة لإضافة مصادق أو تغيير إعدادات الأمان وحظرها تلقائياً. سيفقد المخالفون الوصول إلى جميع الألعاب.",
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


