"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Car, Bus, Truck, Radio, ArrowRight, ArrowLeft, User, Users, Clock,
  Wrench, Ban, Navigation, RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { fmtTime, routeArrow } from "@/lib/datetime";

interface Branch {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  type: string;
  plateNumber: string;
  seatCount: number;
  status: string;
  branchId: string;
  branch: Branch;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
}

interface Trip {
  id: string;
  status: string;
  departureTime: string;
  arrivalTime: string | null;
  departureBranchId: string;
  arrivalBranchId: string;
  departureBranch: Branch;
  arrivalBranch: Branch;
  vehicleId: string;
  driver: Driver;
  tickets: { id: string; status: string }[];
  cargo: { id: string }[];
}

const VEHICLE_ICONS: Record<string, typeof Car> = {
  BUS: Bus,
  MINIBUS: Car,
  TRUCK: Truck,
};

const STATUS_META: Record<
  string,
  { text: string; dot: string; badge: string; border: string; key: string }
> = {
  ARRIVED: {
    text: "text-green-600",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-700",
    border: "border-green-200",
    key: "arrived",
  },
  IN_TRANSIT: {
    text: "text-blue-600",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
    key: "inTransit",
  },
  DEPARTED: {
    text: "text-yellow-700",
    dot: "bg-yellow-400",
    badge: "bg-yellow-100 text-yellow-700",
    border: "border-yellow-200",
    key: "departed",
  },
};

export default function FleetPage() {
  const { t, lang } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState("");

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchFleet = useCallback(async () => {
    try {
      setLoading(true);
      const [vRes, tRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/trips?status=DEPARTED,IN_TRANSIT,OPEN"),
      ]);
      if (vRes.ok) {
        const vd = await vRes.json();
        setVehicles(vd.vehicles || []);
      }
      if (tRes.ok) {
        const td = await tRes.json();
        setTrips(td.trips || []);
      }
      setLastRefresh(new Date());
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 60000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  const activeStateForTrip = (trip: Trip): string => {
    if (trip.status === "ARRIVED") return "ARRIVED";
    if (trip.status === "IN_TRANSIT") return "IN_TRANSIT";
    if (trip.status === "DEPARTED") return "DEPARTED";
    return "IN_BRANCH";
  };

  const vehicleActiveState = (vehicleId: string): string => {
    const candidate = trips
      .filter((tp) => tp.vehicleId === vehicleId)
      .sort(
        (a, b) =>
          new Date(b.departureTime).getTime() -
          new Date(a.departureTime).getTime()
      )[0];
    if (!candidate) return "IN_BRANCH";
    return activeStateForTrip(candidate);
  };

  const timeSince = (from: string) => {
    const diff = Date.now() - new Date(from).getTime();
    const minutes = Math.max(0, Math.floor(diff / 60000));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins} ${lang === "ar" ? "دقيقة" : "min"}`;
    return `${hours} ${lang === "ar" ? "ساعة" : "h"} ${mins} ${lang === "ar" ? "دقيقة" : "min"}`;
  };

  const passengers = (trip: Trip) =>
    trip.tickets.filter((tk) => tk.status === "CONFIRMED").length;

  const currentTrip = (vehicleId: string): Trip | undefined => {
    return trips
      .filter(
        (tp) =>
          tp.vehicleId === vehicleId &&
          ["DEPARTED", "IN_TRANSIT"].includes(tp.status)
      )
      .sort(
        (a, b) =>
          new Date(b.departureTime).getTime() -
          new Date(a.departureTime).getTime()
      )[0];
  };

  const onRoadCount = vehicles.filter(
    (v) => vehicleActiveState(v.id) === "IN_TRANSIT"
  ).length;
  const maintenanceCount = vehicles.filter(
    (v) => v.status === "MAINTENANCE"
  ).length;
  const inactiveCount = vehicles.filter(
    (v) => v.status === "INACTIVE"
  ).length;

  const summary = [
    {
      label: lang === "ar" ? "إجمالي المركبات" : "Total vehicles",
      value: vehicles.length,
      icon: Car,
      color: "bg-rope/10 text-rope",
    },
    {
      label: lang === "ar" ? "على الطريق" : "On road",
      value: onRoadCount,
      icon: Navigation,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      label: lang === "ar" ? "في الصيانة" : "Maintenance",
      value: maintenanceCount,
      icon: Wrench,
      color: "bg-warning/10 text-warning",
    },
    {
      label: lang === "ar" ? "غير نشطة" : "Inactive",
      value: inactiveCount,
      icon: Ban,
      color: "bg-gray-400/10 text-gray-500",
    },
  ];

  const renderTripInfo = (trip: Trip) => {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-ink/70">
          <span className="font-medium text-ink">{trip.departureBranch.name}</span>
          {lang === "ar" ? (
            <ArrowLeft size={12} className="text-ink/30" />
          ) : (
            <ArrowRight size={12} className="text-ink/30" />
          )}
          <span className="font-medium text-ink">{trip.arrivalBranch.name}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/50">
          <span className="flex items-center gap-1">
            <User size={11} /> {trip.driver.name}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} /> {passengers(trip)} / {trip.cargo.length}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} /> {timeSince(trip.departureTime)}
          </span>
        </div>
      </div>
    );
  };

  const renderVehicleRow = (vehicle: Vehicle) => {
    const Icon = VEHICLE_ICONS[vehicle.type] || Car;
    const state = vehicleActiveState(vehicle.id);

    if (state === "IN_BRANCH") {
      const meta = {
        text: "text-gray-500",
        dot: "bg-gray-300",
        badge: "bg-gray-100 text-gray-500",
        border: "border-gray-200",
      };
      return (
        <div
          key={vehicle.id}
          className={`bg-foam rounded-2xl border ${meta.border} p-4 flex items-center gap-4`}
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink text-sm truncate" dir="ltr">
                {vehicle.plateNumber}
              </h3>
              <span className="text-[10px] text-ink/40">{vehicle.type}</span>
            </div>
            <p className="text-xs text-ink/50 mt-0.5">
              {lang === "ar" ? "في الفرع" : "In branch"} · {vehicle.branch?.name}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${meta.badge}`}
          >
            {lang === "ar" ? "في الفرع" : "In branch"}
          </span>
        </div>
      );
    }

    const meta = STATUS_META[state] || STATUS_META.DEPARTED;
    const trip = currentTrip(vehicle.id);

    return (
      <div
        key={vehicle.id}
        className={`bg-foam rounded-2xl border ${meta.border} p-4 flex items-center gap-4`}
      >
        <div className="w-10 h-10 rounded-xl bg-rope/10 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-rope" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink text-sm truncate" dir="ltr">
              {vehicle.plateNumber}
            </h3>
            <span className="text-[10px] text-ink/40">{vehicle.type}</span>
          </div>
          <div className="mt-1">{trip ? renderTripInfo(trip) : null}</div>
        </div>
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${meta.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {t(
            (lang === "ar"
              ? state === "ARRIVED"
                ? "arrived"
                : state === "IN_TRANSIT"
                ? "inTransit"
                : "departed"
              : state === "ARRIVED"
              ? "arrived"
              : state === "IN_TRANSIT"
              ? "inTransit"
              : "departed") as never
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">
            {lang === "ar" ? "أين أسطولك الآن؟" : "Where is my fleet now?"}
          </h1>
          <p className="text-xs text-ink/40 mt-0.5 flex items-center gap-1">
            <Radio size={12} className="text-rope" />
            {lang === "ar" ? "برج المراقبة" : "Monitoring tower"} ·{" "}
            {fmtTime(lastRefresh)}
          </p>
        </div>
        <button
          onClick={fetchFleet}
          className="p-2.5 bg-foam border border-sand-dim rounded-xl text-rope hover:border-rope/30 transition-colors"
          title={t("loading")}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2">
          {summary.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="bg-foam border border-sand-dim rounded-2xl p-3"
              >
                <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                  <Icon size={16} />
                </div>
                <p className="text-lg font-bold text-ink leading-none">{s.value}</p>
                <p className="text-[10px] text-ink/50 mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">
            {error}
          </div>
        )}

        {loading && vehicles.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
        ) : isDesktop ? (
          <div className="bg-foam border border-sand-dim rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dim">
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">
                    {t("vehicles")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">
                    {t("status")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">
                    {t("from")}/{t("to")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">
                    {t("driver")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">
                    {lang === "ar" ? "الركاب" : "Passengers"}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">
                    {lang === "ar" ? "منذ الانطلاق" : "Since departure"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => {
                  const Icon = VEHICLE_ICONS[vehicle.type] || Car;
                  const state = vehicleActiveState(vehicle.id);
                  const trip = currentTrip(vehicle.id);
                  const isActive = state !== "IN_BRANCH";
                  const meta = isActive
                    ? STATUS_META[state] || STATUS_META.DEPARTED
                    : {
                        text: "text-gray-500",
                        dot: "bg-gray-300",
                        badge: "bg-gray-100 text-gray-500",
                        border: "border-gray-200",
                      };
                  return (
                    <tr
                      key={vehicle.id}
                      className="border-b border-sand-dim last:border-0 hover:bg-sand/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rope/10 flex items-center justify-center shrink-0">
                            <Icon size={16} className="text-rope" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-ink" dir="ltr">
                              {vehicle.plateNumber}
                            </p>
                            <p className="text-[10px] text-ink/40">{vehicle.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${meta.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {isActive
                            ? t(
                                (state === "ARRIVED"
                                  ? "arrived"
                                  : state === "IN_TRANSIT"
                                  ? "inTransit"
                                  : "departed") as never
                              )
                            : lang === "ar"
                            ? "في الفرع"
                            : "In branch"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink">
                        {trip
                          ? `${trip.departureBranch.name} ${routeArrow(lang)} ${trip.arrivalBranch.name}`
                          : vehicle.branch?.name}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink">
                        {trip ? trip.driver.name : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink">
                        {trip
                          ? `${passengers(trip)} / ${vehicle.seatCount}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink/60">
                        {trip ? timeSince(trip.departureTime) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">{vehicles.map(renderVehicleRow)}</div>
        )}
      </div>
    </div>
  );
}
