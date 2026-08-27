"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Car, Bus, Truck, ChevronRight, X, Calendar,
  MapPin, Clock, CircleDollarSign, Filter,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

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
  createdAt: string;
}

interface Trip {
  id: string;
  status: string;
  departureTime: string;
  arrivalTime: string | null;
  price: number;
  departureBranch: Branch;
  arrivalBranch: Branch;
  driver: { id: string; name: string; phone: string };
}

interface VehicleDetail extends Vehicle {
  trips: Trip[];
}

type StatusFilter = "ALL" | "ACTIVE" | "MAINTENANCE" | "INACTIVE";

const VEHICLE_ICONS: Record<string, typeof Car> = {
  BUS: Bus,
  MINIBUS: Car,
  TRUCK: Truck,
};

export default function VehiclesPage() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDetail | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "BUS",
    plateNumber: "",
    seatCount: "",
    branchId: "",
  });

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchBranches();
  }, [fetchVehicles, fetchBranches]);

  const filtered = vehicles.filter(
    (v) => statusFilter === "ALL" || v.status === statusFilter
  );

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE": return "bg-green-100 text-green-700";
      case "MAINTENANCE": return "bg-yellow-100 text-yellow-700";
      case "INACTIVE": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "ACTIVE": return t("active");
      case "MAINTENANCE": return t("maintenance");
      case "INACTIVE": return t("inactive");
      default: return s;
    }
  };

  const tripStatusColor = (s: string) => {
    switch (s) {
      case "SCHEDULED": return "bg-yellow-100 text-yellow-700";
      case "OPEN": return "bg-blue-100 text-blue-700";
      case "FULL": return "bg-purple-100 text-purple-700";
      case "DEPARTED": return "bg-indigo-100 text-indigo-700";
      case "IN_TRANSIT": return "bg-cyan-100 text-cyan-700";
      case "ARRIVED": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const handleSubmit = async () => {
    if (!form.plateNumber.trim() || !form.seatCount || !form.branchId) {
      setError(t("required"));
      return;
    }

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({ type: "BUS", plateNumber: "", seatCount: "", branchId: "" });
        fetchVehicles();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleVehicleClick = async (vehicle: Vehicle) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedVehicle(data.vehicle);
      }
    } catch {}
  };

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: t("filter") },
    { key: "ACTIVE", label: t("active") },
    { key: "MAINTENANCE", label: t("maintenance") },
    { key: "INACTIVE", label: t("inactive") },
  ];

  if (selectedVehicle) {
    const totalTrips = selectedVehicle.trips.filter((tr) => tr.status === "ARRIVED").length;
    return (
      <div className="min-h-screen bg-sand pb-24 md:pb-8">
        <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim px-4 py-4">
          <button
            onClick={() => setSelectedVehicle(null)}
            className="flex items-center gap-2 text-sm text-rope mb-2"
          >
            {t("back")}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rope/10 flex items-center justify-center">
              {(() => {
                const Icon = VEHICLE_ICONS[selectedVehicle.type] || Car;
                return <Icon size={24} className="text-rope" />;
              })()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink">{selectedVehicle.plateNumber}</h1>
              <p className="text-xs text-ink/50">
                {selectedVehicle.type} &bull; {selectedVehicle.seatCount} {t("seat")}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="bg-foam border border-sand-dim rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink/50">{t("totalTrips")}</p>
                <p className="text-xl font-bold text-ink">{totalTrips}</p>
              </div>
              <div>
                <p className="text-xs text-ink/50">{t("status")}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${statusColor(selectedVehicle.status)}`}>
                  {statusLabel(selectedVehicle.status)}
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-ink mb-3">{t("vehicleLife")}</h2>

          {selectedVehicle.trips.length === 0 ? (
            <div className="text-center py-8 text-ink/40 text-sm">{t("noResults")}</div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-sand-dim" />
              <div className="space-y-3">
                {selectedVehicle.trips.map((trip) => (
                  <div key={trip.id} className="relative flex gap-3">
                    <div className="relative z-10 w-10 h-10 rounded-full bg-rope/10 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-rope" />
                    </div>
                    <div className="flex-1 bg-foam border border-sand-dim rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink">
                          {trip.departureBranch.name} → {trip.arrivalBranch.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tripStatusColor(trip.status)}`}>
                          {trip.status}
                        </span>
                      </div>
                      <p className="text-xs text-ink/50">
                        {new Date(trip.departureTime).toLocaleDateString()} &bull; {trip.driver.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">{t("vehicles")}</h1>
          <button
            onClick={() => {
              setShowForm(true);
              setError("");
              if (branches.length > 0) {
                setForm((f) => ({ ...f, branchId: branches[0].id }));
              }
            }}
            className="flex items-center gap-2 bg-rope text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Plus size={16} />
            {t("add")}
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
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((vehicle) => {
              const Icon = VEHICLE_ICONS[vehicle.type] || Car;
              return (
                <button
                  key={vehicle.id}
                  onClick={() => handleVehicleClick(vehicle)}
                  className="bg-foam border border-sand-dim rounded-2xl p-4 text-left hover:border-rope/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rope/10 flex items-center justify-center">
                        <Icon size={20} className="text-rope" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink text-sm" dir="ltr">{vehicle.plateNumber}</h3>
                        <p className="text-xs text-ink/50">{vehicle.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(vehicle.status)}`}>
                      {statusLabel(vehicle.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink/50">
                    <span>
                      {vehicle.seatCount} {t("seat")}
                    </span>
                    <span>{vehicle.branch.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-foam rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink">{t("add")} {t("vehicles")}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("type")}</label>
                <div className="flex gap-2">
                  {["BUS", "MINIBUS", "TRUCK"].map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setForm({ ...form, type: tp })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        form.type === tp
                          ? "bg-rope text-white border-rope"
                          : "bg-sand border-sand-dim text-ink/60"
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("plateNumber")}</label>
                <input
                  type="text"
                  value={form.plateNumber}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  dir="ltr"
                  placeholder="AA-123-BB"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("seatCount")}</label>
                <input
                  type="number"
                  value={form.seatCount}
                  onChange={(e) => setForm({ ...form, seatCount: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("branches")}</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                >
                  <option value="">{t("filter")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
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
