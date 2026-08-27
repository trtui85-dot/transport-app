"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface TopbarProps {
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function Topbar({ userName = "User", userRole, onLogout }: TopbarProps) {
  const { t, lang, setLang } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageToggle = () => {
    setLang(lang === "fr" ? "ar" : "fr");
  };

  return (
    <header
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="sticky top-0 z-50 bg-foam border-b border-sand/20 px-4 h-14 flex items-center justify-between"
    >
      <h1 className="text-lg font-bold text-ink">{t("app.name")}</h1>

      <div className="flex items-center gap-2">
        <button
          onClick={handleLanguageToggle}
          className="p-2 rounded-xl hover:bg-sand/30 text-ink/60 transition-colors"
        >
          <Globe size={20} />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl hover:bg-sand/30 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-rope/20 text-rope flex items-center justify-center text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-ink hidden sm:block max-[200px] truncate">
              {userName}
            </span>
            <ChevronDown size={16} className="text-ink/40" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full mt-2 end-0 w-48 bg-foam border border-sand/20 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-sand/10">
                <p className="text-sm font-medium text-ink truncate">{userName}</p>
                {userRole && (
                  <p className="text-xs text-ink/40 mt-0.5">{userRole.replace("_", " ")}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout?.();
                }}
                className="w-full text-start px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
