"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Users, Pencil, Trash2, X, UserCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Branch {
  id: string;
  name: string;
}

interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  branchId: string | null;
  baseSalary: number;
  commissionPerTrip: number;
  active: boolean;
  createdAt: string;
  branch: { id: string; name: string } | null;
}

const ROLE_CONFIG: Record<string, { color: string; bg: string }> = {
  OWNER: { color: "text-purple-700", bg: "bg-purple-100" },
  BRANCH_MANAGER: { color: "text-blue-700", bg: "bg-blue-100" },
  TICKET_AGENT: { color: "text-green-700", bg: "bg-green-100" },
  CARGO_AGENT: { color: "text-orange-700", bg: "bg-orange-100" },
  DRIVER: { color: "text-indigo-700", bg: "bg-indigo-100" },
};

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    pin: "",
    role: "TICKET_AGENT",
    branchId: "",
    baseSalary: "",
    commissionPerTrip: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, [fetchUsers, fetchBranches]);

  const openAdd = () => {
    setEditingUser(null);
    setForm({
      name: "",
      phone: "",
      pin: "",
      role: "TICKET_AGENT",
      branchId: branches[0]?.id || "",
      baseSalary: "",
      commissionPerTrip: "",
    });
    setShowForm(true);
    setError("");
  };

  const openEdit = (u: AppUser) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      phone: u.phone,
      pin: "",
      role: u.role,
      branchId: u.branchId || "",
      baseSalary: String(u.baseSalary || ""),
      commissionPerTrip: String(u.commissionPerTrip || ""),
    });
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.role) {
      setError(t("required"));
      return;
    }

    if (!editingUser && !form.pin.trim()) {
      setError(t("required"));
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: Record<string, string> = {
        name: form.name,
        phone: form.phone,
        role: form.role,
        branchId: form.branchId,
        baseSalary: form.baseSalary || "0",
        commissionPerTrip: form.commissionPerTrip || "0",
      };
      if (form.pin) body.pin = form.pin;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowForm(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleDelete = async (u: AppUser) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        fetchUsers();
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleToggleActive = async (u: AppUser) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !u.active }),
      });
      if (res.ok) fetchUsers();
    } catch {}
  };

  const roleLabel = (r: string) => {
    switch (r) {
      case "OWNER": return t("owner");
      case "BRANCH_MANAGER": return t("manager");
      case "TICKET_AGENT": return t("ticketAgent");
      case "CARGO_AGENT": return t("cargoAgent");
      case "DRIVER": return t("driver");
      default: return r;
    }
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{t("users")}</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-rope text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          {t("add")}
        </button>
      </div>

      <div className="px-4 pt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.TICKET_AGENT;
              return (
                <div key={u.id} className="bg-foam border border-sand-dim rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rope/10 flex items-center justify-center">
                        <Users size={18} className="text-rope" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink text-sm">{u.name}</h3>
                        <p className="text-xs text-ink/50" dir="ltr">{u.phone}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                        {roleLabel(u.role)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {u.active ? t("active") : t("inactive")}
                      </span>
                    </div>
                  </div>

                  {u.branch && (
                    <p className="text-xs text-ink/50 mb-2">{u.branch.name}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-ink/50 mb-3">
                    <div>
                      <span>{t("base")}: </span>
                      <span className="font-medium text-ink">{u.baseSalary.toLocaleString()}</span>
                    </div>
                    <div>
                      <span>{t("commission")}: </span>
                      <span className="font-medium text-ink">{u.commissionPerTrip.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-sand-dim">
                    <button
                      onClick={() => openEdit(u)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sand/50 hover:bg-sand rounded-lg text-xs text-ink/60 transition-colors"
                    >
                      <Pencil size={12} />
                      {t("edit")}
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        u.active
                          ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-600"
                          : "bg-green-50 hover:bg-green-100 text-green-600"
                      }`}
                    >
                      <UserCheck size={12} />
                      {u.active ? t("inactive") : t("active")}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(u)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-xs text-red-600 transition-colors"
                    >
                      <Trash2 size={12} />
                      {t("delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink">
                {editingUser ? t("edit") : t("add")} {t("users")}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("name")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("pin")}</label>
                <input
                  type="password"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  placeholder={editingUser ? "(leave blank to keep)" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("type")}</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                >
                  <option value="OWNER">{t("owner")}</option>
                  <option value="BRANCH_MANAGER">{t("manager")}</option>
                  <option value="TICKET_AGENT">{t("ticketAgent")}</option>
                  <option value="CARGO_AGENT">{t("cargoAgent")}</option>
                  <option value="DRIVER">{t("driver")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("branches")}</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                >
                  <option value="">--</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("base")}</label>
                  <input
                    type="number"
                    value={form.baseSalary}
                    onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                    className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("commission")}</label>
                  <input
                    type="number"
                    value={form.commissionPerTrip}
                    onChange={(e) => setForm({ ...form, commissionPerTrip: e.target.value })}
                    className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
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
            <p className="text-sm text-ink/60 mb-6">
              {t("confirmDeleteMessage")} - {confirmDelete.name}
            </p>
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
