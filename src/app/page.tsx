"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Globe, Loader2, AlertCircle, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handlePinChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = pin.split("");
    next[i] = digit;
    const newPin = next.join("");
    if (newPin.length <= 4) {
      setPin(newPin);
      if (newPin.length === 4) {
        pinRefs.current[3]?.blur();
      } else if (digit && i < 3) {
        pinRefs.current[i + 1]?.focus();
      }
    }
  };

  const handlePinKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (digits) {
      e.preventDefault();
      setPin(digits);
      pinRefs.current[3]?.focus();
    }
  };

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

  const toggleLang = () => {
    setLang(lang === "ar" ? "fr" : "ar");
  };

  return (
    <form onSubmit={handleLogin} className="min-h-dvh flex flex-col bg-sand">
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
      <div className="flex flex-col items-center px-6 pt-16 pb-10">
        <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg mb-5">
          <img src="/icons/icon-192.png" alt="Transport" className="w-full h-full object-cover" />
        </div>
        <h1
          className="text-3xl font-semibold text-ink font-[family-name:var(--font-display)] text-center leading-snug"
          dir="rtl"
        >
          {lang === "ar" ? "النــــــــــــــــــــــقل" : "Transport"}
        </h1>
      </div>

      <div className="px-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
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
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            {t("pin")}
          </label>
          <div className="flex items-center gap-2" dir="ltr">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                ref={(el) => {
                  pinRefs.current[i] = el;
                }}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                dir="ltr"
                maxLength={1}
                className="w-14 h-14 rounded-xl bg-foam border border-sand-dim text-ink text-center text-xl font-semibold focus:border-rope outline-none"
                value={pin.split("")[i] || ""}
                onChange={(e) => handlePinChange(i, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                onPaste={handlePinPaste}
              />
            ))}
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="w-12 h-14 flex items-center justify-center text-ink-faint hover:text-ink transition-colors"
            >
              {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto px-6 pt-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        <button
          type="submit"
          disabled={loading || !phone || !pin}
          className="w-full h-14 rounded-2xl bg-rope text-white font-semibold text-lg transition-colors hover:bg-rope-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          className="mt-4 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-ink-faint text-sm hover:bg-sand-dim/60 transition-colors"
        >
          <Globe size={16} />
          <span>{lang === "ar" ? "Français" : "العربية"}</span>
        </button>
      </div>
    </form>
  );
}
