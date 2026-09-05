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
  Search,
  CircleDollarSign,
  Hourglass,
  Receipt,
  X,
  Check,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { fmtTime, routeArrow } from "@/lib/datetime";

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

interface BpMethod {
  id: string;
  name: string;
  nameAr: string;
  logo: string | null;
  isCredit: boolean;
  sortOrder: number;
  balance: number;
  txCount: number;
}

interface BpTicket {
  id: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  issuedAt: string;
  paidAt?: string | null;
  trip: {
    vehicle?: { plateNumber: string };
    departureBranch: { name: string };
    arrivalBranch: { name: string };
  };
  paymentMethodConfig?: BpMethod | null;
}

interface BranchPaymentsData {
  methods: BpMethod[];
  unpaid: BpTicket[];
  transactions: BpTicket[];
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
  const [role, setRole] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          setRole(json.user?.role || "");
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const [bp, setBp] = useState<BranchPaymentsData | null>(null);
  const [bpError, setBpError] = useState("");
  const [search, setSearch] = useState("");
  const [payingTicket, setPayingTicket] = useState<BpTicket | null>(null);
  const [payMethod, setPayMethod] = useState("");
  const [payConfirming, setPayConfirming] = useState(false);

  const fetchBranchPayments = useCallback(async () => {
    try {
      setBpError("");
      const res = await fetch("/api/branch-payments?limit=200");
      if (res.ok) {
        setBp(await res.json());
      }
    } catch {
      setBpError(t("error"));
    }
  }, [t]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
        if (!json.branches) fetchBranchPayments();
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchBranchPayments]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const openPaySheet = (tk: BpTicket) => {
    setPayingTicket(tk);
    setPayMethod("");
    setBpError("");
  };

  const handleCollectPayment = async () => {
    if (!payingTicket || !payMethod) return;
    setPayConfirming(true);
    try {
      const res = await fetch(`/api/tickets/${payingTicket.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodConfigId: payMethod }),
      });
      if (res.ok) {
        setPayingTicket(null);
        setPayMethod("");
        await fetchBranchPayments();
        await fetchDashboard();
      } else {
        const d = await res.json();
        setBpError(d.error || t("error"));
      }
    } catch {
      setBpError(t("error"));
    } finally {
      setPayConfirming(false);
    }
  };

  const collectibleMethods = bp?.methods.filter((m) => !m.isCredit) || [];

  const q = search.trim().toLowerCase();
  const filteredTx = (bp?.transactions || []).filter((tx) => {
    if (!q) return true;
    return (
      tx.passengerName.toLowerCase().includes(q) ||
      tx.passengerPhone.includes(q) ||
      (tx.paymentMethodConfig?.nameAr || "").toLowerCase().includes(q) ||
      (tx.paymentMethodConfig?.name || "").toLowerCase().includes(q)
    );
  });

  const routeLabel = (tk: BpTicket) =>
    `${tk.trip.departureBranch.name} ${routeArrow(lang)} ${tk.trip.arrivalBranch.name}`;

  if (role === "TICKET_AGENT" || role === "CARGO_AGENT") {
    const isTicket = role === "TICKET_AGENT";
    const href = isTicket ? "/tickets" : "/cargo";
    const label = isTicket ? t("newTicket") : t("newCargo");
    const subtitle = isTicket ? t("tickets") : t("cargo");
    const Icon = isTicket ? Ticket : Package;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Link
          href={href}
          className="w-full max-w-sm bg-foam border border-sand-dim rounded-3xl p-10 flex flex-col items-center gap-4 text-center hover:bg-rope hover:text-white transition-colors"
        >
          <div className="w-20 h-20 rounded-3xl bg-rope/10 flex items-center justify-center">
            <Icon size={40} className="text-rope" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink font-[family-name:var(--font-display)]">
              {label}
            </p>
            <p className="text-sm text-ink/50 mt-1">{subtitle}</p>
          </div>
        </Link>
      </div>
    );
  }

  if (role === "DRIVER") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Link
          href="/driver"
          className="w-full max-w-sm bg-foam border border-sand-dim rounded-3xl p-10 flex flex-col items-center gap-4 text-center hover:bg-rope hover:text-white transition-colors"
        >
          <div className="w-20 h-20 rounded-3xl bg-rope/10 flex items-center justify-center">
            <Route size={40} className="text-rope" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink font-[family-name:var(--font-display)]">
              {t("myTrips")}
            </p>
            <p className="text-sm text-ink/50 mt-1">{t("trips")}</p>
          </div>
        </Link>
      </div>
    );
  }

  if (!role || loading) {
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
          {fmtTime(lastRefresh)}
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

      {/* Branch manager: payment methods + operations */}
      {!isOwner && (
        <div className="space-y-4">
          {/* Payment methods & balance */}
          <div className="bg-foam rounded-2xl border border-sand-dim p-4">
            <div className="flex items-center gap-2 mb-3">
              <CircleDollarSign size={18} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">{t("paymentMethods")}</h2>
            </div>
            {bp?.methods.length === 0 && !bpError ? (
              <p className="text-xs text-ink/40 text-center py-4">{t("noResults")}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(bp?.methods || []).map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border border-sand-dim p-3 ${
                      m.isCredit ? "bg-warning/5" : "bg-sand"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {m.logo ? (
                        <img src={m.logo} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      ) : (
                        <span className="w-7 h-7 rounded-lg bg-sand-dim flex items-center justify-center text-[10px]">
                          {m.isCredit ? "A" : "P"}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-ink truncate">
                        {lang === "ar" && m.nameAr ? m.nameAr : m.name}
                      </span>
                    </div>
                    <p className="text-base font-bold text-ink">{formatCurrency(m.balance)}</p>
                    <p className="text-[10px] text-ink/40">{m.txCount} {t("transactions")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unpaid (Ajl) tickets */}
          {bp && bp.unpaid.length > 0 && (
            <div className="bg-foam rounded-2xl border border-warning/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Hourglass size={18} className="text-warning" />
                <h2 className="text-sm font-semibold text-ink">{t("pendingPayments")}</h2>
                <span className="ms-auto px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-semibold">
                  {bp.unpaid.length}
                </span>
              </div>
              <div className="space-y-2">
                {bp.unpaid.map((tk) => (
                  <div
                    key={tk.id}
                    className="flex items-center justify-between gap-3 bg-sand rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{tk.passengerName}</p>
                      <p className="text-[10px] text-ink/40 truncate">
                        {t("seat")} {tk.seatNumber} · {routeLabel(tk)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-rope">+{formatCurrency(tk.amount)}</span>
                      <button
                        onClick={() => openPaySheet(tk)}
                        className="flex items-center gap-1 bg-rope text-white text-xs font-medium px-3 py-2 rounded-lg active:scale-95 transition-transform"
                      >
                        <Check size={14} />
                        {t("pay")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operations / transactions */}
          <div className="bg-foam rounded-2xl border border-sand-dim p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={18} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">{t("transactions")}</h2>
            </div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-9 pr-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink placeholder:text-ink/40 outline-none focus:border-rope/50"
              />
            </div>
            {!bp ? (
              <div className="text-center py-8">
                <RefreshCw size={20} className="animate-spin text-rope mx-auto" />
              </div>
            ) : filteredTx.length === 0 ? (
              <p className="text-xs text-ink/40 text-center py-6">{t("noResults")}</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                {filteredTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 bg-sand rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-rope/10 flex items-center justify-center text-xs font-bold text-rope shrink-0">
                        {tx.seatNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{tx.passengerName}</p>
                        <p className="text-[10px] text-ink/40 truncate">{routeLabel(tx)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-6 h-6">{tx.paymentMethodConfig?.logo && (
                        <img src={tx.paymentMethodConfig.logo} alt="" className="w-full h-full rounded object-cover" />
                      )}</span>
                      <span className="text-sm font-bold text-ink">{formatCurrency(tx.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    {/* Pay sheet */}
    {payingTicket && (
      <div className="fixed inset-0 z-[90]">
        <div className="absolute inset-0 bg-black/40" onClick={() => setPayingTicket(null)} />
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink">{t("pay")}</h2>
            <button onClick={() => setPayingTicket(null)} className="p-2 hover:bg-sand rounded-xl">
              <X size={20} className="text-ink/40" />
            </button>
          </div>

          {bpError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {bpError}
            </div>
          )}

          <div className="bg-sand rounded-2xl p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/40">{t("passengerName")}</span>
              <span className="text-sm font-semibold text-ink">{payingTicket.passengerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/40">{t("seat")}</span>
              <span className="text-sm font-semibold text-ink">{payingTicket.seatNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/40">{t("trips")}</span>
              <span className="text-sm font-semibold text-ink">{routeLabel(payingTicket)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-sand-dim pt-2">
              <span className="text-xs text-ink/40">{t("price")}</span>
              <span className="text-lg font-bold text-rope">{formatCurrency(payingTicket.amount)}</span>
            </div>
          </div>

          <p className="text-sm font-medium text-ink/70 mb-2">{t("choosePayMethod")}</p>
          {collectibleMethods.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {collectibleMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPayMethod(m.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 h-20 px-2 transition-all active:scale-95 ${
                    payMethod === m.id
                      ? "border-rope bg-rope-soft"
                      : "border-sand-dim bg-sand"
                  }`}
                >
                  {m.logo ? (
                    <img src={m.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <Wallet size={18} className="text-ink/40" />
                  )}
                  <span className="text-[11px] font-medium text-ink truncate max-w-full">
                    {lang === "ar" && m.nameAr ? m.nameAr : m.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink/40 text-center py-4">{t("noResults")}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setPayingTicket(null)}
              className="flex-1 h-12 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleCollectPayment}
              disabled={!payMethod || payConfirming}
              className="flex-1 h-12 bg-rope text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {payConfirming ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <>
                  <Check size={16} />
                  {t("confirmPay")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
