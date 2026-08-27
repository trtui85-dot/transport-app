"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Building2, Tag, Globe, Moon, Sun, Plus, Pencil, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface User {
  userId: string;
  role: string;
}

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);

  const [darkMode, setDarkMode] = useState(false);

  const isOwner = user?.role === "OWNER";

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {}
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.settings.companyName || "");
        setCompanyAddress(data.settings.companyAddress || "");
        setCompanyPhone(data.settings.companyPhone || "");
        setDarkMode(data.settings.darkMode === "true");
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/expense-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUser();
    fetchSettings();
    fetchCategories();
  }, [fetchUser, fetchSettings, fetchCategories]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("transport:darkMode", darkMode ? "true" : "false");
  }, [darkMode]);

  const saveCompanyInfo = async () => {
    try {
      setSaving(true);
      setError("");
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyAddress,
          companyPhone,
          darkMode: String(darkMode),
        }),
      });
      if (res.ok) {
        setSuccess(t("saved"));
        setTimeout(() => setSuccess(""), 2000);
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName }),
      });
      if (res.ok) {
        setNewCatName("");
        fetchCategories();
      }
    } catch {}
  };

  const handleUpdateCategory = async () => {
    if (!editingCat || !newCatName.trim()) return;
    try {
      const res = await fetch(`/api/expense-categories/${editingCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName }),
      });
      if (res.ok) {
        setEditingCat(null);
        setNewCatName("");
        fetchCategories();
      }
    } catch {}
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/expense-categories/${id}`, { method: "DELETE" });
      if (res.ok) fetchCategories();
    } catch {}
  };

  const handleLanguageChange = (newLang: "ar" | "fr") => {
    setLang(newLang);
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim px-4 py-4">
        <h1 className="text-xl font-bold text-ink">{t("settings")}</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">{success}</div>
        )}

        <div className="bg-foam border border-sand-dim rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-rope" />
            <h2 className="text-sm font-semibold text-ink">{t("company")}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-ink/50 mb-1">{t("name")}</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isOwner}
                className="w-full px-4 py-2.5 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">{t("address")}</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                disabled={!isOwner}
                className="w-full px-4 py-2.5 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">{t("phone2")}</label>
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                disabled={!isOwner}
                className="w-full px-4 py-2.5 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 disabled:opacity-50"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="bg-foam border border-sand-dim rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={18} className="text-rope" />
            <h2 className="text-sm font-semibold text-ink">{t("type")}</h2>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={t("name")}
              className="flex-1 px-4 py-2.5 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  editingCat ? handleUpdateCategory() : handleAddCategory();
                }
              }}
            />
            <button
              onClick={editingCat ? handleUpdateCategory : handleAddCategory}
              className="px-4 py-2.5 bg-rope text-white rounded-xl text-sm font-medium"
            >
              {editingCat ? t("save") : t("add")}
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-2.5 bg-sand rounded-xl">
                <span className="text-sm text-ink">{cat.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingCat(cat); setNewCatName(cat.name); }}
                    className="p-1.5 hover:bg-foam rounded-lg"
                  >
                    <Pencil size={14} className="text-ink/40" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-foam border border-sand-dim rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-rope" />
            <h2 className="text-sm font-semibold text-ink">{t("language")}</h2>
          </div>
          <div className="flex gap-2">
            {(["ar", "fr"] as const).map((l) => (
              <button
                key={l}
                onClick={() => handleLanguageChange(l)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  lang === l
                    ? "bg-rope text-white"
                    : "bg-sand border border-sand-dim text-ink/60"
                }`}
              >
                {l === "ar" ? t("arabic") : t("french")}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-foam border border-sand-dim rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? (
                <Moon size={18} className="text-rope" />
              ) : (
                <Sun size={18} className="text-rope" />
              )}
              <span className="text-sm font-semibold text-ink">{darkMode ? t("darkMode") : t("lightMode")}</span>
            </div>
            <button
              onClick={() => {
                setDarkMode(!darkMode);
                if (isOwner) {
                  fetch("/api/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ darkMode: String(!darkMode) }),
                  }).catch(() => {});
                }
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                darkMode ? "bg-rope" : "bg-sand-dim"
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  darkMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={saveCompanyInfo}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-rope text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? t("loading") : t("save")}
          </button>
        )}
      </div>
    </div>
  );
}
