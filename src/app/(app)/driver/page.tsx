"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Route,
  Car,
  CalendarClock,
  PlayCircle,
  Flag,
  MapPin,
  Printer,
  UserPlus,
  X,
  Check,
  RefreshCw,
  Wallet2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { fmtDateTime, routeArrow } from "@/lib/datetime";

interface Branch {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  seatCount: number;
}

interface Ticket {
  id: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  paid: boolean;
  status: string;
  issuedById?: string;
  issuedBy?: { id: string; name: string };
}

interface Trip {
  id: string;
  status: string;
  departureTime: string;
  arrivalTime: string | null;
  driverId: string;
  departureBranchId: string;
  arrivalBranchId: string;
  departureBranch: Branch;
  arrivalBranch: Branch;
  vehicle: Vehicle;
  price: number;
  tickets: Ticket[];
  cargo: { id: string }[];
}

interface PayMethod {
  id: string;
  name: string;
  nameAr: string;
  logo: string | null;
  isCredit: boolean;
}

interface CurrentUser {
  userId: string;
  name: string;
  phone: string;
  role: string;
  branchId?: string | null;
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

export default function DriverPage() {
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addTrip, setAddTrip] = useState<Trip | null>(null);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addSeat, setAddSeat] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addMethod, setAddMethod] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setError("");
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) throw new Error("Not authenticated");
      const meData = await meRes.json();
      setUser(meData.user);

      const [tripRes, pmRes] = await Promise.all([
        fetch("/api/trips"),
        fetch("/api/payment-methods"),
      ]);

      if (tripRes.ok) {
        const d = await tripRes.json();
        setTrips((d.trips || []).filter((tr: Trip) => tr.status !== "CANCELLED"));
      }
      if (pmRes.ok) {
        const d = await pmRes.json();
        setMethods((d.methods || []).filter((m: PayMethod) => !m.isCredit));
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

  const myTrips = user
    ? trips
        .filter((tr) => tr.driverId === user.userId)
        .sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime())
    : [];

  const activeTrip =
    myTrips.find((t) => t.status === "IN_TRANSIT") ||
    myTrips.find((t) => t.status === "DEPARTED") ||
    null;

  const history = myTrips.filter((t) => t.status === "ARRIVED").slice(0, 20);

  const fmtDate = (s: string) => fmtDateTime(s);

  const statusLabel = (s: string) => t(s.toLowerCase() as never);

  const changeStatus = async (trip: Trip, status: string) => {
    setError("");
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const d = await res.json();
        setError(d.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const openAddPassenger = (trip: Trip) => {
    setAddTrip(trip);
    setAddName("");
    setAddPhone("");
    const taken = trip.tickets.filter((tk) => tk.status === "CONFIRMED").map((tk) => tk.seatNumber);
    const maxSeat = trip.vehicle.seatCount;
    let next = 1;
    for (let i = 1; i <= maxSeat; i++) {
      if (!taken.includes(i)) { next = i; break; }
    }
    setAddSeat(String(next));
    setAddAmount(String(trip.price));
    setAddMethod("");
    setShowAdd(true);
  };

  const handleAddPassenger = async () => {
    if (!addTrip || !addName.trim() || !addPhone.trim() || !addSeat || !addAmount || !addMethod) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: addTrip.id,
          seatNumber: parseInt(addSeat),
          passengerName: addName.trim(),
          passengerPhone: addPhone.trim(),
          amount: parseFloat(addAmount),
          paymentMethodConfigId: addMethod,
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddTrip(null);
        fetchAll();
      } else {
        const d = await res.json();
        setError(d.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
    setAddSaving(false);
  };

  const printPassengerList = (trip: Trip) => {
    const style = document.createElement("style");
    style.id = "print-driver";
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #print-area, #print-area * { visibility: visible; }
        #print-area { position: absolute; inset: 0; padding: 16px; background: white; }
        @page { size: A5; margin: 10mm; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    const area = document.getElementById("print-area");
    if (!area) return;
    area.innerHTML = `
      <div style="font-family: sans-serif; direction: ${lang === "ar" ? "rtl" : "ltr"};">
        <h1 style="font-size: 16px; margin-bottom: 8px;">${lang === "ar" ? "قائمة الركاب" : "Liste des passagers"}</h1>
        <p style="font-size: 12px; color: #666; margin-bottom: 4px;">
          ${trip.departureBranch.name} ${routeArrow(lang)} ${trip.arrivalBranch.name} · ${fmtDate(trip.departureTime)}
        </p>
        <p style="font-size: 12px; color: #666; margin-bottom: 12px;">
          ${lang === "ar" ? "المركبة" : "Véhicule"}: ${trip.vehicle.plateNumber} · ${trip.vehicle.type}
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th style="padding: 4px; text-align: start;">${lang === "ar" ? "مقعد" : "Siège"}</th>
              <th style="padding: 4px; text-align: start;">${lang === "ar" ? "الاسم" : "Nom"}</th>
              <th style="padding: 4px; text-align: start;">${lang === "ar" ? "الهاتف" : "Téléphone"}</th>
              <th style="padding: 4px; text-align: start;">${lang === "ar" ? "المبلغ" : "Montant"}</th>
            </tr>
          </thead>
          <tbody>
            ${trip.tickets
              .filter((tk) => tk.status === "CONFIRMED")
              .sort((a, b) => a.seatNumber - b.seatNumber)
              .map(
                (tk) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 3px;">${tk.seatNumber}</td>
                <td style="padding: 3px;">${tk.passengerName}</td>
                <td style="padding: 3px;" dir="ltr">${tk.passengerPhone}</td>
                <td style="padding: 3px;">${tk.amount.toLocaleString()}</td>
              </tr>`
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #333; font-weight: bold;">
              <td colspan="3" style="padding: 4px;">${lang === "ar" ? "الإجمالي" : "Total"}</td>
              <td style="padding: 4px;">${trip.tickets.filter((tk) => tk.status === "CONFIRMED").reduce((s, tk) => s + tk.amount, 0).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    window.print();
    setTimeout(() => {
      document.getElementById("print-driver")?.remove();
      if (area) area.innerHTML = "";
    }, 1000);
  };

  const seatGrid = (trip: Trip) => {
    const taken = new Set(
      trip.tickets.filter((tk) => tk.status === "CONFIRMED").map((tk) => tk.seatNumber)
    );
    const total = trip.vehicle.seatCount;
    return (
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`w-5 h-5 rounded text-[8px] flex items-center justify-center font-bold ${
              taken.has(s)
                ? "bg-danger/20 text-danger"
                : "bg-green-100 text-green-700"
            }`}
          >
            {s}
          </div>
        ))}
      </div>
    );
  };

  const renderTrip = (tr: Trip, isActive: boolean) => {
    const isOpen = expanded === tr.id;
    const taken = tr.tickets.filter((tk) => tk.status === "CONFIRMED").length;
    const available = tr.vehicle.seatCount - taken;
    const cfg = STATUS_STYLE[tr.status] || STATUS_STYLE.SCHEDULED;

    return (
      <div
        key={tr.id}
        className={`bg-foam border rounded-2xl overflow-hidden ${
          isActive ? "border-rope shadow-md" : "border-sand-dim"
        }`}
      >
        <button
          onClick={() => setExpanded(isOpen ? null : tr.id)}
          className="w-full p-4 text-start"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg}`}>
              {statusLabel(tr.status)}
            </span>
            <span className="text-[10px] text-ink/40 flex items-center gap-1">
              {fmtDate(tr.departureTime)}
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
            <span className="flex items-center gap-1" dir="ltr">
              <Car size={12} />
              {tr.vehicle.plateNumber} · {tr.vehicle.type}
            </span>
            <span>
              {lang === "ar" ? "السعر" : "Prix"}: {tr.price.toLocaleString()} {t("mr")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink/40">
                {taken}/{tr.vehicle.seatCount} {lang === "ar" ? "محجوز" : "pris"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  available > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-sand-dim text-ink/40"
                }`}
              >
                {t("available")}: {available}
              </span>
            </div>
            <span className="text-sm font-bold text-rope">
              {(taken * tr.price).toLocaleString()} {t("mr")}
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-sand-dim">
            <div className="px-4 py-3 bg-sand/50">
              <p className="text-[11px] font-semibold text-ink/60 mb-2">{t("seatGrid")}</p>
              {seatGrid(tr)}
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink/70">
                {t("passengers")} ({taken})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); printPassengerList(tr); }}
                  className="flex items-center gap-1.5 bg-sand border border-sand-dim text-ink/70 text-[11px] font-medium px-3 py-1.5 rounded-lg"
                >
                  <Printer size={13} />
                  {t("printList")}
                </button>
                {(tr.status === "OPEN" || tr.status === "SCHEDULED" || tr.status === "DEPARTED" || tr.status === "IN_TRANSIT") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openAddPassenger(tr); }}
                    className="flex items-center gap-1.5 bg-rope text-white text-[11px] font-medium px-3 py-1.5 rounded-lg"
                  >
                    <UserPlus size={13} />
                    {t("addPassenger")}
                  </button>
                )}
              </div>
            </div>

            {tr.tickets.length === 0 ? (
              <p className="text-xs text-ink/40 text-center py-4">{t("noResults")}</p>
            ) : (
              <div className="divide-y divide-sand-dim">
                {tr.tickets
                  .filter((tk) => tk.status === "CONFIRMED")
                  .sort((a, b) => a.seatNumber - b.seatNumber)
                  .map((tk) => (
                    <div key={tk.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-rope/10 flex items-center justify-center text-xs font-bold text-rope">
                        {tk.seatNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{tk.passengerName}</p>
                        <p className="text-[10px] text-ink/40 truncate" dir="ltr">
                          {tk.passengerPhone}
                        </p>
                        {tk.issuedBy && tk.issuedBy.name !== user?.name && (
                          <p className="text-[10px] text-ink/30">
                            {lang === "ar" ? "أضافه" : "Ajouté par"}: {tk.issuedBy.name}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-ink shrink-0">
                        {tk.amount.toLocaleString()} {t("mr")}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {isActive && tr.status !== "ARRIVED" && tr.status !== "CANCELLED" && (
              <div className="px-4 pb-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  {(tr.status === "OPEN" || tr.status === "SCHEDULED") && (
                    <button
                      onClick={() => changeStatus(tr, "DEPARTED")}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-green-500 text-white active:scale-95"
                    >
                      <PlayCircle size={18} />
                      {lang === "ar" ? "بدء الرحلة" : "Départ"}
                    </button>
                  )}
                  {(tr.status === "DEPARTED" || tr.status === "IN_TRANSIT") && (
                    <button
                      onClick={() => changeStatus(tr, "ARRIVED")}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-rope text-white active:scale-95"
                    >
                      <Flag size={18} />
                      {lang === "ar" ? "وصول" : "Arrivée"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <div id="print-area" className="no-print" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink font-[family-name:var(--font-display)]">
            {lang === "ar" ? "رحلاتي" : "Mes trajets"}
          </h1>
          {user && <p className="text-xs text-ink/40 mt-0.5">{user.name}</p>}
        </div>
        <button onClick={fetchAll} className="p-2 bg-foam border border-sand-dim rounded-xl text-ink/50">
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
      ) : myTrips.length === 0 ? (
        <div className="bg-foam border border-sand-dim rounded-2xl p-8 text-center">
          <Route size={32} className="mx-auto text-ink/20 mb-3" />
          <p className="text-sm text-ink/40">
            {lang === "ar" ? "لا توجد رحلات" : "Aucun trajet"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock size={15} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">{t("tripActive")}</h2>
            </div>
            {activeTrip ? (
              renderTrip(activeTrip, true)
            ) : (
              <p className="text-xs text-ink/40 text-center py-4 bg-foam rounded-xl border border-sand-dim">
                {lang === "ar" ? "لا توجد رحلة نشطة حالياً" : "Pas de trajet actif"}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">
                {lang === "ar" ? "الرحلات القادمة" : "Trajets à venir"}
              </h2>
            </div>
            {myTrips
              .filter(
                (tr) =>
                  tr !== activeTrip &&
                  ["SCHEDULED", "OPEN", "FULL"].includes(tr.status)
              )
              .map((tr) => renderTrip(tr, false))}
            {myTrips.filter(
              (tr) =>
                tr !== activeTrip &&
                ["SCHEDULED", "OPEN", "FULL"].includes(tr.status)
            ).length === 0 && (
              <p className="text-xs text-ink/40 text-center py-4 bg-foam rounded-xl border border-sand-dim">
                {t("noResults")}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flag size={15} className="text-rope" />
              <h2 className="text-sm font-semibold text-ink">{t("tripHistory")}</h2>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-ink/40 text-center py-4 bg-foam rounded-xl border border-sand-dim">
                {t("noResults")}
              </p>
            ) : (
              history.map((tr) => renderTrip(tr, false))
            )}
          </div>
        </>
      )}

      {/* Add passenger sheet */}
      {showAdd && addTrip && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">{t("addPassenger")}</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-sand rounded-xl">
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
                <span className="text-xs text-ink/40">{t("trips")}</span>
                <span className="text-sm font-semibold text-ink">
                  {addTrip.departureBranch.name} {routeArrow(lang)} {addTrip.arrivalBranch.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/40">{t("seat")}</span>
                <span className="text-xs font-semibold text-ink">{addTrip.vehicle.plateNumber}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-ink/50 mb-1.5">{t("passengerName")}</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink placeholder:text-ink/40 outline-none focus:border-rope/50"
                  placeholder={lang === "ar" ? "اسم الراكب" : "Nom du passager"}
                />
              </div>
              <div>
                <label className="block text-xs text-ink/50 mb-1.5">{lang === "ar" ? "رقم الهاتف" : "Téléphone"}</label>
                <input
                  type="tel"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink placeholder:text-ink/40 outline-none focus:border-rope/50"
                  dir="ltr"
                  placeholder="00000000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink/50 mb-1.5">{t("seat")}</label>
                  <select
                    value={addSeat}
                    onChange={(e) => setAddSeat(e.target.value)}
                    className="w-full h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  >
                    {Array.from({ length: addTrip.vehicle.seatCount }, (_, i) => i + 1)
                      .filter((s) => !addTrip.tickets.some((tk) => tk.seatNumber === s && tk.status === "CONFIRMED"))
                      .map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink/50 mb-1.5">{t("price")}</label>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full h-12 px-4 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink/50 mb-1.5">{t("choosePayMethod")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setAddMethod(m.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 h-20 px-2 transition-all active:scale-95 ${
                        addMethod === m.id ? "border-rope bg-rope-soft" : "border-sand-dim bg-sand"
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
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 h-12 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddPassenger}
                disabled={!addName.trim() || !addPhone.trim() || !addSeat || !addAmount || !addMethod || addSaving}
                className="flex-1 h-12 bg-rope text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {addSaving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} />
                    {t("confirm")}
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
