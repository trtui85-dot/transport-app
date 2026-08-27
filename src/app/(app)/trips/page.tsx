"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Route, ArrowRight, Clock, User, Car, X, Copy,
  ArrowUpDown, ChevronDown, ChevronUp,
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
  status: string;
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
  price: number;
  notes: string | null;
  vehicleId: string;
  driverId: string;
  departureBranchId: string;
  arrivalBranchId: string;
  vehicle: Vehicle;
  driver: Driver;
  departureBranch: Branch;
  arrivalBranch: Branch;
  tickets: { id: string; status: string }[];
  cargo: { id: string }[];
}

type StatusFilter = "ALL" | "SCHEDULED" | "OPEN" | "FULL" | "DEPARTED" | "IN_TRANSIT" | "ARRIVED" | "CANCELLED";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  SCHEDULED: { color: "bg-yellow-100 text-yellow-700", label: "scheduled" },
  OPEN: { color: "bg-blue-100 text-blue-700", label: "open" },
  FULL: { color: "bg-purple-100 text-purple-700", label: "full" },
  DEPARTED: { color: "bg-indigo-100 text-indigo-700", label: "departed" },
  IN_TRANSIT: { color: "bg-cyan-100 text-cyan-700", label: "inTransit" },
  ARRIVED: { color: "bg-green-100 text-green-700", label: "arrived" },
  CANCELLED: { color: "bg-red-100 text-red-700", label: "cancelled" },
};

export default function TripsPage() {
  const { t } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sortField, setSortField] = useState<"departureTime" | "price" | "status">("departureTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    vehicleId: "",
    driverId: "",
    departureBranchId: "",
    arrivalBranchId: "",
    departureTime: "",
    price: "",
    notes: "",
  });

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trips");
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

  const fetchDropdowns = useCallback(async () => {
    try {
      const [vRes, bRes, uRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/branches"),
        fetch("/api/users"),
      ]);
      if (vRes.ok) {
        const d = await vRes.json();
        setVehicles(d.vehicles || []);
      }
      if (bRes.ok) {
        const d = await bRes.json();
        setBranches(d.branches || []);
      }
      if (uRes.ok) {
        const d = await uRes.json();
        setDrivers(
          (d.users || [])
            .filter((u: { role: string }) => u.role === "DRIVER")
            .map((u: { id: string; name: string; phone: string }) => ({
              id: u.id,
              name: u.name,
              phone: u.phone,
            }))
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchTrips();
    fetchDropdowns();
  }, [fetchTrips, fetchDropdowns]);

  const filtered = trips
    .filter((tr) => statusFilter === "ALL" || tr.status === statusFilter)
    .sort((a, b) => {
      if (sortField === "departureTime") {
        return sortDir === "asc"
          ? new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
          : new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime();
      }
      if (sortField === "price") {
        return sortDir === "asc" ? a.price - b.price : b.price - a.price;
      }
      const order = ["SCHEDULED", "OPEN", "FULL", "DEPARTED", "IN_TRANSIT", "ARRIVED", "CANCELLED"];
      return sortDir === "asc"
        ? order.indexOf(a.status) - order.indexOf(b.status)
        : order.indexOf(b.status) - order.indexOf(a.status);
    });

  const handleSubmit = async () => {
    if (!form.vehicleId || !form.driverId || !form.departureBranchId || !form.arrivalBranchId || !form.departureTime || !form.price) {
      setError(t("required"));
      return;
    }

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({ vehicleId: "", driverId: "", departureBranchId: "", arrivalBranchId: "", departureTime: "", price: "", notes: "" });
        fetchTrips();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleRepeat = async (trip: Trip) => {
    const nextDay = new Date(trip.departureTime);
    nextDay.setDate(nextDay.getDate() + 1);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: trip.vehicleId,
          driverId: trip.driverId,
          departureBranchId: trip.departureBranchId,
          arrivalBranchId: trip.arrivalBranchId,
          departureTime: nextDay.toISOString(),
          price: trip.price,
        }),
      });
      if (res.ok) fetchTrips();
    } catch {}
  };

  const handleAdvanceStatus = async (trip: Trip) => {
    const flow: Record<string, string> = {
      SCHEDULED: "OPEN",
      OPEN: "FULL",
      FULL: "DEPARTED",
      DEPARTED: "IN_TRANSIT",
      IN_TRANSIT: "ARRIVED",
    };
    const next = flow[trip.status];
    if (!next) return;

    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) fetchTrips();
    } catch {}
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-ink/30" />;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: t("filter") },
    { key: "SCHEDULED", label: t("scheduled") },
    { key: "OPEN", label: t("open") },
    { key: "DEPARTED", label: t("departed") },
    { key: "IN_TRANSIT", label: t("inTransit") },
    { key: "ARRIVED", label: t("arrived") },
    { key: "CANCELLED", label: t("cancelled") },
  ];

  const renderTripCard = (trip: Trip) => {
    const cfg = STATUS_CONFIG[trip.status] || STATUS_CONFIG.SCHEDULED;
    const seatsSold = trip.tickets.filter((tk) => tk.status === "CONFIRMED").length;
    const canAdvance = !["ARRIVED", "CANCELLED"].includes(trip.status);

    return (
      <div key={trip.id} className="bg-foam border border-sand-dim rounded-2xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
              {t(cfg.label as never)}
            </span>
            <span className="text-[10px] text-ink/40">{trip.tickets.length} tickets</span>
          </div>
          <div className="flex gap-1">
            {!["ARRIVED", "CANCELLED"].includes(trip.status) && (
              <button
                onClick={() => handleRepeat(trip)}
                className="p-1.5 hover:bg-sand rounded-lg"
                title={t("repeatTrip")}
              >
                <Copy size={14} className="text-ink/40" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm font-semibold text-ink">{trip.departureBranch.name}</div>
          <ArrowRight size={14} className="text-ink/30" />
          <div className="text-sm font-semibold text-ink">{trip.arrivalBranch.name}</div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-ink/60 mb-3">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{new Date(trip.departureTime).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{trip.driver.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Car size={12} />
            <span dir="ltr">{trip.vehicle.plateNumber}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">{trip.price} {t("mr")}</span>
          {canAdvance && (
            <button
              onClick={() => handleAdvanceStatus(trip)}
              className="px-3 py-1.5 bg-rope/10 text-rope rounded-lg text-xs font-medium"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">{t("trips")}</h1>
          <button
            onClick={() => {
              setShowForm(true);
              setError("");
            }}
            className="flex items-center gap-2 bg-rope text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Plus size={16} />
            {t("newTrip")}
          </button>
        </div>

        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? "bg-rope text-white"
                  : "bg-foam text-ink/50 border border-sand-dim"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
        ) : isDesktop ? (
          <div className="bg-foam border border-sand-dim rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dim">
                  <th className="text-right px-4 py-3">
                    <button onClick={() => toggleSort("status")} className="flex items-center gap-1 text-xs font-medium text-ink/60">
                      {t("status")} <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">{t("from")}/{t("to")}</th>
                  <th className="text-right px-4 py-3">
                    <button onClick={() => toggleSort("departureTime")} className="flex items-center gap-1 text-xs font-medium text-ink/60">
                      {t("departureTime")} <SortIcon field="departureTime" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">{t("driver")}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60">{t("vehicles")}</th>
                  <th className="text-right px-4 py-3">
                    <button onClick={() => toggleSort("price")} className="flex items-center gap-1 text-xs font-medium text-ink/60">
                      {t("price")} <SortIcon field="price" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-ink/60"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trip) => {
                  const cfg = STATUS_CONFIG[trip.status] || STATUS_CONFIG.SCHEDULED;
                  const canAdvance = !["ARRIVED", "CANCELLED"].includes(trip.status);
                  return (
                    <tr key={trip.id} className="border-b border-sand-dim last:border-0 hover:bg-sand/30">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                          {t(cfg.label as never)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink text-xs">
                        {trip.departureBranch.name} → {trip.arrivalBranch.name}
                      </td>
                      <td className="px-4 py-3 text-ink/60 text-xs">
                        {new Date(trip.departureTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-ink text-xs">{trip.driver.name}</td>
                      <td className="px-4 py-3 text-ink text-xs" dir="ltr">{trip.vehicle.plateNumber}</td>
                      <td className="px-4 py-3 font-semibold text-ink text-xs">{trip.price} {t("mr")}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {!["ARRIVED", "CANCELLED"].includes(trip.status) && (
                            <button onClick={() => handleRepeat(trip)} className="p-1.5 hover:bg-sand rounded-lg">
                              <Copy size={14} className="text-ink/40" />
                            </button>
                          )}
                          {canAdvance && (
                            <button
                              onClick={() => handleAdvanceStatus(trip)}
                              className="px-2 py-1 bg-rope/10 text-rope rounded text-[10px] font-medium"
                            >
                              Next →
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(renderTripCard)}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink">{t("newTrip")}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("vehicles")}</label>
                <select
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                >
                  <option value="">--</option>
                  {vehicles.filter((v) => v.status === "ACTIVE").map((v) => (
                    <option key={v.id} value={v.id}>{v.plateNumber} ({v.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("driver")}</label>
                <select
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                >
                  <option value="">--</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("from")}</label>
                  <select
                    value={form.departureBranchId}
                    onChange={(e) => setForm({ ...form, departureBranchId: e.target.value })}
                    className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  >
                    <option value="">--</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("to")}</label>
                  <select
                    value={form.arrivalBranchId}
                    onChange={(e) => setForm({ ...form, arrivalBranchId: e.target.value })}
                    className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  >
                    <option value="">--</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("departureTime")}</label>
                <input
                  type="datetime-local"
                  value={form.departureTime}
                  onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("price")}</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-rope text-white rounded-xl text-sm font-medium"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
