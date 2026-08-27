"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, X, Phone, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Debt {
  id: string;
  contactName: string;
  contactPhone: string;
  type: string;
  amount: number;
  paidAmount: number;
  status: string;
  description: string | null;
  createdAt: string;
  payments: { id: string; amount: number; date: string }[];
}

interface Branch {
  id: string;
  name: string;
}

type Tab = "RECEIVABLE" | "PAYABLE";

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  OPEN: { color: "text-red-600", bg: "bg-red-100" },
  PARTIAL: { color: "text-yellow-600", bg: "bg-yellow-100" },
  PAID: { color: "text-green-600", bg: "bg-green-100" },
};

export default function DebtsPage() {
  const { t } = useLanguage();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("RECEIVABLE");
  const [showForm, setShowForm] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    type: "RECEIVABLE",
    amount: "",
    branchId: "",
    description: "",
  });

  const [payAmount, setPayAmount] = useState("");

  const fetchDebts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/debts");
      if (res.ok) {
        const data = await res.json();
        setDebts(data.debts || []);
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
    fetchDebts();
    fetchBranches();
  }, [fetchDebts, fetchBranches]);

  const filtered = debts.filter((d) => d.type === activeTab);

  const summary = useMemo(() => {
    const active = debts.filter((d) => d.type === activeTab && d.status !== "PAID");
    const totalAmount = active.reduce((s, d) => s + d.amount, 0);
    const totalPaid = active.reduce((s, d) => s + d.paidAmount, 0);
    const totalRemaining = totalAmount - totalPaid;
    return { totalAmount, totalPaid, totalRemaining, count: active.length };
  }, [debts, activeTab]);

  const handleSubmit = async () => {
    if (!form.contactName.trim() || !form.contactPhone.trim() || !form.amount) {
      setError(t("required"));
      return;
    }

    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({ contactName: "", contactPhone: "", type: activeTab, amount: "", branchId: "", description: "" });
        fetchDebts();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const handlePay = async () => {
    if (!payingDebt || !payAmount || parseFloat(payAmount) <= 0) return;

    try {
      const res = await fetch(`/api/debts/${payingDebt.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmount }),
      });

      if (res.ok) {
        setPayingDebt(null);
        setPayAmount("");
        fetchDebts();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "OPEN": return t("openDebts");
      case "PARTIAL": return t("partiallyPaid");
      case "PAID": return t("paid");
      default: return s;
    }
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">{t("debts")}</h1>
          <button
            onClick={() => {
              setShowForm(true);
              setForm((f) => ({ ...f, type: activeTab }));
              setError("");
              if (branches.length > 0) {
                setForm((f) => ({ ...f, branchId: branches[0].id }));
              }
            }}
            className="flex items-center gap-2 bg-rope text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Plus size={16} />
            {t("add")}
          </button>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          {(["RECEIVABLE", "PAYABLE"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-rope text-white"
                  : "bg-foam text-ink/50 border border-sand-dim"
              }`}
            >
              {tab === "RECEIVABLE" ? t("receivables") : t("payables")}
            </button>
          ))}
        </div>

        <div className="px-4 pb-3">
          <div className="bg-foam border border-sand-dim rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-ink/40">{t("total")}</p>
                <p className="text-sm font-bold text-ink">{summary.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink/40">{t("paid")}</p>
                <p className="text-sm font-bold text-green-600">{summary.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink/40">{t("remaining")}</p>
                <p className="text-sm font-bold text-red-600">{summary.totalRemaining.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((debt) => {
              const remaining = debt.amount - debt.paidAmount;
              const cfg = STATUS_CONFIG[debt.status] || STATUS_CONFIG.OPEN;

              return (
                <div key={debt.id} className="bg-foam border border-sand-dim rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-ink text-sm">{debt.contactName}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-ink/50 mt-0.5">
                        <Phone size={10} />
                        <span dir="ltr">{debt.contactPhone}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                      {statusLabel(debt.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center my-3">
                    <div>
                      <p className="text-[10px] text-ink/40">{t("total")}</p>
                      <p className="text-sm font-bold text-ink">{debt.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink/40">{t("paid")}</p>
                      <p className="text-sm font-bold text-green-600">{debt.paidAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink/40">{t("remaining")}</p>
                      <p className="text-sm font-bold text-red-600">{remaining.toLocaleString()}</p>
                    </div>
                  </div>

                  {debt.description && (
                    <p className="text-xs text-ink/40 mb-2">{debt.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-sand-dim">
                    <div className="flex items-center gap-1.5 text-[10px] text-ink/40">
                      <Clock size={10} />
                      {new Date(debt.createdAt).toLocaleDateString()}
                    </div>
                    {debt.status !== "PAID" && (
                      <button
                        onClick={() => {
                          setPayingDebt(debt);
                          setPayAmount("");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rope/10 text-rope rounded-lg text-xs font-medium"
                      >
                        <DollarSign size={12} />
                        {t("payDebt")}
                      </button>
                    )}
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
              <h2 className="text-lg font-bold text-ink">{t("add")} {t("debts")}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("contactName")}</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("contactPhone")}</label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("type")}</label>
                <div className="flex gap-2">
                  {(["RECEIVABLE", "PAYABLE"] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setForm({ ...form, type: tp })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        form.type === tp
                          ? "bg-rope text-white border-rope"
                          : "bg-sand border-sand-dim text-ink/60"
                      }`}
                    >
                      {tp === "RECEIVABLE" ? t("receivable") : t("payable")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("price")}</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  min="0"
                />
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

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("address")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 resize-none"
                  rows={2}
                />
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

      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPayingDebt(null)} />
          <div className="relative bg-foam rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-ink mb-1">{t("addPayment")}</h3>
            <p className="text-xs text-ink/50 mb-4">
              {payingDebt.contactName} &bull; {t("remaining")}: {(payingDebt.amount - payingDebt.paidAmount).toLocaleString()} {t("mr")}
            </p>

            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={t("price")}
              className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 mb-4"
              min="1"
              max={payingDebt.amount - payingDebt.paidAmount}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setPayingDebt(null)}
                className="flex-1 py-2.5 border border-sand-dim rounded-xl text-sm text-ink/60"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handlePay}
                className="flex-1 py-2.5 bg-rope text-white rounded-xl text-sm font-medium"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
