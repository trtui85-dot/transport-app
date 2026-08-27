"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, DollarSign, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface SalaryEntry {
  id: string;
  month: string;
  base: number;
  commission: number;
  total: number;
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

export default function SalariesPage() {
  const { t } = useLanguage();
  const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const fetchSalaries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/salaries");
      if (res.ok) {
        const data = await res.json();
        setSalaries(data.salaries || []);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  const monthSalaries = useMemo(
    () => salaries.filter((s) => s.month === selectedMonth),
    [salaries, selectedMonth]
  );

  const monthSummary = useMemo(() => {
    const total = monthSalaries.reduce((s, e) => s + e.total, 0);
    const paid = monthSalaries.filter((e) => e.status === "PAID").reduce((s, e) => s + e.total, 0);
    const pending = total - paid;
    return { total, paid, pending, count: monthSalaries.length };
  }, [monthSalaries]);

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

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(parseInt(y), parseInt(mo) - 1);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  };

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
        fetchSalaries();
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
      if (res.ok) fetchSalaries();
    } catch {
      setError(t("error"));
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
              Generate Salaries
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
        ) : monthSalaries.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
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

                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                  <div className="bg-sand rounded-xl py-2">
                    <p className="text-[10px] text-ink/40">{t("base")}</p>
                    <p className="font-semibold text-ink">{salary.base.toLocaleString()}</p>
                  </div>
                  <div className="bg-sand rounded-xl py-2">
                    <p className="text-[10px] text-ink/40">{t("commission")}</p>
                    <p className="font-semibold text-ink">{salary.commission.toLocaleString()}</p>
                  </div>
                  <div className="bg-sand rounded-xl py-2">
                    <p className="text-[10px] text-ink/40">{t("total")}</p>
                    <p className="font-bold text-rope">{salary.total.toLocaleString()}</p>
                  </div>
                </div>

                {salary.status !== "PAID" && salary.status !== "CANCELLED" && (
                  <button
                    onClick={() => handlePay(salary)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-xs font-medium"
                  >
                    <Check size={14} />
                    {t("paySalary")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
