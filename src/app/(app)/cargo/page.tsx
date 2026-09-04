"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Search,
  Plus,
  X,
  Loader2,
  Check,
  Truck,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Box,
  FileText,
  ShoppingBag,
  HelpCircle,
  Phone,
  User,
  Weight,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Ban,
  Route,
  Wallet2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { fmtDateTime, routeArrow } from "@/lib/datetime";

interface Branch {
  id: string;
  name: string;
  city: string;
}

interface CargoItem {
  id: string;
  trackingCode: string;
  description: string;
  weight: number;
  packageType: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  senderBranchId: string;
  receiverBranchId: string;
  senderBranch: Branch;
  receiverBranch: Branch;
  amount: number;
  paymentMethod: string;
  paymentMethodConfig?: {
    id: string;
    name: string;
    nameAr: string;
    logo: string | null;
    isCredit: boolean;
  } | null;
  status: string;
  createdAt: string;
  deliveredAt?: string;
  tripId?: string | null;
  trip?: {
    id: string;
    status: string;
    departureTime: string;
    vehicle: { plateNumber: string };
    departureBranch: Branch;
    arrivalBranch: Branch;
  } | null;
}

interface Trip {
  id: string;
  status: string;
  departureTime: string;
  vehicle: { plateNumber: string };
  departureBranch: Branch;
  arrivalBranch: Branch;
}

interface PaymentMethodConfig {
  id: string;
  name: string;
  nameAr: string;
  logo: string | null;
  isCredit: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  IN_TRANSIT: "bg-sea/10 text-sea",
  ARRIVED: "bg-rope/10 text-rope",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
};

const PACKAGE_ICONS: Record<string, React.ElementType> = {
  bag: ShoppingBag,
  box: Box,
  document: FileText,
  other: HelpCircle,
};

const STATUS_FLOW = ["PENDING", "IN_TRANSIT", "ARRIVED", "DELIVERED"];

export default function CargoPage() {
  const { t, lang } = useLanguage();

  const [cargo, setCargo] = useState<CargoItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackResult, setTrackResult] = useState<CargoItem | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [assigningCargo, setAssigningCargo] = useState<string | null>(null);
  const [cancellingCargo, setCancellingCargo] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");

  const [form, setForm] = useState({
    packageType: "box",
    description: "",
    weight: "",
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",
    senderBranchId: "",
    receiverBranchId: "",
    amount: "",
    paymentMethod: "CASH",
  });

  const fetchCargo = useCallback(async () => {
    setLoading(true);
    try {
      const [cargoRes, branchRes, tripRes, pmRes] = await Promise.all([
        fetch("/api/cargo"),
        fetch("/api/branches"),
        fetch("/api/trips"),
        fetch("/api/payment-methods"),
      ]);
      if (cargoRes.ok) {
        const data = await cargoRes.json();
        setCargo(data.cargo || []);
      }
      if (branchRes.ok) {
        const data = await branchRes.json();
        setBranches(data.branches || []);
      }
      if (tripRes.ok) {
        const data = await tripRes.json();
        setTrips(
          (data.trips || []).filter(
            (tr: Trip) => tr.status !== "CANCELLED" && tr.status !== "ARRIVED"
          )
        );
      }
      if (pmRes.ok) {
        const data = await pmRes.json();
        const methods = (data.methods || []) as PaymentMethodConfig[];
        setPaymentMethods(methods);
        if (methods.length > 0 && !selectedMethod) {
          setSelectedMethod(methods[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch cargo error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMethod]);

  useEffect(() => {
    fetchCargo();
  }, [fetchCargo]);

  const resetForm = () => {
    setForm({
      packageType: "box",
      description: "",
      weight: "",
      senderName: "",
      senderPhone: "",
      receiverName: "",
      receiverPhone: "",
      senderBranchId: "",
      receiverBranchId: "",
      amount: "",
      paymentMethod: "CASH",
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !form.description ||
      !form.weight ||
      !form.senderName ||
      !form.senderPhone ||
      !form.receiverName ||
      !form.receiverPhone ||
      !form.senderBranchId ||
      !form.receiverBranchId ||
      !form.amount
    ) {
      setError(t("required"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/cargo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          weight: form.weight,
          packageType: form.packageType,
          senderName: form.senderName,
          senderPhone: form.senderPhone,
          receiverName: form.receiverName,
          receiverPhone: form.receiverPhone,
          senderBranchId: form.senderBranchId,
          receiverBranchId: form.receiverBranchId,
          amount: form.amount,
          paymentMethod: "CASH",
          paymentMethodConfigId: selectedMethod || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("error"));
        return;
      }

      setShowForm(false);
      resetForm();
      fetchCargo();
    } catch {
      setError(lang === "ar" ? "خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackingCode.trim()) return;
    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);
    try {
      const res = await fetch(`/api/cargo/track/${trackingCode.trim()}`);
      if (!res.ok) {
        setTrackError(lang === "ar" ? "شحنة غير موجودة" : "Colis introuvable");
        return;
      }
      const data = await res.json();
      setTrackResult(data.cargo);
    } catch {
      setTrackError(lang === "ar" ? "خطأ في البحث" : "Erreur de recherche");
    } finally {
      setTrackLoading(false);
    }
  };

  const handleMarkDelivered = async (id: string) => {
    try {
      const res = await fetch(`/api/cargo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      if (res.ok) {
        fetchCargo();
      }
    } catch (err) {
      console.error("Mark delivered error:", err);
    }
  };

  const handleAdvanceStatus = async (id: string, nextStatus: string, tripId?: string) => {
    try {
      const body: Record<string, string> = { status: nextStatus };
      if (tripId) body.tripId = tripId;
      const res = await fetch(`/api/cargo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setAssigningCargo(null);
        fetchCargo();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleCancelCargo = async (id: string) => {
    try {
      const res = await fetch(`/api/cargo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        setCancellingCargo(null);
        fetchCargo();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const filteredCargo =
    filter === "ALL"
      ? cargo
      : cargo.filter((c) => c.status === filter);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t("cargoPending"),
      IN_TRANSIT: t("cargoInTransit"),
      ARRIVED: t("cargoArrived"),
      DELIVERED: t("cargoDelivered"),
      CANCELLED: t("cargoCancelled"),
    };
    return map[status] || status;
  };

  const nextStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t("handToDriver"),
      IN_TRANSIT: t("markArrived"),
      ARRIVED: t("markDelivered2"),
    };
    return map[status] || "";
  };

  const nextStatus = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "IN_TRANSIT",
      IN_TRANSIT: "ARRIVED",
      ARRIVED: "DELIVERED",
    };
    return map[status] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink font-[family-name:var(--font-display)]">
          {t("cargo")}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowTrack(!showTrack);
              setShowForm(false);
            }}
            className="h-9 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-xs font-medium flex items-center gap-1.5 hover:bg-sand-dim transition-colors"
          >
            <Search size={14} />
            {t("search")}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowTrack(false);
              resetForm();
            }}
            className="h-9 px-3 rounded-xl bg-rope text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-rope-dark transition-colors"
          >
            <Plus size={14} />
            {t("newCargo")}
          </button>
        </div>
      </div>

      {/* Tracking Panel */}
      {showTrack && (
        <div className="bg-foam rounded-2xl border border-sand-dim p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">
              {t("trackingCode")}
            </h2>
            <button onClick={() => { setShowTrack(false); setTrackResult(null); setTrackingCode(""); }}>
              <X size={16} className="text-ink-faint" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50 font-mono"
              placeholder="TRK-XXXXXXXX-XXXX"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={handleTrack}
              disabled={trackLoading}
              className="h-10 px-4 rounded-xl bg-sea text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {trackLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </button>
          </div>

          {trackError && (
            <p className="mt-2 text-xs text-danger text-center">{trackError}</p>
          )}

          {trackResult && (
            <div className="mt-3 bg-sand rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-faint font-mono">{trackResult.trackingCode}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    STATUS_COLORS[trackResult.status] || "bg-sand-dim text-ink-faint"
                  }`}
                >
                  {statusLabel(trackResult.status)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink">
                <MapPin size={12} className="text-rope" />
                <span>{trackResult.senderBranch.name}</span>
                {lang === "ar" ? <ArrowLeft size={10} /> : <ArrowRight size={10} />}
                <span>{trackResult.receiverBranch.name}</span>
              </div>
              <p className="text-xs text-ink-faint">{trackResult.description}</p>

              {STATUS_FLOW.indexOf(trackResult.status) < 3 && (
                <div className="flex items-center gap-1 pt-1">
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s} className="flex items-center gap-1 flex-1">
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          i <= STATUS_FLOW.indexOf(trackResult.status)
                            ? "bg-rope"
                            : "bg-sand-dim"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Cargo Form */}
      {showForm && (
        <div className="bg-foam rounded-2xl border border-sand-dim p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">{t("newCargo")}</h2>
            <button onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={16} className="text-ink-faint" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Package Type */}
            <div>
              <label className="block text-xs font-medium text-ink mb-2">
                {t("packageType")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["bag", "box", "document", "other"] as const).map((type) => {
                  const Icon = PACKAGE_ICONS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, packageType: type })}
                      className={`h-16 rounded-xl border-2 text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                        form.packageType === type
                          ? "border-rope bg-rope/10 text-rope"
                          : "border-sand-dim bg-foam text-ink-faint"
                      }`}
                    >
                      <Icon size={18} />
                      {t(type)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description + Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-ink mb-1">
                  {lang === "ar" ? "الوصف" : "Description"} *
                </label>
                <input
                  type="text"
                  className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50"
                  placeholder={lang === "ar" ? "وصف الطرد" : "Description du colis"}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  {t("weight")} ({t("kg")}) *
                </label>
                <div className="relative">
                  <Weight size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint" />
                  <input
                    type="number"
                    step="0.1"
                    className="w-full h-10 px-8 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50"
                    placeholder="0"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  {t("amount")} ({t("mr")}) *
                </label>
                <div className="relative">
                  <DollarSign size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint" />
                  <input
                    type="number"
                    className="w-full h-10 px-8 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Sender */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-ink">
                {t("sender")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint" />
                  <input
                    type="text"
                    className="w-full h-10 px-8 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50"
                    placeholder={t("name")}
                    value={form.senderName}
                    onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Phone size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    className="w-full h-10 px-8 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50 text-center"
                    placeholder="43XXXXXX"
                    value={form.senderPhone}
                    onChange={(e) =>
                      setForm({ ...form, senderPhone: e.target.value.replace(/\D/g, "").slice(0, 8) })
                    }
                  />
                </div>
              </div>
              <select
                className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm appearance-none"
                value={form.senderBranchId}
                onChange={(e) => setForm({ ...form, senderBranchId: e.target.value })}
              >
                <option value="">{t("senderBranch")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} - {b.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Receiver */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-ink">
                {t("receiver")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint" />
                  <input
                    type="text"
                    className="w-full h-10 px-8 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50"
                    placeholder={t("name")}
                    value={form.receiverName}
                    onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Phone size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-ink-faint" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    className="w-full h-10 px-8 rounded-xl bg-sand border border-sand-dim text-ink text-sm placeholder:text-ink-faint/50 text-center"
                    placeholder="43XXXXXX"
                    value={form.receiverPhone}
                    onChange={(e) =>
                      setForm({ ...form, receiverPhone: e.target.value.replace(/\D/g, "").slice(0, 8) })
                    }
                  />
                </div>
              </div>
              <select
                className="w-full h-10 px-3 rounded-xl bg-sand border border-sand-dim text-ink text-sm appearance-none"
                value={form.receiverBranchId}
                onChange={(e) => setForm({ ...form, receiverBranchId: e.target.value })}
              >
                <option value="">{t("receiverBranch")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} - {b.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment */}
            <div>
              <label className="block text-xs font-medium text-ink mb-2">
                {t("paymentMethod")}
              </label>
              <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 lg:grid lg:grid-cols-3 lg:gap-3 scrollbar-thin">
                {paymentMethods.length === 0 ? (
                  <div className="flex gap-3">
                    {([
                      { id: "CASH", name: "Cash", nameAr: "نقدي", logo: null, isCredit: false },
                      { id: "AJL", name: "Ajl", nameAr: "أجل", logo: null, isCredit: true },
                      { id: "WALLET", name: "Portefeuille", nameAr: "محفظة", logo: null, isCredit: false },
                    ] as PaymentMethodConfig[]).map((m) => (
                      <CargoPaymentButton key={m.id} method={m} lang={lang} selected={selectedMethod === m.id} onSelect={() => setSelectedMethod(m.id)} />
                    ))}
                  </div>
                ) : (
                  paymentMethods.map((m) => (
                    <CargoPaymentButton key={m.id} method={m} lang={lang} selected={selectedMethod === m.id} onSelect={() => setSelectedMethod(m.id)} />
                  ))
                )}
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-2.5 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-rope text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rope-dark disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  {t("confirm")}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {["ALL", ...STATUS_FLOW].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? "bg-rope text-white"
                : "bg-sand text-ink-faint hover:bg-sand-dim"
            }`}
          >
            {s === "ALL" ? (lang === "ar" ? "الكل" : "Tout") : statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Cargo List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-rope" />
        </div>
      ) : filteredCargo.length === 0 ? (
        <div className="bg-foam rounded-2xl border border-sand-dim p-12 text-center">
          <Package size={32} className="mx-auto text-ink-faint/30 mb-3" />
          <p className="text-sm text-ink-faint">{t("noResults")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCargo.map((item) => {
            const Icon = PACKAGE_ICONS[item.packageType] || Package;
            const currentIdx = STATUS_FLOW.indexOf(item.status);
            const isOpen = expanded === item.id;
            const isAssigning = assigningCargo === item.id;
            const isCancelling = cancellingCargo === item.id;

            return (
              <div
                key={item.id}
                className="bg-foam rounded-xl border border-sand-dim overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="w-full p-4 text-start"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sand flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-ink-faint" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink truncate">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              STATUS_COLORS[item.status] || ""
                            }`}
                          >
                            {statusLabel(item.status)}
                          </span>
                          {isOpen ? (
                            <ChevronUp size={14} className="text-ink/40" />
                          ) : (
                            <ChevronDown size={14} className="text-ink/40" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-ink-faint">
                        <MapPin size={10} />
                        <span>{item.senderBranch.name}</span>
                        {lang === "ar" ? <ArrowLeft size={8} /> : <ArrowRight size={8} />}
                        <span>{item.receiverBranch.name}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-ink-faint font-mono">
                          {item.trackingCode}
                        </p>
                        <p className="text-xs font-semibold text-rope">
                          {item.amount.toLocaleString()} {t("mr")}
                        </p>
                      </div>

                      {/* Status Flow Bar */}
                      <div className="flex items-center gap-0.5 mt-2">
                        {STATUS_FLOW.map((s, i) => (
                          <div
                            key={s}
                            className={`h-1 flex-1 rounded-full ${
                              i <= currentIdx ? "bg-rope" : "bg-sand-dim"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="border-t border-sand-dim px-4 py-3 space-y-3">
                    {/* Sender Info */}
                    <div className="bg-sand rounded-xl p-3 space-y-1.5">
                      <p className="text-[10px] text-ink/40 font-semibold">{t("sender")}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink">{item.senderName}</span>
                        <span className="text-xs text-ink/60 flex items-center gap-1" dir="ltr">
                          <Phone size={10} />
                          {item.senderPhone}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink/40">{item.senderBranch.name}</p>
                    </div>

                    {/* Receiver Info */}
                    <div className="bg-sand rounded-xl p-3 space-y-1.5">
                      <p className="text-[10px] text-ink/40 font-semibold">{t("receiver")}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink">{item.receiverName}</span>
                        <span className="text-xs text-ink/60 flex items-center gap-1" dir="ltr">
                          <Phone size={10} />
                          {item.receiverPhone}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink/40">{item.receiverBranch.name}</p>
                    </div>

                    {/* Cargo Details */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-sand rounded-xl p-2 text-center">
                        <p className="text-[10px] text-ink/40">{t("weight")}</p>
                        <p className="text-sm font-semibold text-ink">{item.weight} {t("kg")}</p>
                      </div>
                      <div className="bg-sand rounded-xl p-2 text-center">
                        <p className="text-[10px] text-ink/40">{t("packageType")}</p>
                        <p className="text-sm font-semibold text-ink">{item.packageType}</p>
                      </div>
                      <div className="bg-sand rounded-xl p-2 text-center">
                        <p className="text-[10px] text-ink/40">{t("paymentMethod")}</p>
                        <div className="flex items-center justify-center gap-1.5">
                          {item.paymentMethodConfig?.logo ? (
                            <img src={item.paymentMethodConfig.logo} alt="" className="w-4 h-4 rounded" />
                          ) : (
                            <Wallet2 size={12} className="text-ink-faint" />
                          )}
                          <p className="text-xs font-semibold text-ink">
                            {lang === "ar" ? item.paymentMethodConfig?.nameAr || item.paymentMethod : item.paymentMethodConfig?.name || item.paymentMethod}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Trip Info */}
                    {item.trip && (
                      <div className="bg-rope/5 rounded-xl p-3 space-y-1">
                        <p className="text-[10px] text-ink/40 font-semibold">{t("trip")}</p>
                        <p className="text-sm text-ink">
                          {item.trip.departureBranch.name} {routeArrow(lang)} {item.trip.arrivalBranch.name}
                        </p>
                        <p className="text-[10px] text-ink/40" dir="ltr">
                          {item.trip.vehicle.plateNumber}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {item.status !== "DELIVERED" && item.status !== "CANCELLED" && (
                        <>
                          {item.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => setAssigningCargo(item.id)}
                                className="flex-1 h-10 rounded-xl bg-rope text-white text-xs font-medium flex items-center justify-center gap-1.5"
                              >
                                <Truck size={14} />
                                {t("handToDriver")}
                              </button>
                              <button
                                onClick={() => setCancellingCargo(item.id)}
                                className="h-10 px-3 rounded-xl bg-danger/10 text-danger text-xs font-medium flex items-center justify-center gap-1"
                              >
                                <Ban size={14} />
                              </button>
                            </>
                          )}
                          {item.status === "IN_TRANSIT" && (
                            <button
                              onClick={() => handleAdvanceStatus(item.id, "ARRIVED")}
                              className="flex-1 h-10 rounded-xl bg-rope text-white text-xs font-medium flex items-center justify-center gap-1.5"
                            >
                              <MapPin size={14} />
                              {t("markArrived")}
                            </button>
                          )}
                          {item.status === "ARRIVED" && (
                            <button
                              onClick={() => handleAdvanceStatus(item.id, "DELIVERED")}
                              className="flex-1 h-10 rounded-xl bg-success text-white text-xs font-medium flex items-center justify-center gap-1.5"
                            >
                              <Check size={14} />
                              {t("markDelivered2")}
                            </button>
                          )}
                        </>
                      )}
                      {item.status === "CANCELLED" && (
                        <span className="text-xs text-danger font-medium">
                          {t("cargoCancelled")}
                        </span>
                      )}
                      {item.status === "DELIVERED" && (
                        <span className="text-xs text-success font-medium flex items-center gap-1">
                          <Check size={14} />
                          {t("cargoDelivered")}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Action: IN_TRANSIT without expanded */}
                {!isOpen && item.status === "PENDING" && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssigningCargo(item.id);
                      }}
                      className="w-full h-8 rounded-lg bg-rope/10 text-rope text-[11px] font-medium flex items-center justify-center gap-1"
                    >
                      <Truck size={12} />
                      {t("handToDriver")}
                    </button>
                  </div>
                )}
                {!isOpen && item.status === "IN_TRANSIT" && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdvanceStatus(item.id, "ARRIVED");
                      }}
                      className="w-full h-8 rounded-lg bg-rope/10 text-rope text-[11px] font-medium flex items-center justify-center gap-1"
                    >
                      <MapPin size={12} />
                      {t("markArrived")}
                    </button>
                  </div>
                )}
                {!isOpen && item.status === "ARRIVED" && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdvanceStatus(item.id, "DELIVERED");
                      }}
                      className="w-full h-8 rounded-lg bg-success/10 text-success text-[11px] font-medium flex items-center justify-center gap-1"
                    >
                      <Check size={12} />
                      {t("markDelivered2")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Trip Sheet */}
      {assigningCargo && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAssigningCargo(null)}
          />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">{t("assignTrip")}</h2>
              <button
                onClick={() => setAssigningCargo(null)}
                className="p-2 hover:bg-sand rounded-xl"
              >
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {trips.length === 0 ? (
              <p className="text-sm text-ink/40 text-center py-8">{t("noResults")}</p>
            ) : (
              <div className="space-y-2">
                {trips.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => handleAdvanceStatus(assigningCargo, "IN_TRANSIT", tr.id)}
                    className="w-full p-3 bg-sand rounded-xl text-start hover:bg-sand-dim transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {tr.departureBranch.name} {routeArrow(lang)} {tr.arrivalBranch.name}
                        </p>
                        <p className="text-[10px] text-ink/40 mt-0.5" dir="ltr">
                          {tr.vehicle.plateNumber} · {fmtDateTime(tr.departureTime)}
                        </p>
                      </div>
                      <Truck size={16} className="text-rope" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {cancellingCargo && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCancellingCargo(null)}
          />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">{t("cancelCargo")}</h2>
              <button
                onClick={() => setCancellingCargo(null)}
                className="p-2 hover:bg-sand rounded-xl"
              >
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            <p className="text-sm text-ink/60 mb-4">
              {lang === "ar"
                ? "هل أنت متأكد من إلغاء هذه الشحنة؟"
                : "Êtes-vous sûr de vouloir annuler ce colis ?"}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setCancellingCargo(null)}
                className="flex-1 h-12 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleCancelCargo(cancellingCargo)}
                className="flex-1 h-12 bg-danger text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                <Ban size={16} />
                {t("cancelCargo")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CargoMethodLogo({ method, size = 28 }: { method?: PaymentMethodConfig | null; size?: number }) {
  if (method?.logo) {
    return (
      <img src={method.logo} alt="" style={{ width: size, height: size }} className="rounded-lg object-cover shrink-0" />
    );
  }
  return (
    <span style={{ width: size, height: size }} className="rounded-lg bg-sand-dim flex items-center justify-center shrink-0">
      <Wallet2 size={size * 0.55} className="text-ink-faint" />
    </span>
  );
}

function CargoPaymentButton({
  method,
  lang,
  selected,
  onSelect,
}: {
  method: PaymentMethodConfig;
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
      <CargoMethodLogo method={method} size={40} />
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
