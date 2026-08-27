"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (phone.length < 8) {
      setError(lang === "ar" ? "رقم الهاتف قصير جداً" : "Numéro trop court");
      return;
    }
    if (pin.length < 4) {
      setError(lang === "ar" ? "الرمز قصير جداً" : "Code trop court");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("error"));
        return;
      }

      router.push("/dashboard");
    } catch {
      setError(lang === "ar" ? "خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    setLang(lang === "ar" ? "fr" : "ar");
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm">
        <div className="bg-foam rounded-2xl shadow-lg border border-sand-dim p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-rope flex items-center justify-center mb-4">
              <Truck size={32} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-ink font-[family-name:var(--font-display)] text-center leading-snug">
              {t("appName")}
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                {t("phone")}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                dir="ltr"
                className="w-full h-12 px-4 rounded-xl bg-sand border border-sand-dim text-ink text-center text-lg tracking-widest placeholder:text-ink-faint/50 focus:border-rope"
                placeholder="43XXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                {t("pin")}
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  dir="ltr"
                  className="w-full h-12 px-4 rounded-xl bg-sand border border-sand-dim text-ink text-center text-lg tracking-[0.5em] placeholder:text-ink-faint/50 focus:border-rope"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-2.5 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone || !pin}
              className="w-full h-12 rounded-xl bg-rope text-white font-semibold text-base transition-colors hover:bg-rope-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                t("enter")
              )}
            </button>
          </form>

          <button
            onClick={toggleLang}
            className="mt-6 w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-sand text-ink-faint text-sm hover:bg-sand-dim transition-colors"
          >
            <Globe size={16} />
            <span>{lang === "ar" ? "Français" : "العربية"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
