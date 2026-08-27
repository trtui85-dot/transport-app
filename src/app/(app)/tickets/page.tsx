"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Banknote,
  CreditCard,
  Wallet,
  Check,
  Printer,
  MessageCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Trip {
  id: string;
  departureTime: string;
  price: number;
  status: string;
  vehicle: { id: string; seatCount: number; plateNumber: string; type: string };
  departureBranch: { id: string; name: string; city: string };
  arrivalBranch: { id: string; name: string; city: string };
  tickets: { seatNumber: number; status: string }[];
  driver?: { name: string };
}

interface TicketIssued {
  id: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  paymentMethod: string;
  issuedAt: string;
  trip: Trip;
}

export default function TicketsPage() {
  const { t, lang } = useLanguage();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "DEBT" | "WALLET">("CASH");
  const [loading, setLoading] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<TicketIssued | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketIssued[]>([]);
  const [error, setError] = useState("");
  const [fetchingTrips, setFetchingTrips] = useState(true);

  const fetchTrips = useCallback(async () => {
    setFetchingTrips(true);
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
        setRecentTickets(todayTickets.slice(0, 20));
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    fetchRecentTickets();
  }, [fetchTrips, fetchRecentTickets]);

  const handleSelectTrip = async (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedSeat(null);
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

  const handleSeatSelect = (seat: number) => {
    if (occupiedSeats.includes(seat)) return;
    setSelectedSeat(seat);
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!selectedTrip || !selectedSeat || !passengerName || !passengerPhone) return;

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          seatNumber: selectedSeat,
          passengerName,
          passengerPhone,
          paymentMethod,
          amount: selectedTrip.price,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("error"));
        return;
      }

      setIssuedTicket({ ...data.ticket, trip: selectedTrip });
      fetchRecentTickets();
    } catch {
      setError(lang === "ar" ? "خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setSelectedTrip(null);
    setSelectedSeat(null);
    setPassengerName("");
    setPassengerPhone("");
    setPaymentMethod("CASH");
    setError("");
    setIssuedTicket(null);
    setStep(1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!issuedTicket) return;
    const phone = issuedTicket.passengerPhone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `${t("ticketIssued")}\n${t("seat")}: ${issuedTicket.seatNumber}\n${t("price")}: ${issuedTicket.amount} ${t("mr")}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const isRtl = lang === "ar";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  if (issuedTicket) {
    return (
      <div className="max-w-md mx-auto lg:max-w-lg">
        <div className="bg-foam rounded-2xl border border-sand-dim p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-success" />
          </div>
          <h2 className="text-lg font-bold text-ink font-[family-name:var(--font-display)] mb-1">
            {t("ticketIssued")}
          </h2>

          <div className="mt-6 bg-sand rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-ink-faint">{t("seat")}</span>
              <span className="font-semibold text-ink">{issuedTicket.seatNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">{t("passengerName")}</span>
              <span className="font-semibold text-ink">{issuedTicket.passengerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">{t("passengerPhone")}</span>
              <span className="font-semibold text-ink">{issuedTicket.passengerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">{t("paymentMethod")}</span>
              <span className="font-semibold text-ink">
                {t(issuedTicket.paymentMethod.toLowerCase() as "cash" | "debt" | "wallet")}
              </span>
            </div>
            <div className="flex justify-between border-t border-sand-dim pt-2">
              <span className="text-ink-faint">{t("price")}</span>
              <span className="font-bold text-rope text-lg">
                {issuedTicket.amount.toLocaleString()} {t("mr")}
              </span>
            </div>
            <div className="flex justify-between text-xs text-ink-faint">
              <span>
                {issuedTicket.trip.departureBranch.name} → {issuedTicket.trip.arrivalBranch.name}
              </span>
              <span>
                {new Date(issuedTicket.trip.departureTime).toLocaleTimeString(
                  lang === "ar" ? "ar-SA" : "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handlePrint}
              className="flex-1 h-11 rounded-xl bg-sand border border-sand-dim text-ink text-sm font-medium flex items-center justify-center gap-2 hover:bg-sand-dim transition-colors"
            >
              <Printer size={16} />
              {lang === "ar" ? "طباعة" : "Imprimer"}
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex-1 h-11 rounded-xl bg-success text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          </div>

          <button
            onClick={resetBooking}
            className="mt-4 w-full h-11 rounded-xl bg-rope text-white text-sm font-semibold hover:bg-rope-dark transition-colors"
          >
            {t("newTicket")}
          </button>
        </div>
      </div>
    );
  }

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
                setSelectedSeat(null);
                setStep(2);
              } else {
                setSelectedTrip(null);
                setStep(1);
              }
            }}
            className="text-sm text-rope font-medium flex items-center gap-1"
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
                step >= s
                  ? "bg-rope text-white"
                  : "bg-sand-dim text-ink-faint"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-8 h-0.5 ${
                  step > s ? "bg-rope" : "bg-sand-dim"
                }`}
              />
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
                const time = new Date(trip.departureTime).toLocaleTimeString(
                  lang === "ar" ? "ar-SA" : "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                );

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
                      <span className="font-medium text-ink">
                        {trip.arrivalBranch.name}
                      </span>
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

      {/* Step 2: Seat Map */}
      {step === 2 && selectedTrip && (
        <div className="space-y-3">
          <div className="bg-foam rounded-xl border border-sand-dim p-3">
            <div className="flex items-center gap-2 text-sm text-ink">
              <MapPin size={14} className="text-rope" />
              <span className="font-semibold">{selectedTrip.departureBranch.name}</span>
              <span className="text-ink-faint">→</span>
              <span className="font-semibold">{selectedTrip.arrivalBranch.name}</span>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-ink">
            {lang === "ar" ? "اختر المقعد" : "Choisir la place"}
          </h2>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: selectedTrip.vehicle.seatCount }, (_, i) => i + 1).map(
              (seat) => {
                const isOccupied = occupiedSeats.includes(seat);
                const isSelected = selectedSeat === seat;
                return (
                  <button
                    key={seat}
                    onClick={() => handleSeatSelect(seat)}
                    disabled={isOccupied}
                    className={`aspect-square rounded-xl text-sm font-semibold flex items-center justify-center transition-all ${
                      isOccupied
                        ? "bg-sand-dim text-ink-faint/40 cursor-not-allowed"
                        : isSelected
                        ? "bg-rope text-white scale-105"
                        : "bg-foam border border-sand-dim text-ink hover:border-rope hover:bg-rope/5 active:scale-95"
                    }`}
                  >
                    {seat}
                  </button>
                );
              }
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-faint justify-center pt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-foam border border-sand-dim" />
              <span>{t("available")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-sand-dim" />
              <span>{t("occupied")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-rope" />
              <span>{lang === "ar" ? "محدد" : "Sélectionné"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Passenger Info & Payment */}
      {step === 3 && selectedTrip && selectedSeat && (
        <div className="space-y-4">
          <div className="bg-foam rounded-xl border border-sand-dim p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-faint">{t("seat")}:</span>
              <span className="font-bold text-rope text-lg">{selectedSeat}</span>
            </div>
            <div className="text-sm font-bold text-rope">
              {selectedTrip.price.toLocaleString()} {t("mr")}
            </div>
          </div>

          <div className="space-y-3">
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
                  className="w-full h-11 px-10 rounded-xl bg-foam border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50"
                  placeholder={lang === "ar" ? "اسم الراكب" : "Nom du passager"}
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  autoFocus
                />
              </div>
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
                  className="w-full h-11 px-10 rounded-xl bg-foam border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50 text-center"
                  placeholder="43XXXXXX"
                  value={passengerPhone}
                  onChange={(e) =>
                    setPassengerPhone(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-2">
              {t("paymentMethod")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "CASH" as const, icon: Banknote, label: t("cash"), color: "success" },
                { key: "DEBT" as const, icon: CreditCard, label: t("debt"), color: "warning" },
                { key: "WALLET" as const, icon: Wallet, label: t("wallet"), color: "sea" },
              ]).map(({ key, icon: Icon, label, color }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={`h-16 rounded-xl border-2 text-sm font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === key
                      ? `border-${color} bg-${color}/10 text-${color}`
                      : "border-sand-dim bg-foam text-ink-faint hover:border-sand-dim"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-2.5 text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading || !passengerName || !passengerPhone}
            className="w-full h-12 rounded-xl bg-rope text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rope-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Check size={18} />
                {t("confirmTicket")}
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
              const time = new Date(tk.issuedAt).toLocaleTimeString(
                lang === "ar" ? "ar-SA" : "fr-FR",
                { hour: "2-digit", minute: "2-digit" }
              );
              return (
                <div
                  key={tk.id}
                  className="bg-foam rounded-xl border border-sand-dim p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rope/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-rope">
                        {tk.seatNumber}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{tk.passengerName}</p>
                      <p className="text-[10px] text-ink-faint">{time}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-rope">
                      {tk.amount.toLocaleString()} {t("mr")}
                    </p>
                    <p className="text-[10px] text-ink-faint">
                      {t(tk.paymentMethod.toLowerCase() as "cash" | "debt" | "wallet")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
