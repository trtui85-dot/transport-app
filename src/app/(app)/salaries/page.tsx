"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  DollarSign,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
  UserPlus,
  UserCheck,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { fmtDate, fmtMonthYear } from "@/lib/datetime";

interface SalaryEntry {
  id: string;
  month: string;
  base: number;
  commission: number;
  total: number;
  deduction: number;
  due: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
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
  branch: { id: string; name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Advance {
  id: string;
  userId: string;
  amount: number;
  note: string | null;
  settledAt: string | null;
  createdAt: string;
}

const ROLES = ["OWNER", "BRANCH_MANAGER", "TICKET_AGENT", "CARGO_AGENT", "DRIVER"] as const;

export default function SalariesPage() {
  const { t, lang } = useLanguage();
  const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [employeeTab, setEmployeeTab] = useState<"existing" | "new">("existing");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [advanceForUser, setAdvanceForUser] = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const [existingForm, setExistingForm] = useState({
    userId: "",
    baseSalary: "",
    commissionPerTrip: "",
  });

  const [newForm, setNewForm] = useState({
    name: "",
    phone: "",
    pin: "",
    role: "TICKET_AGENT",
    branchId: "",
    baseSalary: "",
    commissionPerTrip: "",
  });

  const [advanceForm, setAdvanceForm] = useState({ amount: "", note: "" });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [salRes, userRes, branchRes, advRes] = await Promise.all([
        fetch("/api/salaries"),
        fetch("/api/users"),
        fetch("/api/branches"),
        fetch("/api/user-advances"),
      ]);
      if (salRes.ok) {
        const d = await salRes.json();
        setSalaries(d.salaries || []);
      }
      if (userRes.ok) {
        const d = await userRes.json();
        setUsers(d.users || []);
      }
      if (branchRes.ok) {
        const d = await branchRes.json();
        setBranches(d.branches || []);
      }
      if (advRes.ok) {
        const d = await advRes.json();
        setAdvances(d.advances || []);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const monthSalaries = useMemo(
    () => salaries.filter((s) => s.month === selectedMonth),
    [salaries, selectedMonth]
  );

  const monthSummary = useMemo(() => {
    const total = monthSalaries.reduce((s, e) => s + e.total, 0);
    const paid = monthSalaries
      .filter((e) => e.status === "PAID")
      .reduce((s, e) => s + e.due, 0);
    const pending = monthSalaries
      .filter((e) => e.status !== "PAID" && e.status !== "CANCELLED")
      .reduce((s, e) => s + e.due, 0);
    return { total, paid, pending, count: monthSalaries.length };
  }, [monthSalaries]);

  const unsettledAdvancesFor = (userId: string) =>
    advances.filter((a) => a.userId === userId && !a.settledAt);

  const prevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const formatMonth = (m: string) => fmtMonthYear(`${m}-01T00:00:00`);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError("");
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });

      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setGenerating(false);
    }
  };

  const handlePay = async (salary: SalaryEntry) => {
    try {
      const res = await fetch(`/api/salaries/${salary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (res.ok) fetchAll();
    } catch {
      setError(t("error"));
    }
  };

  const handleAddExisting = async () => {
    if (!existingForm.userId) {
      setError(t("selectEmployee"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${existingForm.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSalary: existingForm.baseSalary ? parseFloat(existingForm.baseSalary) : 0,
          commissionPerTrip: existingForm.commissionPerTrip ? parseFloat(existingForm.commissionPerTrip) : 0,
        }),
      });
      if (res.ok) {
        setShowAddEmployee(false);
        setExistingForm({ userId: "", baseSalary: "", commissionPerTrip: "" });
        fetchAll();
      } else {
        const d = await res.json();
        setError(d.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (!newForm.name || !newForm.phone || !newForm.pin) {
      setError(t("required"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name,
          phone: newForm.phone,
          pin: newForm.pin,
          role: newForm.role,
          branchId: newForm.branchId || null,
          baseSalary: newForm.baseSalary ? parseFloat(newForm.baseSalary) : 0,
          commissionPerTrip: newForm.commissionPerTrip ? parseFloat(newForm.commissionPerTrip) : 0,
        }),
      });
      if (res.ok) {
        setShowAddEmployee(false);
        setNewForm({
          name: "",
          phone: "",
          pin: "",
          role: "TICKET_AGENT",
          branchId: branches[0]?.id || "",
          baseSalary: "",
          commissionPerTrip: "",
        });
        fetchAll();
      } else {
        const d = await res.json();
        setError(d.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdvance = async () => {
    if (!advanceForUser || !advanceForm.amount || parseFloat(advanceForm.amount) <= 0) {
      setError(t("advanceAmount"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: advanceForUser.id,
          amount: parseFloat(advanceForm.amount),
          note: advanceForm.note.trim() || null,
        }),
      });
      if (res.ok) {
        setAdvanceForUser(null);
        setAdvanceForm({ amount: "", note: "" });
        fetchAll();
      } else {
        const d = await res.json();
        setError(d.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "PAID": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
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

  const sheetClass =
    "absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]";

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-ink mb-3">{t("salaries")}</h1>

          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-2 bg-foam border border-sand-dim rounded-xl">
              <ChevronLeft size={16} className="text-ink/60" />
            </button>
            <span className="text-sm font-semibold text-ink">{formatMonth(selectedMonth)}</span>
            <button onClick={nextMonth} className="p-2 bg-foam border border-sand-dim rounded-xl">
              <ChevronRight size={16} className="text-ink/60" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 bg-rope text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              {t("generateSalaries")}
            </button>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center justify-center gap-2 bg-foam border border-rope/30 text-rope px-4 py-2 rounded-xl text-sm font-medium"
            >
              <Plus size={16} />
              {t("addEmployee")}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="bg-foam border border-sand-dim rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-ink/40">{t("total")}</p>
                <p className="text-sm font-bold text-ink">{monthSummary.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink/40">{t("paid")}</p>
                <p className="text-sm font-bold text-green-600">{monthSummary.paid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink/40">{t("remaining")}</p>
                <p className="text-sm font-bold text-yellow-600">{monthSummary.pending.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : (
          <>
            {/* Employees Section */}
            <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <UserCheck size={16} className="text-rope" />
              {t("employees")}
              <span className="text-xs text-ink/40 font-normal">({users.filter((u) => u.active).length})</span>
            </h2>

            {users.length === 0 ? (
              <div className="text-center py-8 text-ink/40 text-sm">{t("noResults")}</div>
            ) : (
              <div className="space-y-2 mb-6">
                {users.map((u) => {
                  const unsettled = unsettledAdvancesFor(u.id);
                  const advTotal = unsettled.reduce((s, a) => s + a.amount, 0);
                  const isOpen = expandedEmployee === u.id;
                  return (
                    <div key={u.id} className="bg-foam border border-sand-dim rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedEmployee(isOpen ? null : u.id)}
                        className="w-full p-4 text-start"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-sand flex items-center justify-center shrink-0">
                            <UserPlus size={18} className="text-ink-faint" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-semibold text-ink truncate">{u.name}</p>
                                <span className="text-[9px] text-ink/40 bg-sand rounded px-1.5 py-0.5 shrink-0">
                                  {roleLabel(u.role)}
                                </span>
                              </div>
                              {isOpen ? (
                                <ChevronUp size={14} className="text-ink/40 shrink-0" />
                              ) : (
                                <ChevronDown size={14} className="text-ink/40 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[11px] text-ink/40">
                                {t("monthlySalary")}:{" "}
                                <span className="font-semibold text-ink">
                                  {(u.baseSalary + u.commissionPerTrip).toLocaleString()} {t("mr")}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-sand-dim">—</span>
                              {advTotal > 0 ? (
                                <span className="text-[10px] font-medium text-red-600">
                                  {t("advances")}: {advTotal.toLocaleString()} {t("mr")}
                                </span>
                              ) : (
                                <span className="text-[10px] text-ink/30">{t("advances")}: 0</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-sand-dim px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-center text-xs">
                            <div className="bg-sand rounded-xl py-2">
                              <p className="text-[10px] text-ink/40">{t("base")}</p>
                              <p className="font-semibold text-ink">{u.baseSalary.toLocaleString()}</p>
                            </div>
                            <div className="bg-sand rounded-xl py-2">
                              <p className="text-[10px] text-ink/40">{t("commission")}</p>
                              <p className="font-semibold text-ink">{u.commissionPerTrip.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="bg-sand rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold text-ink/40">{t("advances")}</p>
                              <span className="text-[10px] font-semibold text-red-600">
                                {advTotal.toLocaleString()} {t("mr")}
                              </span>
                            </div>
                            {unsettled.length === 0 ? (
                              <p className="text-[11px] text-ink/30">{t("noResults")}</p>
                            ) : (
                              unsettled.map((a) => (
                                <div key={a.id} className="flex items-center justify-between text-[11px]">
                                  <span className="text-ink/60">
                                    {fmtDate(a.createdAt)}
                                    {a.note ? ` · ${a.note}` : ""}
                                  </span>
                                  <span className="font-semibold text-ink">{a.amount.toLocaleString()}</span>
                                </div>
                              ))
                            )}
                          </div>

                          <button
                            onClick={() => setAdvanceForUser(u)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-rope/30 bg-rope/5 text-rope rounded-xl text-xs font-medium"
                          >
                            <Wallet size={14} />
                            {t("addAdvance")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Month salaries */}
            <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-rope" />
              {formatMonth(selectedMonth)}
            </h2>

            {monthSalaries.length === 0 ? (
              <div className="text-center py-8 text-ink/40 text-sm">{t("noSalaryYet")}</div>
            ) : (
              <div className="space-y-2">
                {monthSalaries.map((salary) => (
                  <div key={salary.id} className="bg-foam border border-sand-dim rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-ink text-sm">{salary.user.name}</h3>
                        <span className="text-[10px] text-ink/40">{roleLabel(salary.user.role)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(salary.status)}`}>
                        {salary.status === "PAID" ? t("paid") : salary.status === "CANCELLED" ? t("cancelled") : t("remaining")}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
                      <div className="bg-sand rounded-xl py-2">
                        <p className="text-[10px] text-ink/40">{t("base")}</p>
                        <p className="font-semibold text-ink">{salary.base.toLocaleString()}</p>
                      </div>
                      <div className="bg-sand rounded-xl py-2">
                        <p className="text-[10px] text-ink/40">{t("commission")}</p>
                        <p className="font-semibold text-ink">{salary.commission.toLocaleString()}</p>
                      </div>
                      <div className="bg-sand rounded-xl py-2">
                        <p className="text-[10px] text-ink/40">{t("advanceDeduction")}</p>
                        <p className={`font-semibold ${salary.deduction > 0 ? "text-red-600" : "text-ink/40"}`}>
                          {salary.deduction.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-sand rounded-xl py-2">
                        <p className="text-[10px] text-ink/40">{t("dueSalary")}</p>
                        <p className={`font-bold ${salary.due >= 0 ? "text-rope" : "text-red-600"}`}>
                          {salary.due.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {salary.status !== "PAID" && salary.status !== "CANCELLED" && (
                      <button
                        onClick={() => handlePay(salary)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-xs font-medium"
                      >
                        <Check size={14} />
                        {t("paySalary")} · {salary.due.toLocaleString()} {t("mr")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Employee Sheet */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddEmployee(false)} />
          <div className={sheetClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">{t("addEmployee")}</h2>
              <button onClick={() => setShowAddEmployee(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setEmployeeTab("existing")}
                className={`flex-1 h-9 rounded-xl text-xs font-medium transition-colors ${
                  employeeTab === "existing" ? "bg-rope text-white" : "bg-sand text-ink/50"
                }`}
              >
                {t("existingUser")}
              </button>
              <button
                onClick={() => setEmployeeTab("new")}
                className={`flex-1 h-9 rounded-xl text-xs font-medium transition-colors ${
                  employeeTab === "new" ? "bg-rope text-white" : "bg-sand text-ink/50"
                }`}
              >
                {t("newEmployee")}
              </button>
            </div>

            {employeeTab === "existing" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">{t("selectEmployee")}</label>
                  <select
                    value={existingForm.userId}
                    onChange={(e) => {
                      const u = users.find((x) => x.id === e.target.value);
                      setExistingForm({
                        userId: e.target.value,
                        baseSalary: u ? String(u.baseSalary) : "",
                        commissionPerTrip: u ? String(u.commissionPerTrip) : "",
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm appearance-none"
                  >
                    <option value="">{t("selectEmployee")}...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({roleLabel(u.role)}){u.baseSalary > 0 || u.commissionPerTrip > 0 ? ` · ${(u.baseSalary + u.commissionPerTrip).toLocaleString()} MR` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      {t("monthlySalary")} ({t("mr")})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={existingForm.baseSalary}
                      onChange={(e) => setExistingForm({ ...existingForm, baseSalary: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      {t("commission")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={existingForm.commissionPerTrip}
                      onChange={(e) => setExistingForm({ ...existingForm, commissionPerTrip: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddEmployee(false)}
                    className="flex-1 h-12 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleAddExisting}
                    disabled={saving}
                    className="flex-1 h-12 bg-rope text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {t("save")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">{t("name")} *</label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">{t("phone")} *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      dir="ltr"
                      value={newForm.phone}
                      onChange={(e) => setNewForm({ ...newForm, phone: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">{t("pin")} *</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={newForm.pin}
                      onChange={(e) => setNewForm({ ...newForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm text-center"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">{t("type")}</label>
                    <select
                      value={newForm.role}
                      onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm appearance-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{roleLabel(r)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">{t("branches")}</label>
                    <select
                      value={newForm.branchId}
                      onChange={(e) => setNewForm({ ...newForm, branchId: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm appearance-none"
                    >
                      <option value="">--</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      {t("monthlySalary")} ({t("mr")})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newForm.baseSalary}
                      onChange={(e) => setNewForm({ ...newForm, baseSalary: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">{t("commission")}</label>
                    <input
                      type="number"
                      min="0"
                      value={newForm.commissionPerTrip}
                      onChange={(e) => setNewForm({ ...newForm, commissionPerTrip: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddEmployee(false)}
                    className="flex-1 h-12 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleAddNew}
                    disabled={saving}
                    className="flex-1 h-12 bg-rope text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {t("save")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Advance Sheet */}
      {advanceForUser && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdvanceForUser(null)} />
          <div className={sheetClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">
                {t("addAdvance")} - {advanceForUser.name}
              </h2>
              <button onClick={() => setAdvanceForUser(null)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  {t("advanceAmount")} ({t("mr")}) *
                </label>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl bg-sand border border-sand-dim text-ink text-lg font-bold text-center"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">{t("advanceNote")}</label>
                <input
                  type="text"
                  value={advanceForm.note}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, note: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm"
                  placeholder={lang === "ar" ? "سبب السلفة مثلا" : "Raison de l'avance"}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAdvanceForUser(null)}
                  className="flex-1 h-12 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleAddAdvance}
                  disabled={saving}
                  className="flex-1 h-12 bg-rope text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                  {t("confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}