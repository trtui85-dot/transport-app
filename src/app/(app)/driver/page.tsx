"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Route, ArrowRight, Car, CalendarClock,
  PlayCircle, Flag, History, MapPin,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

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

interface Trip {
  id: string;
  status: string;
  departureTime: string;
  arrivalTime: string | null;
  driverId: string;
  departureBranch: Branch;
  arrivalBranch: Branch;
  vehicle: Vehicle;
  tickets: { id: string; status: string }[];
  cargo: { id: string }[];
}

interface CurrentUser {
  userId: string;
  name: string;
  phone: string;
  role: string;
  branchId?: string | null;
}

export default function DriverPage() {
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrips = useCallback(async (driverId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trips?driverId=${driverId}`);
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips || []);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        if (data.user?.userId) {
          return fetchTrips(data.user.userId);
        }
      })
      .catch(() => setError(t("error")));
  }, [fetchTrips, t]);

  const myTrips = (user ? trips.filter((tp) => tp.driverId === user.userId) : [])
    .filter((tp) => tp.status !== "CANCELLED");

  const nextTrip =
    myTrips
      .filter(
        (tp) =>
          !["ARRIVED", "CANCELLED"].includes(tp.status) &&
          new Date(tp.departureTime).getTime() >= Date.now() - 6 * 3600 * 1000
      )
      .sort(
        (a, b) =>
          new Date(a.departureTime).getTime() -
          new Date(b.departureTime).getTime()
      )[0] ||
    myTrips.find((tp) => tp.status === "IN_TRANSIT") ||
    myTrips.find((tp) => tp.status === "DEPARTED") ||
    myTrips[0];

  const history = myTrips
    .filter((tp) => tp.status === "ARRIVED")
    .sort(
      (a, b) =>
        new Date(b.departureTime).getTime() -
        new Date(a.departureTime).getTime()
    )
    .slice(0, 10);

  const passengers = (trip: Trip) =>
    trip.tickets.filter((tk) => tk.status === "CONFIRMED").length;

  const statusLabel = (s: string) => t(s.toLowerCase() as never);

  const changeStatus = async (trip: Trip, status: string) => {
    setError("");
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok && user) {
        fetchTrips(user.userId);
      } else if (user) {
        const data = await res.json();
        setError(data.error || t("error"));
        fetchTrips(user.userId);
      }
    } catch {
      setError(t("error"));
    }
  };

  const canStart = nextTrip && nextTrip.status === "OPEN";
  const canEnd =
    nextTrip && (nextTrip.status === "IN_TRANSIT" || nextTrip.status === "DEPARTED");
  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(lang === "ar" ? "ar-SA" : "fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-ink">
          {lang === "ar" ? "لوحة السائق" : "Driver dashboard"}
        </h1>
        <p className="text-xs text-ink/40 mt-0.5">
          {user?.name || ""}
        </p>
      </div>

      {error && (
        <div className="px-4 mb-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">
            {error}
          </div>
        </div>
      )}

      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock size={16} className="text-rope" />
          <h2 className="text-sm font-semibold text-ink">
            {lang === "ar" ? "رحلتك القادمة" : "Your next trip"}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : !nextTrip ? (
          <div className="bg-foam border border-sand-dim rounded-2xl p-8 text-center">
            <Route size={32} className="mx-auto text-ink/20 mb-3" />
            <p className="text-sm text-ink/40">
              {lang === "ar" ? "لا توجد رحلات مجدولة" : "No trips scheduled"}
            </p>
          </div>
        ) : (
          <div className="bg-rope text-white rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20`}
              >
                {t("status")}: {statusLabel(nextTrip.status)}
              </span>
              <span className="text-xs text-white/70">
                {fmtDate(nextTrip.departureTime)}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 text-center">
                <MapPin size={18} className="mx-auto text-white/50 mb-1" />
                <p className="text-sm font-semibold">{nextTrip.departureBranch.name}</p>
              </div>
              <div className="flex flex-col items-center px-2">
                <ArrowRight size={20} className="rotate-180 text-white/50" />
              </div>
              <div className="flex-1 text-center">
                <MapPin size={18} className="mx-auto text-white/50 mb-1" />
                <p className="text-sm font-semibold">{nextTrip.arrivalBranch.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-white/10 rounded-2xl p-3 mb-5 text-center">
              <div>
                <p className="text-[10px] text-white/60">
                  {lang === "ar" ? "المركبة" : "Vehicle"}
                </p>
                <p className="text-sm font-bold" dir="ltr">
                  {nextTrip.vehicle.plateNumber}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/60">
                  {lang === "ar" ? "المقاعد" : "Seats"}
                </p>
                <p className="text-sm font-bold">
                  {nextTrip.vehicle.seatCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/60">
                  {lang === "ar" ? "الركاب" : "Passengers"}
                </p>
                <p className="text-sm font-bold">{passengers(nextTrip)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => canStart && changeStatus(nextTrip, "DEPARTED")}
                disabled={!canStart}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                  canStart
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-white/10 text-white/30 opacity-60 cursor-not-allowed"
                }`}
              >
                <PlayCircle size={22} />
                {lang === "ar" ? "بدء الرحلة" : "Start Trip"}
              </button>
              <button
                onClick={() => canEnd && changeStatus(nextTrip, "ARRIVED")}
                disabled={!canEnd}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                  canEnd
                    ? "bg-white text-rope hover:bg-white/90"
                    : "bg-white/10 text-white/30 opacity-60 cursor-not-allowed"
                }`}
              >
                <Flag size={22} />
                {lang === "ar" ? "إنهاء الرحلة" : "End Trip"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-rope" />
          <h2 className="text-sm font-semibold text-ink">
            {lang === "ar" ? "الرحلات السابقة" : "Recent trips"}
          </h2>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-ink/40 text-sm">
            {t("noResults")}
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((trip) => (
              <div
                key={trip.id}
                className="bg-foam border border-sand-dim rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Flag size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {trip.departureBranch.name} → {trip.arrivalBranch.name}
                  </p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {fmtDate(trip.departureTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-ink truncate flex items-center gap-1 justify-end" dir="ltr">
                    <Car size={12} className="text-ink/40" />
                    {trip.vehicle.plateNumber}
                  </p>
                  <p className="text-[10px] text-ink/40 mt-0.5">
                    {passengers(trip)} {lang === "ar" ? "راكب" : "pax"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
