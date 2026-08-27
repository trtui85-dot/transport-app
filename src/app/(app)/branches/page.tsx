"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Building2, Phone, MapPin, X, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Branch {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
}

interface User {
  userId: string;
  role: string;
  branchId?: string | null;
}

export default function BranchesPage() {
  const { t } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
  });

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

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUser();
    fetchBranches();
  }, [fetchUser, fetchBranches]);

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase()) ||
      (b.phone && b.phone.includes(search))
  );

  const openAdd = () => {
    setEditingBranch(null);
    setForm({ name: "", city: "", address: "", phone: "" });
    setShowSheet(true);
    setError("");
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      city: branch.city,
      address: branch.address || "",
      phone: branch.phone || "",
    });
    setShowSheet(true);
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      setError(t("required"));
      return;
    }

    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches";
      const method = editingBranch ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowSheet(false);
        fetchBranches();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleDelete = async (branch: Branch) => {
    try {
      const res = await fetch(`/api/branches/${branch.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        fetchBranches();
      }
    } catch {
      setError(t("error"));
    }
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">{t("branches")}</h1>
          {isOwner && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-rope text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              <Plus size={16} />
              {t("add")}
            </button>
          )}
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-foam border border-sand-dim rounded-xl text-sm text-ink placeholder:text-ink/40 outline-none focus:border-rope/50"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((branch) => (
              <div
                key={branch.id}
                className="bg-foam border border-sand-dim rounded-2xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rope/10 flex items-center justify-center">
                      <Building2 size={20} className="text-rope" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink text-sm">{branch.name}</h3>
                      <p className="text-xs text-ink/50">{branch.city}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      branch.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {branch.active ? t("active") : t("inactive")}
                  </span>
                </div>

                {branch.phone && (
                  <div className="flex items-center gap-2 text-xs text-ink/60 mb-1.5">
                    <Phone size={12} />
                    <span dir="ltr">{branch.phone}</span>
                  </div>
                )}
                {branch.address && (
                  <div className="flex items-center gap-2 text-xs text-ink/60 mb-3">
                    <MapPin size={12} />
                    <span>{branch.address}</span>
                  </div>
                )}

                {isOwner && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-sand-dim">
                    <button
                      onClick={() => openEdit(branch)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sand/50 hover:bg-sand rounded-lg text-xs text-ink/60 transition-colors"
                    >
                      <Pencil size={12} />
                      {t("edit")}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(branch)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-xs text-red-600 transition-colors"
                    >
                      <Trash2 size={12} />
                      {t("delete")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink">
                {editingBranch ? t("edit") : t("add")} {t("branches")}
              </h2>
              <button onClick={() => setShowSheet(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("branchName")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("city")}</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("address")}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("phone2")}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSheet(false)}
                className="flex-1 py-3 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-rope text-white rounded-xl text-sm font-medium"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-foam rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-ink mb-2">{t("confirmDeleteTitle")}</h3>
            <p className="text-sm text-ink/60 mb-6">{t("confirmDeleteMessage")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-sand-dim rounded-xl text-sm text-ink/60"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
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
