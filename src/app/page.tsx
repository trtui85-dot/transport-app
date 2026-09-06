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

  const toggleLang = () => {
    setLang(lang === "ar" ? "fr" : "ar");
  };

  const digitClass =
    "select-none h-14 rounded-full bg-foam text-ink text-2xl font-medium flex items-center justify-center shadow-sm active:scale-[0.9] active:bg-sand-dim transition-all duration-150";

  return (
    <form ref={formRef} onSubmit={handleLogin} className="min-h-dvh flex flex-col bg-sand">
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
    </form>
  );
}