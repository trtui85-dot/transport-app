"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, AlertCircle, X, Delete, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.length < 8) {
      showToast("رقم الهاتف يجب أن يتكون من ٨ أرقام");
      return;
    }
    if (pin.length < 4) {
      showToast("أدخل رمز الدخول المكون من ٤ أرقام");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });

      if (!res.ok) {
        showToast("رقم الهاتف أو رمز الدخول غير صحيح");
        return;
      }

      router.push("/dashboard");
    } catch {
      showToast("تعذر الاتصال بالخادم، تحقق من اتصال الإنترنت");
    } finally {
      setLoading(false);
    }
  };

  const pressDigit = (d: string) => {
    if (loading) return;
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => formRef.current?.requestSubmit(), 180);
    }
  };

  const pressDelete = () => {
    if (loading) return;
    setPin(pin.slice(0, -1));
  };

  const confirmPin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    if (pin.length < 4) {
      showToast("أدخل رمز الدخول المكون من ٤ أرقام");
      return;
    }
    formRef.current?.requestSubmit();
  };

  const handlePinBox = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = pin.split("");
    next[i] = digit;
    const newPin = next.join("");
    if (newPin.length <= 4) {
      setPin(newPin);
      if (newPin.length === 4) {
        pinRefs.current[3]?.blur();
        setTimeout(() => formRef.current?.requestSubmit(), 180);
      } else if (digit && i < 3) {
        pinRefs.current[i + 1]?.focus();
      }
    }
  };

  const handlePinBoxKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const next = pin.split("");
      if (next[i]) {
        next[i] = "";
      } else if (i > 0) {
        next[i - 1] = "";
        pinRefs.current[i - 1]?.focus();
      }
      setPin(next.join(""));
    }
  };

  const handlePinBoxPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (digits) {
      e.preventDefault();
      setPin(digits);
      pinRefs.current[3]?.focus();
    }
  };

  const toggleLang = () => {
    setLang(lang === "ar" ? "fr" : "ar");
  };

  const digitClass =
    "select-none h-14 rounded-full bg-foam text-ink text-2xl font-medium flex items-center justify-center shadow-sm active:scale-[0.9] active:bg-sand-dim transition-all duration-150";

  const pinBoxClass =
    "w-14 h-14 rounded-xl bg-foam border border-sand-dim text-ink text-center text-xl font-semibold focus:border-rope outline-none";

  const infoItems =
    lang === "ar"
      ? [
          "حجز وتدبير التذاكر والرحلات بشكل فوري وسلس",
          "متابعة الأسطول والمركبات لحظة بلحظة",
          "إدارة الشحنات وتتبعها عبر أكواد مخصصة",
          "تقارير مالية دقيقة وإغلاق يومي تلقائي",
          "يعمل على الهاتف والحاسوب وفي وضع غير متصل",
        ]
      : [
          "Réservation et gestion des tickets et voyages en temps réel",
          "Suivi de la flotte et des véhicules en direct",
          "Gestion des colis et suivi par codes dédiés",
          "Rapports financiers précis et clôture automatique",
          "Fonctionne sur mobile et ordinateur, même hors ligne",
        ];

  return (
    <form ref={formRef} onSubmit={handleLogin} className="min-h-dvh bg-sand">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
          <div
            className="toast-appear bg-ink/95 text-white rounded-2xl shadow-xl px-4 py-3 flex items-start justify-between gap-3"
            dir="rtl"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm leading-snug">{toast}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast("")}
              className="text-white/60 hover:text-white transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ================= MOBILE ================= */}
      <div className="min-h-dvh flex flex-col bg-sand lg:hidden">
        <div className="flex flex-col items-center px-6 pt-10 pb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg mb-4">
            <img src="/icons/icon-192.png" alt="Transport" className="w-full h-full object-cover" />
          </div>
          <h1
            className="text-2xl font-semibold text-ink font-[family-name:var(--font-display)] text-center leading-snug"
            dir="rtl"
          >
            {lang === "ar" ? "النــــــــــــــــــــــقل" : "Transport"}
          </h1>
        </div>

        <div className="px-6">
          <label className="block text-sm font-medium text-ink mb-1.5 text-center">
            {t("phone")}
          </label>
          <input
            type="tel"
            inputMode="numeric"
            dir="ltr"
            className="mx-auto block w-full max-w-xs h-12 px-4 rounded-xl bg-foam border border-sand-dim text-ink text-center text-lg tracking-widest placeholder:text-ink-faint/50 focus:border-rope outline-none"
            placeholder="43XXXXXX"
            value={phone}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 8);
              setPhone(v);
              if (v.length === 8) e.target.blur();
            }}
            autoFocus
          />
        </div>

        <div className="mt-auto px-6 pt-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <div className="flex flex-col items-center mb-6">
            <p className="text-sm font-medium text-ink mb-4">{t("pin")}</p>
            <div className="flex items-center justify-center gap-4" dir="ltr">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    pin.length > i
                      ? "bg-ink scale-110 shadow-[0_0_0_4px_rgba(11,18,32,0.08)]"
                      : "bg-ink/10 border-2 border-ink/25"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-xs" dir="ltr">
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <button key={n} type="button" onClick={() => pressDigit(n)} className={digitClass}>
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={pressDelete}
                className="select-none h-14 rounded-full text-ink/40 flex items-center justify-center active:scale-90 transition-all duration-150"
              >
                <Delete size={26} />
              </button>
              <button type="button" onClick={() => pressDigit("0")} className={digitClass}>
                0
              </button>
              <button
                type="button"
                onClick={confirmPin}
                className="select-none h-14 rounded-full bg-rope text-white flex items-center justify-center shadow-lg shadow-rope/40 active:scale-90 transition-all duration-150"
              >
                {loading ? <Loader2 size={26} className="animate-spin" /> : <Check size={26} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLang}
            className="mt-6 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-ink-faint text-sm hover:bg-sand-dim/60 transition-colors"
          >
            <Globe size={16} />
            <span>{lang === "ar" ? "Français" : "العربية"}</span>
          </button>
        </div>
      </div>

      {/* ================= DESKTOP ================= */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:min-h-dvh">
        <div className="flex flex-col items-center justify-center px-10 py-10">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg mb-5">
            <img src="/icons/icon-192.png" alt="Transport" className="w-full h-full object-cover" />
          </div>
          <h1
            className="text-3xl font-semibold text-ink font-[family-name:var(--font-display)] text-center leading-snug mb-10"
            dir="rtl"
          >
            {lang === "ar" ? "النــــــــــــــــــــــقل" : "Transport"}
          </h1>

          <div className="w-full max-w-xs">
            <label className="block text-sm font-medium text-ink mb-1.5 text-center">
              {t("phone")}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              dir="ltr"
              className="w-full h-12 px-4 rounded-xl bg-foam border border-sand-dim text-ink text-center text-lg tracking-widest placeholder:text-ink-faint/50 focus:border-rope outline-none"
              placeholder="43XXXXXX"
              value={phone}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                setPhone(v);
                if (v.length === 8) pinRefs.current[0]?.focus();
              }}
            />

            <label className="block text-sm font-medium text-ink mt-6 mb-3 text-center">
              {t("pin")}
            </label>
            <div className="flex items-center justify-center gap-3" dir="ltr">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => {
                    pinRefs.current[i] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={1}
                  className={pinBoxClass}
                  value={pin.split("")[i] || ""}
                  onChange={(e) => handlePinBox(i, e.target.value)}
                  onKeyDown={(e) => handlePinBoxKeyDown(i, e)}
                  onPaste={handlePinBoxPaste}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={confirmPin}
              disabled={loading}
              className="mt-8 w-full h-14 rounded-2xl bg-rope text-white font-semibold text-lg transition-colors hover:bg-rope-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                t("enter")
              )}
            </button>

            <button
              type="button"
              onClick={toggleLang}
              className="mt-6 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-ink-faint text-sm hover:bg-sand-dim/60 transition-colors"
            >
              <Globe size={16} />
              <span>{lang === "ar" ? "Français" : "العربية"}</span>
            </button>
          </div>
        </div>

        <div className="hidden lg:flex flex-col justify-between bg-[#0b1220] text-white px-12 py-12" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden shadow-lg">
              <img src="/icons/icon-192.png" alt="Transport" className="w-full h-full object-cover" />
            </div>
            <p className="text-xl font-semibold font-[family-name:var(--font-display)]">
              {lang === "ar" ? "النــــــــــــــــــــــقل" : "Transport"}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="text-2xl font-semibold leading-snug mb-2">
              {lang === "ar"
                ? "نظامك المتكامل لإدارة النقل البري"
                : "Votre système complet de gestion du transport terrestre"}
            </h2>
            <p className="text-white/60 mb-8">
              {lang === "ar"
                ? "بثقة وموثوقية، يسهّل نظامنا إدارة كامل عمليات شركة النقل الخاصة بك — من التذاكر إلى الشحنات."
                : "Avec confiance et fiabilité, notre système simplifie la gestion de toute votre société de transport — des tickets aux colis."}
            </p>
            <ul className="space-y-4">
              {infoItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rope mt-2 shrink-0" />
                  <span className="text-white/85 leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} {lang === "ar" ? "نظام النقل" : "Transport App"}
          </p>
        </div>
      </div>
    </form>
  );
}