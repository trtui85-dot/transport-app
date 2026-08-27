"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Ticket,
  Package,
  Wallet,
  ArrowRight,
  RefreshCw,
  Route,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface BranchData {
  branch: { id: string; name: string; city: string };
  todayNet: number;
  totalTickets: number;
  totalCargo: number;
  totalExpenses: number;
  openDebts: number;
}

interface DashboardData {
  todayNet?: number;
  totalTickets?: number;
  totalCargo?: number;
  totalExpenses?: number;
  openDebts?: number;
  branches?: BranchData[];
  totals?: {
    todayNet: number;
    totalTickets: number;
    totalCargo: number;
    totalExpenses: number;
    openDebts: number;
  };
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  large,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: "rope" | "success" | "danger" | "sea" | "warning";
  large?: boolean;
}) {
  const colorMap = {
    rope: "bg-rope/10 text-rope",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    sea: "bg-sea/10 text-sea",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <div
      className={`bg-foam rounded-2xl border border-sand-dim p-4 ${
        large ? "col-span-full" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-ink-faint font-medium">{label}</p>
          <p
            className={`${
              large ? "text-3xl mt-1" : "text-xl mt-0.5"
            } font-bold text-ink font-[family-name:var(--font-display)]`}
          >
            {value}
          </p>
        </div>
        <div
          className={`${colorMap[color]} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin text-rope" />
      </div>
    );
  }

  if (!data) return null;

  const totals = data.totals || {
    todayNet: data.todayNet || 0,
    totalTickets: data.totalTickets || 0,
    totalCargo: data.totalCargo || 0,
    totalExpenses: data.totalExpenses || 0,
    openDebts: data.openDebts || 0,
  };

  const isOwner = !!data.branches;
  const formatCurrency = (n: number) => `${n.toLocaleString()} ${t("mr")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink font-[family-name:var(--font-display)]">
          {t("dashboard")}
        </h1>
        <span className="text-xs text-ink-faint">
          {lastRefresh.toLocaleTimeString(lang === "ar" ? "ar-SA" : "fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-4">
        <div
          className={`rounded-2xl p-5 ${
            totals.todayNet >= 0 ? "bg-success/10 border border-success/20" : "bg-danger/10 border border-danger/20"
          }`}
        >
          <p className="text-sm font-medium text-ink-faint">{t("todayNet")}</p>
          <p className="text-3xl font-bold mt-1 font-[family-name:var(--font-display)] text-ink flex items-center gap-2">
            {totals.todayNet >= 0 ? (
              <TrendingUp size={22} className="text-success" />
            ) : (
              <TrendingDown size={22} className="text-danger" />
            )}
            {formatCurrency(totals.todayNet)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-foam rounded-xl border border-sand-dim p-3 text-center">
            <Ticket size={18} className="mx-auto text-rope mb-1" />
            <p className="text-lg font-bold text-ink">{totals.totalTickets}</p>
            <p className="text-[10px] text-ink-faint">{t("todayTickets")}</p>
          </div>
          <div className="bg-foam rounded-xl border border-sand-dim p-3 text-center">
            <Package size={18} className="mx-auto text-sea mb-1" />
            <p className="text-lg font-bold text-ink">{totals.totalCargo}</p>
            <p className="text-[10px] text-ink-faint">{t("todayCargo")}</p>
          </div>
          <div className="bg-foam rounded-xl border border-sand-dim p-3 text-center">
            <Wallet size={18} className="mx-auto text-danger mb-1" />
            <p className="text-lg font-bold text-ink">{formatCurrency(totals.totalExpenses)}</p>
            <p className="text-[10px] text-ink-faint">{t("todayExpenses")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/tickets"
            className="bg-rope text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold text-sm active:scale-95 transition-transform"
          >
            <Ticket size={20} />
            {t("newTicket")}
          </Link>
          <Link
            href="/cargo"
            className="bg-sea text-white rounded-xl p-4 flex items-center justify-center gap-2 font-semibold text-sm active:scale-95 transition-transform"
          >
            <Package size={20} />
            {t("newCargo")}
          </Link>
        </div>

        {isOwner && data.branches && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-ink">{t("branches")}</h2>
            {data.branches.map((b) => (
              <div
                key={b.branch.id}
                className="bg-foam rounded-xl border border-sand-dim p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{b.branch.name}</p>
                    <p className="text-xs text-ink-faint">{b.branch.city}</p>
                  </div>
                  <p
                    className={`text-sm font-bold ${
                      b.todayNet >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {formatCurrency(b.todayNet)}
                  </p>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-ink-faint">
                  <span>{b.totalTickets} {t("todayTickets")}</span>
                  <span>{b.totalCargo} {t("todayCargo")}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {totals.openDebts > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-warning shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink">{t("openDebts")}</p>
              <p className="text-xs text-ink-faint">{totals.openDebts} {t("debts")}</p>
            </div>
            <Link
              href="/debts"
              className="mr-auto text-xs text-warning font-medium hover:underline"
            >
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label={t("todayNet")}
            value={formatCurrency(totals.todayNet)}
            icon={totals.todayNet >= 0 ? TrendingUp : TrendingDown}
            color={totals.todayNet >= 0 ? "success" : "danger"}
          />
          <StatCard
            label={t("todayTickets")}
            value={totals.totalTickets}
            icon={Ticket}
            color="rope"
          />
          <StatCard
            label={t("todayCargo")}
            value={totals.totalCargo}
            icon={Package}
            color="sea"
          />
          <StatCard
            label={t("todayExpenses")}
            value={formatCurrency(totals.totalExpenses)}
            icon={Wallet}
            color="danger"
          />
        </div>

        {isOwner && data.branches && (
          <div>
            <h2 className="text-sm font-semibold text-ink mb-3">{t("branches")}</h2>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {data.branches.map((b) => (
                <div
                  key={b.branch.id}
                  className="bg-foam rounded-2xl border border-sand-dim p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-ink">{b.branch.name}</h3>
                      <p className="text-xs text-ink-faint">{b.branch.city}</p>
                    </div>
                    <p
                      className={`text-base font-bold font-[family-name:var(--font-display)] ${
                        b.todayNet >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatCurrency(b.todayNet)}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-ink-faint border-t border-sand-dim pt-3">
                    <span className="flex items-center gap-1">
                      <Ticket size={12} /> {b.totalTickets}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={12} /> {b.totalCargo}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertCircle size={12} /> {b.openDebts}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totals.openDebts > 0 && (
          <div className="bg-foam rounded-2xl border border-sand-dim p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink">{t("openDebts")}</h2>
              <Link
                href="/debts"
                className="text-xs text-rope font-medium hover:underline flex items-center gap-1"
              >
                {t("debts")} <ArrowRight size={12} />
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-ink-faint">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-warning" />
                <span>{totals.openDebts} {lang === "ar" ? "ديون مفتوحة" : "dettes ouvertes"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/tickets"
            className="bg-rope text-white rounded-2xl p-6 flex items-center gap-4 hover:bg-rope-dark transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Ticket size={24} />
            </div>
            <div>
              <p className="text-lg font-bold">{t("newTicket")}</p>
              <p className="text-sm text-white/70">{t("tickets")}</p>
            </div>
          </Link>
          <Link
            href="/cargo"
            className="bg-sea text-white rounded-2xl p-6 flex items-center gap-4 hover:opacity-90 transition-opacity"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <p className="text-lg font-bold">{t("newCargo")}</p>
              <p className="text-sm text-white/70">{t("cargo")}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
