"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  User,
  Phone,
  Car,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wallet2,
  Check,
  X,
  Ticket as TicketIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { fmtDate, fmtTime, routeArrow } from "@/lib/datetime";

interface Branch {
  id: string;
  name: string;
  city: string;
}

interface Vehicle {
  id: string;
  seatCount: number;
  plateNumber: string;
  type: string;
}

interface TripTicket {
  id: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  paid: boolean;
  status?: string;
  issuedById?: string;
  issuedBy?: { id: string; name: string };
}

interface Trip {
  id: string;
  status: string;
  departureTime: string;
  price: number;
  vehicle: Vehicle;
  driver?: { name: string; phone: string };
  departureBranch: Branch;
  arrivalBranch: Branch;
  departureBranchId: string;
  arrivalBranchId: string;
  tickets: TripTicket[];
}

interface PayMethod {
  id: string;
  name: string;
  nameAr: string;
  logo: string | null;
  isCredit: boolean;
}

interface BranchPaymentsData {
  methods: PayMethod[];
}

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: "bg-yellow-100 text-yellow-700",
  OPEN: "bg-blue-100 text-blue-700",
  FULL: "bg-purple-100 text-purple-700",
  DEPARTED: "bg-indigo-100 text-indigo-700",
  IN_TRANSIT: "bg-cyan-100 text-cyan-700",
  ARRIVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function BranchTripsPage() {
  const { t, lang } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myBranchId, setMyBranchId] = useState<string | null>(null);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [payingTicket, setPayingTicket] = useState<TripTicket | null>(null);
  const [payingTrip, setPayingTrip] = useState<Trip | null>(null);
  const [payMethod, setPayMethod] = useState("");
  const [payConfirming, setPayConfirming] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const [tripRes, bpRes, meRes] = await Promise.all([
        fetch("/api/trips"),
        fetch("/api/branch-payments?limit=1"),
        fetch("/api/auth/me"),
      ]);
      if (tripRes.ok) {
        const d = await tripRes.json();
        setTrips((d.trips || []).filter((tr: Trip) => tr.status !== "CANCELLED"));
      }
      if (bpRes.ok) {
        const d = (await bpRes.json()) as BranchPaymentsData;
        setMethods(d.methods || []);
      }
      if (meRes.ok) {
        const d = await meRes.json();
        setMyBranchId(d.user?.branchId || null);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatTime = (dateStr: string) => fmtTime(dateStr);

  const formatDate = (dateStr: string) => fmtDate(dateStr);

  const statusLabel = (s: string) =>
    t(s === "IN_TRANSIT" ? "inTransit" : (s.toLowerCase() as never));

  const seatInfo = (tr: Trip) => {
    const sold = tr.tickets.filter((tk) => tk.status !== "CANCELLED").length;
    return { sold, available: tr.vehicle.seatCount - sold, total: tr.vehicle.seatCount };
  };

  const openPaySheet = (tk: TripTicket, tr: Trip) => {
    setPayingTicket(tk);
    setPayingTrip(tr);
    setPayMethod("");
  };

  const handleCollectPayment = async () => {
    if (!payingTicket || !payMethod || payConfirming) return;
    setPayConfirming(true);
    try {
      const res = await fetch(`/api/tickets/${payingTicket.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodConfigId: payMethod }),
      });
      if (res.ok) {
        setPayingTicket(null);
        setPayingTrip(null);
        setPayMethod("");
        await fetchData();
      } else {
        const d = await res.json();
        setError(d.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
    setPayConfirming(false);
  };

  const collectibleMethods = methods.filter((m) => !m.isCredit);

  const renderTrip = (tr: Trip) => {
    const info = seatInfo(tr);
    const isOpen = expanded === tr.id;
    const cfg = STATUS_STYLE[tr.status] || STATUS_STYLE.SCHEDULED;
    const isDeparting = tr.departureBranchId === myBranchId;

    return (
      <div key={tr.id} className="bg-foam border border-sand-dim rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpanded(isOpen ? null : tr.id)}
          className="w-full p-4 text-start"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg}`}>
              {lang === "ar" ? statusLabel(tr.status) : statusLabel(tr.status)}
            </span>
            <span className="text-[10px] text-ink/40 flex items-center gap-1">
              {lang === "ar"
                ? isDeparting
                  ? "منطلق"
                  : "واصل"
                : isDeparting
                ? "Départ"
                : "Arrivée"}
              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">{tr.departureBranch.name}</p>
            </div>
            <span className="text-rope/60 text-sm shrink-0">{routeArrow(lang)}</span>
            <div className="flex-1 text-end">
              <p className="text-sm font-bold text-ink">{tr.arrivalBranch.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink/60 mb-2">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(tr.departureTime)} · {formatTime(tr.departureTime)}
            </span>
            <span className="flex items-center gap-1" dir="ltr">
              <Car size={12} />
              {tr.vehicle.plateNumber}
            </span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {tr.driver?.name || ""}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  info.available > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-sand-dim text-ink/40"
                }`}
              >
                {t("available")}: {info.available}
              </span>
              <span className="text-[10px] text-ink/40">
                {tr.tickets.length} {lang === "ar" ? "ركاب" : "passagers"}
              </span>
            </div>
            <span className="text-sm font-bold text-rope">
              {tr.price.toLocaleString()} {t("mr")}
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-sand-dim">
            <div className="px-4 py-3 flex items-center justify-between bg-sand/50">
              <span className="text-xs font-semibold text-ink/70">
                {t("passengers")} ({tr.tickets.length})
              </span>
              {isDeparting && info.available > 0 && (
                <Link
                  href="/tickets"
                  className="flex items-center gap-1.5 bg-rope text-white text-[11px] font-medium px-3 py-1.5 rounded-lg"
                >
                  <TicketIcon size={13} />
                  {t("newTicket")}
                </Link>
              )}
            </div>

            {tr.tickets.length > 0 && (() => {
              const byIssuer = new Map<string, { name: string; count: number; total: number }>();
              for (const tk of tr.tickets) {
                const key = tk.issuedBy?.id || tk.issuedById || "unknown";
                const name = tk.issuedBy?.name || (lang === "ar" ? "غير معروف" : "Inconnu");
                const prev = byIssuer.get(key) || { name, count: 0, total: 0 };
                byIssuer.set(key, { ...prev, count: prev.count + 1, total: prev.total + tk.amount });
              }
              if (byIssuer.size <= 1) return null;
              return (
                <div className="px-4 py-3 bg-sand/30 border-b border-sand-dim">
                  <p className="text-[10px] text-ink/40 mb-1.5">{lang === "ar" ? "ملخص السائقين" : "Résumé par chauffeur"}</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(byIssuer.entries()).map(([id, info]) => (
                      <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rope/10 rounded-lg text-[11px] font-medium text-rope">
                        {info.name}: {info.count} {lang === "ar" ? "ركاب" : "pax"} — {info.total.toLocaleString()} {t("mr")}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {tr.tickets.length === 0 ? (
              <p className="text-xs text-ink/40 text-center py-6">{t("noResults")}</p>
            ) : (
              <div className="divide-y divide-sand-dim">
                {tr.tickets.map((tk) => (
                  <div key={tk.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-rope/10 flex items-center justify-center text-xs font-bold text-rope">
                      {tk.seatNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{tk.passengerName}</p>
                      <p className="text-[10px] text-ink/40 truncate" dir="ltr">
                        {tk.passengerPhone}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-ink shrink-0">
                      {tk.amount.toLocaleString()} {t("mr")}
                    </span>
                    {tk.paid ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold shrink-0">
                        {t("paidShort")}
                      </span>
                    ) : (
                      <button
                        onClick={() => openPaySheet(tk, tr)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-rope text-white rounded-lg text-[11px] font-medium shrink-0"
                      >
                        <Check size={12} />
                        {t("collect")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const departing = trips.filter((tr) => tr.departureBranchId === myBranchId);
  const arriving = trips.filter((tr) => tr.arrivalBranchId === myBranchId);

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink font-[family-name:var(--font-display)]">
          {lang === "ar" ? "رحلات الفرع" : "Trajets de la branche"}
        </h1>
        <button
          onClick={fetchData}
          className="p-2 bg-foam border border-sand-dim rounded-xl text-ink/50"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-2.5 text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={22} className="animate-spin text-rope" />
        </div>
      ) : trips.length === 0 ? (
        <p className="text-center text-ink/40 py-12 text-sm">{t("noResults")}</p>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">{t("departing")}</h2>
            </div>
            {departing.length === 0 ? (
              <p className="text-xs text-ink/40 text-center py-4 bg-foam rounded-xl border border-sand-dim">
                {t("noResults")}
              </p>
            ) : (
              <div className="space-y-3">{departing.map(renderTrip)}</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">{t("arriving")}</h2>
            </div>
            {arriving.length === 0 ? (
              <p className="text-xs text-ink/40 text-center py-4 bg-foam rounded-xl border border-sand-dim">
                {t("noResults")}
              </p>
            ) : (
              <div className="space-y-3">{arriving.map(renderTrip)}</div>
            )}
          </div>
        </>
      )}

      {/* Collect payment sheet */}
      {payingTicket && payingTrip && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPayingTicket(null)}
          />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">{t("collect")}</h2>
              <button onClick={() => setPayingTicket(null)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
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
                <span className="text-sm font-semibold text-ink">
                  {payingTrip.departureBranch.name} {routeArrow(lang)} {payingTrip.arrivalBranch.name}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-sand-dim pt-2">
                <span className="text-xs text-ink/40">{t("price")}</span>
                <span className="text-lg font-bold text-rope">
                  {payingTicket.amount.toLocaleString()} {t("mr")}
                </span>
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
                      payMethod === m.id ? "border-rope bg-rope-soft" : "border-sand-dim bg-sand"
                    }`}
                  >
                    {m.logo ? (
                      <img src={m.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Wallet2 size={18} className="text-ink/40" />
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