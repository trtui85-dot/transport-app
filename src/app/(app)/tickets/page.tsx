"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  MapPin,
  Clock,
  ChevronLeft,
  User,
  Phone,
  Check,
  Printer,
  MessageCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Ticket as TicketIcon,
  Plus,
  Wallet2,
  X,
  Ban,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import SeatMap from "@/components/seat-map";

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

interface Trip {
  id: string;
  departureTime: string;
  price: number;
  status: string;
  vehicle: Vehicle;
  departureBranch: Branch;
  arrivalBranch: Branch;
  tickets: { seatNumber: number; status: string }[];
  driver?: { name: string };
}

interface PaymentMethod {
  id: string;
  name: string;
  nameAr: string;
  logo: string | null;
  isCredit: boolean;
}

interface TicketIssued {
  id: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  paymentMethod: string;
  paid?: boolean;
  status?: string;
  cancelReason?: string | null;
  paymentMethodConfig?: PaymentMethod | null;
  issuedAt: string;
  trip: Trip;
}

interface PassengerForm {
  name: string;
  phone: string;
}

export default function TicketsPage() {
  const { t, lang } = useLanguage();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [forms, setForms] = useState<Record<number, PassengerForm>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [issuedTickets, setIssuedTickets] = useState<TicketIssued[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketIssued[]>([]);
  const [fetchingTrips, setFetchingTrips] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [printMode, setPrintMode] = useState<"thermal" | "a5" | null>(null);
  const [cancellingTicket, setCancellingTicket] = useState<TicketIssued | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelConfirming, setCancelConfirming] = useState(false);

  useEffect(() => {
    const clearPrint = () => {
      const styleEl = document.getElementById("print-page-style");
      if (styleEl) styleEl.remove();
      setPrintMode(null);
    };
    window.addEventListener("afterprint", clearPrint);
    return () => window.removeEventListener("afterprint", clearPrint);
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        const todayTrips = (data.trips || []).filter((trip: Trip) => {
          const tripDate = new Date(trip.departureTime).toISOString().slice(0, 10);
          return (
            tripDate === today &&
            (trip.status === "OPEN" || trip.status === "SCHEDULED")
          );
        });
        setTrips(todayTrips);
      }
    } catch (err) {
      console.error("Fetch trips error:", err);
    } finally {
      setFetchingTrips(false);
    }
  }, []);

  const fetchRecentTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const data = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        const todayTickets = (data.tickets || []).filter((tk: TicketIssued) => {
          return new Date(tk.issuedAt).toISOString().slice(0, 10) === today;
        });
        setRecentTickets(todayTickets.slice(0, 30));
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/payment-methods");
      if (res.ok) {
        const data = await res.json();
        const methods = data.methods || [];
        setPaymentMethods(methods);
        const defaultMethod =
          methods.find((m: PaymentMethod) => !m.isCredit) || methods[0];
        if (defaultMethod) setSelectedMethod(defaultMethod.id);
      }
    } catch (err) {
      console.error("Fetch payment methods error:", err);
      setPaymentMethods([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTrips();
    fetchRecentTickets();
    fetchPaymentMethods();
  }, [fetchTrips, fetchRecentTickets, fetchPaymentMethods]);

  const handleSelectTrip = async (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedSeats([]);
    setForms({});
    setError("");
    setStep(2);
    try {
      const res = await fetch(`/api/trips/${trip.id}`);
      if (res.ok) {
        const data = await res.json();
        const seats = (data.trip?.tickets || [])
          .filter((tk: { status: string }) => tk.status === "CONFIRMED")
          .map((tk: { seatNumber: number }) => tk.seatNumber);
        setOccupiedSeats(seats);
      }
    } catch (err) {
      console.error("Fetch trip seats error:", err);
    }
  };

  const toggleSeat = (seat: number) => {
    if (occupiedSeats.includes(seat)) return;
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  };

  const confirmSeats = () => {
    if (selectedSeats.length === 0) return;
    const nextForms: Record<number, PassengerForm> = {};
    selectedSeats.forEach((s) => {
      nextForms[s] = forms[s] || { name: "", phone: "" };
    });
    setForms(nextForms);
    setError("");
    setStep(3);
  };

  const updateForm = (seat: number, field: keyof PassengerForm, value: string) => {
    setForms((prev) => ({ ...prev, [seat]: { ...prev[seat], [field]: value } }));
  };

  const allFormsValid = useMemo(() => {
    return (
      selectedSeats.length > 0 &&
      selectedSeats.every((s) => {
        const f = forms[s];
        return f && f.name.trim() && f.phone.trim();
      })
    );
  }, [selectedSeats, forms]);

  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find((m) => m.id === selectedMethod) || null;
  }, [paymentMethods, selectedMethod]);

  const totalAmount = useMemo(() => {
    if (!selectedTrip) return 0;
    return selectedSeats.length * selectedTrip.price;
  }, [selectedTrip, selectedSeats]);

  const handleConfirm = async () => {
    if (!selectedTrip || !allFormsValid) return;

    setError("");
    setConfirming(true);
    setIssuedTickets([]);
    setProgress(0);

    const total = selectedSeats.length;
    const created: TicketIssued[] = [];

    try {
      for (let i = 0; i < total; i++) {
        const seat = selectedSeats[i];
        const form = forms[seat];
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId: selectedTrip.id,
            seatNumber: seat,
            passengerName: form.name.trim(),
            passengerPhone: form.phone.trim(),
            paymentMethod: "CASH",
            paymentMethodConfigId: selectedPaymentMethod?.id || null,
            amount: selectedTrip.price,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t("error"));
          break;
        }

        created.push({ ...data.ticket, trip: selectedTrip });
        setProgress(i + 1);
      }
    } catch {
      setError(lang === "ar" ? "خطأ في الاتصال" : "Erreur de connexion");
    }

    setIssuedTickets(created);
    if (created.length > 0) fetchRecentTickets();
    setConfirming(false);
    if (created.length === total) setStep(3);
  };

  const resetBooking = () => {
    setSelectedTrip(null);
    setSelectedSeats([]);
    setForms({});
    setError("");
    setIssuedTickets([]);
    setProgress(0);
    setStep(1);
  };

  const paymentLabel = (tk: TicketIssued) => {
    if (tk.paymentMethodConfig?.nameAr && lang === "ar") return tk.paymentMethodConfig.nameAr;
    if (tk.paymentMethodConfig?.name) return tk.paymentMethodConfig.name;
    const key = tk.paymentMethod.toLowerCase() as "cash" | "debt" | "wallet";
    return t(key);
  };

  const paymentLogoFor = (tk: TicketIssued) => tk.paymentMethodConfig?.logo || null;

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(lang === "ar" ? "ar-SA" : "fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-SA" : "fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const handlePrint = (mode: "thermal" | "a5") => {
    const prev = document.getElementById("print-page-style");
    if (prev) prev.remove();
    const styleEl = document.createElement("style");
    styleEl.id = "print-page-style";
    styleEl.textContent =
      mode === "thermal"
        ? "@page { size: 105mm 148mm; margin: 0; }"
        : "@page { size: A5; margin: 0; }";
    document.head.appendChild(styleEl);
    setPrintMode(mode);
    setTimeout(() => window.print(), 50);
  };

  const openCancel = (tk: TicketIssued) => {
    setCancellingTicket(tk);
    setCancelReason("");
    setCancelError("");
  };

  const handleCancelTicket = async () => {
    if (!cancellingTicket || !cancelReason || cancelConfirming) return;
    setCancelConfirming(true);
    try {
      const res = await fetch(`/api/tickets/${cancellingTicket.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        setCancellingTicket(null);
        setCancelReason("");
        fetchRecentTickets();
      } else {
        const data = await res.json();
        setCancelError(data.error || t("error"));
      }
    } catch {
      setCancelError(t("error"));
    }
    setCancelConfirming(false);
  };

  const cancelReasonLabel = (r?: string | null) => {
    if (r === "TEST") return lang === "ar" ? "تجربة" : "Test";
    if (r === "PASSENGER_DISSATISFIED") return lang === "ar" ? "الراكب لم يعجبه الوضع" : "Client insatisfait";
    return lang === "ar" ? "أخرى" : "Autre";
  };

  const handleWhatsApp = (tk: TicketIssued) => {
    const phone = tk.passengerPhone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `${lang === "ar" ? "تذكرتك" : "Votre billet"}\n` +
        `${selectedTrip?.departureBranch?.name || tk.trip.departureBranch.name} → ${selectedTrip?.arrivalBranch?.name || tk.trip.arrivalBranch.name}\n` +
        `${lang === "ar" ? "التاريخ" : "Date"}: ${formatDate(tk.trip.departureTime)} ${formatTime(tk.trip.departureTime)}\n` +
        `${t("seat")}: ${tk.seatNumber}\n` +
        `${t("passengerName")}: ${tk.passengerName}\n` +
        `${t("price")}: ${tk.amount.toLocaleString()} ${t("mr")}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const getPassengerSuggestions = (seat: number) => {
    const currentName = (forms[seat]?.name || "").trim().toLowerCase();
    if (!currentName) return [];
    const seen = new Set<string>();
    const matches: { name: string; phone: string }[] = [];
    for (const tk of recentTickets) {
      const n = tk.passengerName.trim();
      if (!n.toLowerCase().includes(currentName)) continue;
      const key = `${n}|${tk.passengerPhone}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ name: n, phone: tk.passengerPhone });
      if (matches.length >= 5) break;
    }
    return matches;
  };

  const isRtl = lang === "ar";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  // ---- Ticket issued view ----
  if (issuedTickets.length > 0 && step === 3 && !confirming) {
    return (
      <div className="max-w-md mx-auto lg:max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-ink font-[family-name:var(--font-display)]">
            {lang === "ar" ? "التذاكر الصادرة" : "Billets émis"}
          </h1>
          <span className="text-sm font-semibold text-success bg-success/10 px-3 py-1 rounded-full">
            {issuedTickets.length} {lang === "ar" ? "تذكر" : "billet(s)"}
          </span>
        </div>

        <div className="space-y-5">
          {issuedTickets.map((tk) => (
            <article
              key={tk.id}
              className={`print-ticket bg-foam rounded-2xl border-2 border-dashed border-rope/60 overflow-hidden ${
                printMode === "thermal" ? "print-thermal" : "print-a5"
              }`}
            >
              {printMode === "thermal" ? (
                <div className="bg-white text-black">
                  <div
                    className="px-4 py-4"
                    style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                  >
                    <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                      <span className="text-[10px] font-bold tracking-wide">
                        {lang === "ar" ? "شركة النقل" : "Transport Co."}
                      </span>
                      <span className="text-[10px] font-bold">{t("tickets")} #{tk.seatNumber}</span>
                    </div>
                    <div className="text-center font-bold text-[11px] leading-snug">
                      {tk.trip.departureBranch.name} → {tk.trip.arrivalBranch.name}
                    </div>
                    <div className="text-center text-[9px] text-gray-700 mb-2">
                      {formatDate(tk.trip.departureTime)} · {formatTime(tk.trip.departureTime)}
                    </div>
                    <div className="text-center border-y border-dashed border-gray-500 py-3 my-2">
                      <div className="text-[8px] uppercase text-gray-600 mb-1">{t("seat")}</div>
                      <div className="text-6xl font-black tracking-widest">{tk.seatNumber}</div>
                    </div>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">{t("passengerName")}</span>
                        <span className="font-bold">{tk.passengerName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">{t("passengerPhone")}</span>
                        <span className="font-bold" dir="ltr">{tk.passengerPhone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">{t("paymentMethod")}</span>
                        <span className="font-bold">{paymentLabel(tk)}</span>
                      </div>
                      {tk.paid === false && (
                        <div className="font-bold text-center">
                          {lang === "ar" ? "أجل - الدفع عند الوصول" : "Ajl - paiement à l'arrivée"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t-2 border-black pt-2 mt-2 text-[11px]">
                      <span className="font-bold">{t("price")}</span>
                      <span className="font-black text-base">
                        {tk.amount.toLocaleString()} {t("mr")}
                      </span>
                    </div>
                    <div className="mt-3 text-center text-[8px] text-gray-600 border-t border-dashed border-gray-400 pt-2">
                      {lang === "ar" ? "شكرًا لسفركم معنا. تذكرة سارية ليوم واحد فقط." : "Merci de voyager avec nous."}
                    </div>
                  </div>
                </div>
              ) : (
                <>
              {/* Ticket head */}
              <div className="bg-rope px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TicketIcon size={18} className="text-white" />
                  <span className="text-white font-bold font-[family-name:var(--font-display)]">
                    {lang === "ar" ? "شركة النقل" : "Transport Co."}
                  </span>
                </div>
                <span className="text-rope-soft text-xs">#{tk.seatNumber}</span>
              </div>

              <div className="p-5">
                {/* Trip info */}
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-ink-faint text-[10px] uppercase tracking-wide">
                      {t("from")}
                    </p>
                    <p className="font-bold text-ink text-sm">
                      {tk.trip.departureBranch.name}
                    </p>
                  </div>
                  <div className="mx-3 flex items-center gap-1 text-rope">
                    <span className="w-6 h-px bg-rope/40" />
                    <ChevronLeft size={16} className="rotate-180" />
                    <span className="w-6 h-px bg-rope/40" />
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-ink-faint text-[10px] uppercase tracking-wide">
                      {t("to")}
                    </p>
                    <p className="font-bold text-ink text-sm">
                      {tk.trip.arrivalBranch.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-ink-faint">
                  <Clock size={13} />
                  <span>
                    {formatDate(tk.trip.departureTime)} · {formatTime(tk.trip.departureTime)}
                  </span>
                </div>

                {/* Seat number */}
                <div className="my-4 border-y border-dashed border-sand-dim py-4 text-center">
                  <p className="text-ink-faint text-xs mb-1">{t("seat")}</p>
                  <p className="text-5xl font-black text-rope font-[family-name:var(--font-display)]">
                    {tk.seatNumber}
                  </p>
                </div>

                {/* Passenger */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-ink-faint shrink-0" />
                    <span className="text-ink font-semibold">{tk.passengerName}</span>
                  </div>
                  <div className="flex items-center gap-2" dir="ltr">
                    <Phone size={15} className="text-ink-faint shrink-0" />
                    <span className="text-ink font-medium tracking-wider">
                      {tk.passengerPhone}
                    </span>
                  </div>
                </div>

                {/* Amount + payment */}
                <div className="mt-4 flex items-center justify-between bg-sand rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <MethodLogo method={tk.paymentMethodConfig} size={28} />
                    <span className="text-xs text-ink-faint">{paymentLabel(tk)}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-ink-faint text-[10px]">{t("price")}</p>
                    <p className="text-lg font-bold text-rope">
                      {tk.amount.toLocaleString()} {t("mr")}
                    </p>
                  </div>
                </div>
                {tk.paid === false && (
                  <div className="mt-2 flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-3 py-2">
                    <Clock size={14} className="text-warning shrink-0" />
                    <span className="text-xs font-semibold text-warning">
                      {lang === "ar" ? "أجل - الدفع عند الوصول" : "Ajl - paiement à l'arrivée"}
                    </span>
                  </div>
                )}
              </div>
                </>
              )}

              {/* Ticket actions */}
              <div className="px-5 pb-5 space-y-2 no-print">
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePrint("thermal")}
                    className="flex-1 h-12 rounded-xl bg-ink text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <Printer size={18} />
                    {lang === "ar" ? "طباعة حرارية A6" : "Thermique A6"}
                  </button>
                  <button
                    onClick={() => handlePrint("a5")}
                    className="flex-1 h-12 rounded-xl bg-sand border border-sand-dim text-ink text-sm font-medium flex items-center justify-center gap-2 hover:bg-sand-dim transition-colors active:scale-[0.98]"
                  >
                    <Printer size={18} />
                    {lang === "ar" ? "طباعة عادية A5" : "Standard A5"}
                  </button>
                </div>
                <button
                  onClick={() => handleWhatsApp(tk)}
                  className="w-full h-12 rounded-xl bg-success text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <MessageCircle size={18} />
                  WhatsApp
                </button>
              </div>
            </article>
          ))}
        </div>

        <button
          onClick={resetBooking}
          className="mt-6 w-full h-14 rounded-xl bg-rope text-white text-sm font-semibold hover:bg-rope-dark active:scale-[0.98] transition-all no-print"
        >
          <span className="flex items-center justify-center gap-2">
            <Plus size={18} />
            {t("newTicket")}
          </span>
        </button>
      </div>
    );
  }

  // ---- Booking flow ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink font-[family-name:var(--font-display)]">
          {t("newTicket")}
        </h1>
        {step > 1 && (
          <button
            onClick={() => {
              if (step === 3) {
                setSelectedSeats([]);
                setForms({});
                setError("");
                setStep(2);
              } else {
                setSelectedTrip(null);
                setSelectedSeats([]);
                setForms({});
                setError("");
                setStep(1);
              }
            }}
            className="text-sm text-rope font-medium flex items-center gap-1 bg-rope/5 px-3 py-2 rounded-lg"
          >
            <Arrow size={14} />
            {t("back")}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-ink-faint">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= s ? "bg-rope text-white" : "bg-sand-dim text-ink-faint"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div className={`w-8 h-0.5 ${step > s ? "bg-rope" : "bg-sand-dim"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Trip */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">
            {lang === "ar" ? "اختر الرحلة" : "Choisir le trajet"}
          </h2>
          {fetchingTrips ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-rope" />
            </div>
          ) : trips.length === 0 ? (
            <div className="bg-foam rounded-2xl border border-sand-dim p-8 text-center">
              <p className="text-ink-faint text-sm">{t("noResults")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((trip) => {
                const seatCount = trip.vehicle.seatCount;
                const taken = trip.tickets?.length || 0;
                const available = seatCount - taken;
                const time = formatTime(trip.departureTime);

                return (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip)}
                    className="w-full bg-foam rounded-xl border border-sand-dim p-4 text-start hover:border-rope transition-colors active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rope/10 flex items-center justify-center">
                          <Clock size={18} className="text-rope" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{time}</p>
                          <p className="text-xs text-ink-faint">
                            {trip.vehicle.type} · {trip.vehicle.plateNumber}
                          </p>
                        </div>
                      </div>
                      <Arrow size={16} className="text-ink-faint" />
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-ink-faint">
                      <MapPin size={12} />
                      <span className="font-medium text-ink">
                        {trip.departureBranch.name}
                      </span>
                      <span>→</span>
                      <span className="font-medium text-ink">{trip.arrivalBranch.name}</span>
                      <span className="mr-auto text-rope font-semibold">
                        {trip.price.toLocaleString()} {t("mr")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-sand rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rope rounded-full"
                          style={{ width: `${(taken / seatCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-ink-faint">
                        {available}/{seatCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Seat Map (multi-select) */}
      {step === 2 && selectedTrip && (
        <div className="space-y-3">
          <div className="bg-foam rounded-xl border border-sand-dim p-3">
            <div className="flex items-center gap-2 text-sm text-ink">
              <MapPin size={14} className="text-rope" />
              <span className="font-semibold">{selectedTrip.departureBranch.name}</span>
              <span className="text-ink-faint">→</span>
              <span className="font-semibold">{selectedTrip.arrivalBranch.name}</span>
              <span className="mr-auto text-rope font-bold">
                {selectedTrip.price.toLocaleString()} {t("mr")}
              </span>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-ink">
            {lang === "ar" ? "اختر المقاعد (يمكنك اختيار أكثر من مقعد)" : "Choisissez les places (plusieurs possibles)"}
          </h2>

          <SeatMap
            totalSeats={selectedTrip.vehicle.seatCount}
            occupiedSeats={occupiedSeats}
            selectedSeats={selectedSeats}
            onSelect={toggleSeat}
          />

          <div className="bg-foam rounded-xl border border-sand-dim p-4 mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {selectedSeats.length}
              </span>
              <span className="text-sm text-ink">
                {selectedSeats.length > 0
                  ? lang === "ar"
                    ? "مقعد محدد"
                    : "place(s) sélectionnée(s)"
                  : lang === "ar"
                  ? "لم تختر أي مقعد"
                  : "Aucune place sélectionnée"}
              </span>
            </div>
            <span className="text-sm font-bold text-rope">
              {totalAmount.toLocaleString()} {t("mr")}
            </span>
          </div>

          <button
            onClick={confirmSeats}
            disabled={selectedSeats.length === 0}
            className="w-full h-13 py-3.5 rounded-xl bg-rope text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rope-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            <Check size={18} />
            {lang === "ar"
              ? "متابعة إلى بيانات الركاب"
              : "Continuer vers les passagers"}
          </button>
        </div>
      )}

      {/* Step 3: Passenger forms + Payment */}
      {step === 3 && selectedTrip && (
        <div className="space-y-5">
          <div className="bg-foam rounded-xl border border-sand-dim p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-faint">{t("seat")}:</span>
              <span className="font-bold text-rope">
                {selectedSeats.join(" ، ")}
              </span>
            </div>
            <div className="text-sm font-bold text-rope">
              {totalAmount.toLocaleString()} {t("mr")}
            </div>
          </div>

          {/* Passenger forms */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-ink">
              {lang === "ar" ? "بيانات الركاب" : "Données des passagers"}
            </h2>
            {selectedSeats.map((seat) => {
              const form = forms[seat] || { name: "", phone: "" };
              const suggestions = getPassengerSuggestions(seat);
              return (
                <div key={seat} className="bg-foam rounded-xl border border-sand-dim p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink">
                      {lang === "ar" ? "المقعد" : "Place"} {seat}
                    </p>
                    <span className="text-xs text-ink-faint">
                      {selectedTrip.price.toLocaleString()} {t("mr")}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      {t("passengerName")} *
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint"
                      />
                      <input
                        type="text"
                        className="w-full h-12 px-10 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50"
                        placeholder={lang === "ar" ? "اسم الراكب" : "Nom du passager"}
                        value={form.name}
                        onChange={(e) => updateForm(seat, "name", e.target.value)}
                      />
                    </div>
                    {suggestions.length > 0 && (
                      <div className="mt-2 bg-foam border border-sand-dim rounded-xl overflow-hidden shadow-sm">
                        {suggestions.map((s, idx) => (
                          <button
                            key={`${s.name}-${s.phone}-${idx}`}
                            onClick={() => {
                              updateForm(seat, "name", s.name);
                              updateForm(seat, "phone", s.phone);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-start hover:bg-sand/50 transition-colors border-b border-sand-dim/50 last:border-0"
                          >
                            <span className="text-sm text-ink flex items-center gap-2">
                              <User size={14} className="text-rope" />
                              {s.name}
                            </span>
                            <span className="text-xs text-ink-faint" dir="ltr">
                              {s.phone}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      {t("passengerPhone")} *
                    </label>
                    <div className="relative">
                      <Phone
                        size={16}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint"
                      />
                      <input
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        className="w-full h-12 px-10 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50 text-center"
                        placeholder="43XXXXXX"
                        value={form.phone}
                        onChange={(e) =>
                          updateForm(seat, "phone", e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment method (applies to all seats) */}
          <div>
            <label className="block text-xs font-medium text-ink mb-2">
              {lang === "ar" ? "طريقة الدفع (لكل المقاعد)" : "Mode de paiement (pour toutes les places)"}
            </label>

            <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 lg:grid lg:grid-cols-3 lg:gap-3 scrollbar-thin">
              {paymentMethods.length === 0 ? (
                <div className="flex gap-3">
                  {([
                    { id: "CASH", name: "Cash", nameAr: "نقدي", logo: null, isCredit: false },
                    { id: "AJL", name: "Ajl", nameAr: "أجل", logo: null, isCredit: true },
                    { id: "WALLET", name: "Portefeuille", nameAr: "محفظة", logo: null, isCredit: false },
                  ] as PaymentMethod[]).map((m) => (
                    <PaymentButton
                      key={m.id}
                      method={m}
                      lang={lang}
                      selected={selectedMethod === m.id}
                      onSelect={() => setSelectedMethod(m.id)}
                    />
                  ))}
                </div>
              ) : (
                paymentMethods.map((m) => (
                  <PaymentButton
                    key={m.id}
                    method={m}
                    lang={lang}
                    selected={selectedMethod === m.id}
                    onSelect={() => setSelectedMethod(m.id)}
                  />
                ))
              )}
            </div>
            {selectedPaymentMethod && (
              <p className="text-xs text-ink-faint mt-1">
                {lang === "ar"
                  ? "سيتم تطبيق هذه الطريقة على جميع المقاعد"
                  : "Cette méthode s'appliquera à toutes les places"}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-2.5 text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={confirming || !allFormsValid}
            className="w-full h-14 rounded-xl bg-rope text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rope-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            {confirming ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {progress}/{selectedSeats.length}
              </>
            ) : (
              <>
                <Check size={18} />
                {lang === "ar" ? "تأكيد وإصدار كل التذاكر" : "Confirmer et émettre les billets"}
                {selectedSeats.length > 1 && ` (${selectedSeats.length})`}
              </>
            )}
          </button>
        </div>
      )}

      {/* Recent Tickets */}
      {recentTickets.length > 0 && step === 1 && (
        <div className="space-y-3 pt-4 border-t border-sand-dim">
          <h2 className="text-sm font-semibold text-ink">
            {lang === "ar" ? "تذاكر اليوم" : "Billets d'aujourd'hui"}
          </h2>
          <div className="space-y-2">
            {recentTickets.map((tk) => {
              const time = formatTime(tk.issuedAt);
              const cancelled = tk.status === "CANCELLED";
              return (
                <div
                  key={tk.id}
                  className={`bg-foam rounded-xl border p-3 flex items-center justify-between ${
                    cancelled ? "border-danger/30 opacity-70" : "border-sand-dim"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        cancelled ? "bg-danger/10" : "bg-rope/10"
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${cancelled ? "text-danger line-through" : "text-rope"}`}
                      >
                        {tk.seatNumber}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{tk.passengerName}</p>
                      <p className="text-[10px] text-ink-faint">{time}</p>
                      {cancelled && tk.cancelReason && (
                        <p className="text-[10px] text-danger font-medium">
                          {lang === "ar" ? "ملغاة" : "Annulé"} · {cancelReasonLabel(tk.cancelReason)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p
                        className={`text-sm font-semibold ${cancelled ? "text-ink/40 line-through" : "text-rope"}`}
                      >
                        {tk.amount.toLocaleString()} {t("mr")}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-ink/40">
                        <MethodLogo method={tk.paymentMethodConfig} size={18} />
                        <span>{paymentLabel(tk)}</span>
                        {tk.paid === false && !cancelled && (
                          <span className="px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">
                            {lang === "ar" ? "أجل" : "Ajl"}
                          </span>
                        )}
                      </div>
                    </div>
                    {!cancelled && (
                      <button
                        onClick={() => openCancel(tk)}
                        title={t("cancelTicket")}
                        className="w-9 h-9 rounded-lg bg-danger/10 text-danger flex items-center justify-center active:scale-95 transition-transform hover:bg-danger/15 shrink-0"
                      >
                        <Ban size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel reason sheet */}
      {cancellingTicket && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCancellingTicket(null)}
          />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-ink">{t("cancelTicket")}</h2>
              <button onClick={() => setCancellingTicket(null)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>
            <p className="text-xs text-ink/40 mb-4">
              {t("seat")} {cancellingTicket.seatNumber} · {cancellingTicket.passengerName}
            </p>

            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {cancelError}
              </div>
            )}

            <div className="space-y-2">
              {[
                { value: "TEST", ar: "تجربة", fr: "Test" },
                { value: "PASSENGER_DISSATISFIED", ar: "الراكب لم يعجبه الوضع", fr: "Client insatisfait" },
                { value: "OTHER", ar: "أخرى", fr: "Autre" },
              ].map((reason) => {
                const checked = cancelReason === reason.value;
                return (
                  <button
                    key={reason.value}
                    onClick={() => setCancelReason(reason.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-start transition-all ${
                      checked ? "border-danger bg-danger/5" : "border-sand-dim bg-sand"
                    }`}
                  >
                    <span className="text-sm font-medium text-ink">
                      {lang === "ar" ? reason.ar : reason.fr}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        checked ? "bg-danger border-danger" : "border-sand-dim"
                      }`}
                    >
                      {checked && <Check size={14} className="text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCancellingTicket(null)}
                className="flex-1 h-12 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCancelTicket}
                disabled={!cancelReason || cancelConfirming}
                className="flex-1 h-12 bg-danger text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {cancelConfirming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Ban size={16} />
                    {lang === "ar" ? "تأكيد الإلغاء" : "Confirmer l'annulation"}
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

function MethodLogo({ method, size = 28 }: { method?: PaymentMethod | null; size?: number }) {
  if (method?.logo) {
    return (
      <img
        src={method.logo}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-lg object-cover shrink-0"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-lg bg-sand-dim flex items-center justify-center shrink-0"
    >
      <Wallet2 size={size * 0.55} className="text-ink-faint" />
    </span>
  );
}

function PaymentButton({
  method,
  lang,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  lang: "ar" | "fr";
  selected: boolean;
  onSelect: () => void;
}) {
  const label = lang === "ar" && method.nameAr ? method.nameAr : method.name;
  return (
    <button
      onClick={onSelect}
      title={method.isCredit ? (lang === "ar" ? "آجل - الدفع عند الوصول" : "Ajl - paiement à l'arrivée") : undefined}
      className={`shrink-0 min-w-[120px] lg:min-w-0 lg:w-full h-24 lg:h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 px-3 transition-all active:scale-[0.97] relative ${
        selected
          ? "border-rope bg-rope-soft text-rope shadow-md"
          : "border-sand-dim bg-foam text-ink hover:border-rope/40"
      }`}
    >
      <MethodLogo method={method} size={40} />
      <span className={`text-sm font-semibold text-center ${selected ? "text-rope" : "text-ink"}`}>
        {label}
      </span>
      {selected && (
        <span className="absolute top-2 end-2 w-5 h-5 rounded-full bg-rope text-white flex items-center justify-center">
          <Check size={12} />
        </span>
      )}
    </button>
  );
}
