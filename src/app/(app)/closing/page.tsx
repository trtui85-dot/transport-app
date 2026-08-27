"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Ticket, Package, Wallet, ShieldCheck, Lock,
  ArrowDownToLine, Building2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import ConfirmDialog from "@/components/confirm-dialog";

interface Branch {
  id: string;
  name: string;
  city: string;
}

interface TransactionItem {
  id: string;
  type: "TICKET" | "CARGO" | "EXPENSE";
  label: string;
  amount: number;
  time: string;
  passengerName?: string;
  trackingCode?: string;
  description?: string;
  paymentMethod?: string;
}

interface Summary {
  tickets: number;
  ticketRevenue: number;
  cargo: number;
  cargoRevenue: number;
  expenses: number;
  expenseAmount: number;
  net: number;
}

interface ClosingData {
  date: string;
  branch: Branch;
  closed: boolean;
  closedAt: string | null;
  summary: Summary;
  transactions: TransactionItem[];
}

export default function ClosingPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<ClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchClosing = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/closing");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError("");
      } else {
        const json = await res.json();
        setError(json.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchClosing();
  }, [fetchClosing]);

  const fmt = (n: number) => `${n.toLocaleString()} ${t("mr")}`;

  const handleClose = async () => {
    setClosing(true);
    setError("");
    try {
      const res = await fetch("/api/closing", { method: "POST" });
      if (res.ok) {
        fetchClosing();
      } else {
        const json = await res.json();
        setError(json.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center py-20">
        <div className="text-ink/40">{t("loading")}</div>
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const isClosed = data.closed;

  const typeMeta = (type: TransactionItem["type"]) => {
    switch (type) {
      case "TICKET":
        return {
          icon: Ticket,
          badge: "bg-rope/10 text-rope",
          label: lang === "ar" ? "تذكرة" : "Ticket",
        };
      case "CARGO":
        return {
          icon: Package,
          badge: "bg-sea/10 text-sea",
          label: lang === "ar" ? "شحنة" : "Cargo",
        };
      default:
        return {
          icon: Wallet,
          badge: "bg-danger/10 text-danger",
          label: lang === "ar" ? "مصروف" : "Expense",
        };
    }
  };

  const stats = [
    {
      label: lang === "ar" ? "التذاكر" : "Tickets",
      count: s.tickets,
      amount: s.ticketRevenue,
      icon: Ticket,
      color: "bg-rope/10 text-rope",
    },
    {
      label: lang === "ar" ? "الشحنات" : "Cargo",
      count: s.cargo,
      amount: s.cargoRevenue,
      icon: Package,
      color: "bg-sea/10 text-sea",
    },
    {
      label: lang === "ar" ? "المصاريف" : "Expenses",
      count: s.expenses,
      amount: s.expenseAmount,
      icon: Wallet,
      color: "bg-danger/10 text-danger",
    },
  ];

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-ink">
          {lang === "ar" ? "الإغلاق اليومي" : "Daily closing"}
        </h1>
        <p className="text-xs text-ink/40 mt-0.5 flex items-center gap-1">
          <Building2 size={12} className="text-rope" />
          {data.branch.name} · {data.branch.city || ""}
        </p>
      </div>

      <div className="px-4">
        {isClosed && (
          <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
            <ShieldCheck size={24} className="text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-700">
                {lang === "ar" ? "تم إغلاق اليوم" : "Day closed"}
              </p>
              <p className="text-xs text-green-600/70">
                {data.closedAt
                  ? new Date(data.closedAt).toLocaleString()
                  : data.date}
              </p>
            </div>
            <Lock size={18} className="text-green-600/50" />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">
            {error}
          </div>
        )}

        <div
          className={`rounded-2xl p-5 mb-4 border ${
            s.net >= 0
              ? "bg-success/10 border-success/20"
              : "bg-danger/10 border-danger/20"
          }`}
        >
          <p className="text-sm font-medium text-ink/60">
            {lang === "ar" ? "صافي اليوم" : "Net for today"}
          </p>
          <p className="text-3xl font-bold mt-1 text-ink flex items-center gap-2">
            {fmt(s.net)}
          </p>
          <p className="text-xs text-ink/40 mt-1">
            {lang === "ar" ? "التاريخ:" : "Date:"} {data.date}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {stats.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.label}
                className="bg-foam border border-sand-dim rounded-2xl p-3"
              >
                <div
                  className={`${st.color} w-8 h-8 rounded-lg flex items-center justify-center mb-2`}
                >
                  <Icon size={16} />
                </div>
                <p className="text-xs text-ink/50">{st.label}</p>
                <p className="text-base font-bold text-ink mt-0.5">{st.count}</p>
                <p className="text-[10px] text-ink/50 mt-0.5">{fmt(st.amount)}</p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={isClosed || closing}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 mb-6 disabled:opacity-60 disabled:cursor-not-allowed ${
            isClosed
              ? "bg-gray-100 text-gray-500"
              : "bg-rope text-white hover:bg-rope-dark"
          }`}
        >
          {isClosed ? (
            <>
              <ShieldCheck size={20} />
              {lang === "ar" ? "تم إغلاق اليوم" : "Day closed"}
            </>
          ) : closing ? (
            <>{t("loading")}</>
          ) : (
            <>
              <ArrowDownToLine size={20} />
              {lang === "ar" ? "إغلاق اليوم" : "Close day"}
            </>
          )}
        </button>

        <h2 className="text-sm font-semibold text-ink mb-3">
          {lang === "ar" ? "معاملات اليوم" : "Today's transactions"}
        </h2>

        {data.transactions.length === 0 ? (
          <div className="text-center py-8 text-ink/40 text-sm">
            {t("noResults")}
          </div>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((tx) => {
              const meta = typeMeta(tx.type);
              const Icon = meta.icon;
              const isExpense = tx.type === "EXPENSE";
              return (
                <div
                  key={`${tx.type}-${tx.id}`}
                  className="bg-foam border border-sand-dim rounded-2xl p-3 flex items-center gap-3"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${meta.badge} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {tx.label}
                    </p>
                    <p className="text-[11px] text-ink/50 mt-0.5 truncate flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                      {tx.trackingCode && (
                        <span dir="ltr">{tx.trackingCode}</span>
                      )}
                      {tx.passengerName && <span>{tx.passengerName}</span>}
                      {tx.description && <span>{tx.description}</span>}
                      <span className="mr-auto">
                        {new Date(tx.time).toLocaleTimeString(
                          lang === "ar" ? "ar-SA" : "fr-FR",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold shrink-0 ${
                      isExpense ? "text-danger" : "text-success"
                    }`}
                  >
                    {isExpense ? "-" : "+"}
                    {fmt(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleClose}
        title={lang === "ar" ? "تأكيد إغلاق اليوم" : "Confirm closing"}
        message={
          lang === "ar"
            ? `سيتم إغلاق يومية ${data.branch.name} واقفال البيانات وإرسالها للمالك. لا يمكن التراجع بعد التأكيد.`
            : `This will close the day for ${data.branch.name}, lock the data and send it to the owner. This cannot be undone.`
        }
        danger
      />
    </div>
  );
}
