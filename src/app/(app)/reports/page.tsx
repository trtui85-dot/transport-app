"use client";

import { useState, useCallback } from "react";
import { BarChart3, Calendar, TrendingUp, Clock, Users, Filter, SearchX } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import EmptyState from "@/components/empty-state";

type ReportType = "profit" | "cashflow" | "ageing" | "activity";

interface ProfitRow {
  branch: { id: string; name: string };
  ticketRevenue: number;
  cargoRevenue: number;
  totalRevenue: number;
  expenses: number;
  profit: number;
}

interface ProfitData {
  type: "profit";
  data: ProfitRow[];
}

interface CashflowData {
  type: "cashflow";
  inflows: Record<string, number>;
  outflows: Record<string, number>;
}

interface AgeingData {
  type: "ageing";
  data: { "0-30": number; "31-60": number; "60+": number };
}

interface ActivityRow {
  user: { id: string; name: string; role: string };
  ticketsIssued: number;
  cargoHandled: number;
}

interface ActivityData {
  type: "activity";
  data: ActivityRow[];
}

type ReportResult = ProfitData | CashflowData | AgeingData | ActivityData;

export default function ReportsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ReportType>("profit");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ type: activeTab, from: dateFrom, to: dateTo });
      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        const err = await res.json();
        setError(err.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo, t]);

  const tabs: { key: ReportType; label: string; icon: React.ElementType }[] = [
    { key: "profit", label: t("profit"), icon: TrendingUp },
    { key: "cashflow", label: t("revenue"), icon: BarChart3 },
    { key: "ageing", label: t("debts"), icon: Clock },
    { key: "activity", label: t("users"), icon: Users },
  ];

  const maxVal = (vals: number[]) => Math.max(...vals, 1);

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim px-4 py-4">
        <h1 className="text-xl font-bold text-ink mb-3">{t("reports")}</h1>

        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setData(null); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-rope text-white"
                    : "bg-foam text-ink/50 border border-sand-dim"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-[10px] text-ink/40 px-0.5 font-medium">
              <Calendar size={11} />
              {t("from")}
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 bg-foam border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-[10px] text-ink/40 px-0.5 font-medium">
              <Calendar size={11} />
              {t("to")}
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 bg-foam border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope"
            />
          </label>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="col-span-2 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rope text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            <Filter size={15} />
            {loading ? "..." : t("filter")}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {!data && !loading && (
          <EmptyState
            icon={<BarChart3 size={28} />}
            title={t("filter")}
            description={t("noResults")}
          />
        )}

        {data?.type === "profit" && (
          <div className="space-y-4">
            {data.data.length === 0 ? (
              <EmptyState icon={<SearchX size={28} />} title={t("noResults")} />
            ) : (
              <div className="bg-foam border border-sand-dim rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-ink mb-3">{t("branchComparison")}</h3>
                <div className="space-y-4">
                  {data.data.map((row) => {
                    const maxR = maxVal(data.data.map((r) => r.totalRevenue));
                    const revPct = (row.totalRevenue / maxR) * 100;
                    const expPct = maxR > 0 ? (row.expenses / maxR) * 100 : 0;
                    return (
                      <div key={row.branch.id}>
                        <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                          <span className="text-ink font-medium truncate">{row.branch.name}</span>
                          <span className={`shrink-0 font-bold ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {row.profit.toLocaleString()} {t("mr")}
                          </span>
                        </div>
                        <div className="relative h-6 bg-sand rounded-lg overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-green-400/60 rounded-lg transition-all"
                            style={{ width: `${revPct}%` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 bg-red-400/80 rounded-lg transition-all"
                            style={{ width: `${expPct}%` }}
                          />
                        </div>
                        <div className="flex gap-3 text-[10px] text-ink/40 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                            {t("revenue")}: {row.totalRevenue.toLocaleString()}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                            {t("totalExpenses")}: {row.expenses.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {data?.type === "cashflow" && (
          <div className="space-y-4">
            <div className="bg-foam border border-sand-dim rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">{t("revenue")}</h3>
              {Object.keys(data.inflows).length === 0 ? (
                <p className="text-xs text-ink/40">{t("noResults")}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.inflows).map(([method, amount]) => {
                    const max = maxVal(Object.values(data.inflows));
                    const pct = (amount / max) * 100;
                    return (
                      <div key={method}>
                        <div className="flex justify-between gap-2 text-xs mb-1">
                          <span className="text-ink truncate">{method}</span>
                          <span className="font-medium text-green-600 shrink-0">{amount.toLocaleString()}</span>
                        </div>
                        <div className="h-5 bg-sand rounded-lg overflow-hidden">
                          <div className="h-full bg-green-400 rounded-lg transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-foam border border-sand-dim rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">{t("totalExpenses")}</h3>
              {Object.keys(data.outflows).length === 0 ? (
                <p className="text-xs text-ink/40">{t("noResults")}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.outflows).map(([category, amount]) => {
                    const max = maxVal(Object.values(data.outflows));
                    const pct = (amount / max) * 100;
                    return (
                      <div key={category}>
                        <div className="flex justify-between gap-2 text-xs mb-1">
                          <span className="text-ink truncate">{category}</span>
                          <span className="font-medium text-red-600 shrink-0">{amount.toLocaleString()}</span>
                        </div>
                        <div className="h-5 bg-sand rounded-lg overflow-hidden">
                          <div className="h-full bg-red-400 rounded-lg transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {data?.type === "ageing" && (
          <div className="bg-foam border border-sand-dim rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-ink mb-4">{t("debts")}</h3>
            {(() => {
              const vals = Object.values(data.data);
              const max = maxVal(vals);
              const buckets = [
                { key: "0-30", label: "0-30 days", value: data.data["0-30"] },
                { key: "31-60", label: "31-60 days", value: data.data["31-60"] },
                { key: "60+", label: "60+ days", value: data.data["60+"] },
              ];
              return (
                <div className="space-y-4">
                  {buckets.map((b) => {
                    const pct = max > 0 ? (b.value / max) * 100 : 0;
                    return (
                      <div key={b.key}>
                        <div className="flex justify-between gap-2 text-xs mb-1">
                          <span className="text-ink">{b.label}</span>
                          <span className="font-medium text-ink">{b.value.toLocaleString()} {t("mr")}</span>
                        </div>
                        <div className="h-6 bg-sand rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-rope rounded-lg transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {data?.type === "activity" && (
          <div className="space-y-3">
            {data.data.length === 0 ? (
              <EmptyState icon={<Users size={28} />} title={t("noResults")} />
            ) : (
              data.data.map((row) => (
                <div key={row.user.id} className="bg-foam border border-sand-dim rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-ink text-sm">{row.user.name}</h3>
                      <span className="text-[10px] text-ink/40">
                        {row.user.role === "OWNER" ? t("owner") : row.user.role === "BRANCH_MANAGER" ? t("manager") : row.user.role === "TICKET_AGENT" ? t("ticketAgent") : row.user.role === "CARGO_AGENT" ? t("cargoAgent") : row.user.role === "DRIVER" ? t("driver") : row.user.role}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-sand rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-ink">{row.ticketsIssued}</p>
                      <p className="text-[10px] text-ink/40">{t("tickets")}</p>
                    </div>
                    <div className="bg-sand rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-ink">{row.cargoHandled}</p>
                      <p className="text-[10px] text-ink/40">{t("cargo")}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}