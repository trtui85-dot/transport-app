"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Building2,
  Tag,
  Globe,
  Moon,
  Sun,
  Plus,
  Pencil,
  Trash2,
  X,
  Wallet,
  Upload,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  nameAr: string;
  logo: string | null;
  isCredit: boolean;
  active: boolean;
  sortOrder: number;
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

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodForm, setMethodForm] = useState({
    name: "",
    nameAr: "",
    logo: "",
    isCredit: false,
  });
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [confirmDeleteMethod, setConfirmDeleteMethod] = useState<PaymentMethod | null>(null);

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

  const fetchMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/payment-methods?all=1");
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUser();
    fetchSettings();
    fetchCategories();
    fetchMethods();
  }, [fetchUser, fetchSettings, fetchCategories, fetchMethods]);

  useEffect(() => {
    const stored = localStorage.getItem("transport:theme");
    if (stored) {
      setDarkMode(stored === "dark");
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("transport:theme", darkMode ? "dark" : "light");
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

  const openAddMethod = () => {
    setEditingMethod(null);
    setMethodForm({ name: "", nameAr: "", logo: "", isCredit: false });
    setShowMethodForm(true);
  };

  const openEditMethod = (m: PaymentMethod) => {
    setEditingMethod(m);
    setMethodForm({
      name: m.name,
      nameAr: m.nameAr,
      logo: m.logo || "",
      isCredit: m.isCredit,
    });
    setShowMethodForm(true);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t("logoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMethodForm((prev) => ({ ...prev, logo: String(reader.result) }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveMethod = async () => {
    if (!methodForm.name.trim()) return;
    try {
      const url = editingMethod
        ? `/api/payment-methods/${editingMethod.id}`
        : "/api/payment-methods";
      const method = editingMethod ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(methodForm),
      });
      if (res.ok) {
        setShowMethodForm(false);
        setEditingMethod(null);
        fetchMethods();
      }
    } catch {}
  };

  const handleToggleMethod = async (m: PaymentMethod) => {
    try {
      const res = await fetch(`/api/payment-methods/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !m.active }),
      });
      if (res.ok) fetchMethods();
    } catch {}
  };

  const handleDeleteMethod = async (m: PaymentMethod) => {
    try {
      const res = await fetch(`/api/payment-methods/${m.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteMethod(null);
        fetchMethods();
      }
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
              <label className="block text-xs text-ink/50 mb-1.5">{t("name")}</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isOwner}
                className="w-full h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1.5">{t("address")}</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                disabled={!isOwner}
                className="w-full h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1.5">{t("phone2")}</label>
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                disabled={!isOwner}
                className="w-full h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 disabled:opacity-50"
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
              className="flex-1 h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  editingCat ? handleUpdateCategory() : handleAddCategory();
                }
              }}
            />
            <button
              onClick={editingCat ? handleUpdateCategory : handleAddCategory}
              className="h-12 px-5 bg-rope text-white rounded-xl text-sm font-medium"
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">{t("paymentMethods")}</h2>
            </div>
            <button
              onClick={openAddMethod}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rope text-white rounded-lg text-xs font-medium"
            >
              <Plus size={14} />
              {t("add")}
            </button>
          </div>

          {methods.length === 0 ? (
            <p className="text-xs text-ink/40 text-center py-4">{t("noResults")}</p>
          ) : (
            <div className="space-y-2">
              {methods.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-2.5 bg-sand rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-sand-dim flex items-center justify-center overflow-hidden">
                      {m.logo ? (
                        <img src={m.logo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Wallet size={16} className="text-ink/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                        {lang === "ar" && m.nameAr ? m.nameAr : m.name}
                        {m.isCredit && (
                          <span className="px-1.5 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-semibold shrink-0">
                            {lang === "ar" ? "أجل" : "Ajl"}
                          </span>
                        )}
                      </p>
                      {m.nameAr && m.nameAr !== m.name && lang === "fr" && (
                        <p className="text-[10px] text-ink/40 truncate">{m.nameAr}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleMethod(m)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        m.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {m.active ? t("active") : t("inactive")}
                    </button>
                    <button
                      onClick={() => openEditMethod(m)}
                      className="p-1.5 hover:bg-foam rounded-lg"
                    >
                      <Pencil size={14} className="text-ink/40" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteMethod(m)}
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {showMethodForm && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMethodForm(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink">
                {editingMethod ? t("edit") : t("add")} {t("paymentMethods")}
              </h2>
              <button onClick={() => setShowMethodForm(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("methodName")}</label>
                <input
                  type="text"
                  value={methodForm.name}
                  onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("methodNameAr")}</label>
                <input
                  type="text"
                  value={methodForm.nameAr}
                  onChange={(e) => setMethodForm({ ...methodForm, nameAr: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">
                  {t("logo")}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 shrink-0 rounded-xl bg-sand border border-sand-dim overflow-hidden flex items-center justify-center">
                    {methodForm.logo ? (
                      <img
                        src={methodForm.logo}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Wallet size={24} className="text-ink/40" />
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center h-16 rounded-xl border-2 border-dashed border-sand-dim text-xs text-ink/50 cursor-pointer hover:border-rope transition-colors">
                    <Upload size={18} className="mb-1" />
                    {t("uploadLogo")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFile}
                    />
                  </label>
                  {methodForm.logo && (
                    <button
                      onClick={() => setMethodForm({ ...methodForm, logo: "" })}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-xl shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between bg-sand rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{t("payOnArrival")}</p>
                  <p className="text-xs text-ink/40 mt-0.5">
                    {t("payOnArrivalHint")}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setMethodForm({ ...methodForm, isCredit: !methodForm.isCredit })
                  }
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    methodForm.isCredit ? "bg-warning" : "bg-sand-dim"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      methodForm.isCredit ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMethodForm(false)}
                className="flex-1 py-3 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveMethod}
                className="flex-1 py-3 bg-rope text-white rounded-xl text-sm font-medium"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteMethod(null)} />
          <div className="relative bg-foam rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-ink mb-2">{t("confirmDeleteTitle")}</h3>
            <p className="text-sm text-ink/60 mb-6">
              {t("confirmDeleteMessage")} -{" "}
              {lang === "ar" && confirmDeleteMethod.nameAr
                ? confirmDeleteMethod.nameAr
                : confirmDeleteMethod.name}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteMethod(null)}
                className="flex-1 py-2.5 border border-sand-dim rounded-xl text-sm text-ink/60"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDeleteMethod(confirmDeleteMethod)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
