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
  Box,
  FileText,
  ShoppingBag,
  HelpCircle,
  Phone,
  User,
  Weight,
  DollarSign,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

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
  status: string;
  createdAt: string;
  deliveredAt?: string;
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
      const [cargoRes, branchRes] = await Promise.all([
        fetch("/api/cargo"),
        fetch("/api/branches"),
      ]);
      if (cargoRes.ok) {
        const data = await cargoRes.json();
        setCargo(data.cargo || []);
      }
      if (branchRes.ok) {
        const data = await branchRes.json();
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.error("Fetch cargo error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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
          paymentMethod: form.paymentMethod,
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

  const filteredCargo =
    filter === "ALL"
      ? cargo
      : cargo.filter((c) => c.status === filter);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t("boarding"),
      IN_TRANSIT: t("dispatched"),
      ARRIVED: t("arrived"),
      DELIVERED: t("delivered"),
      CANCELLED: t("cancelled"),
    };
    return map[status] || status;
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
                <ArrowRight size={10} />
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
              <div className="grid grid-cols-3 gap-2">
                {(["CASH", "DEBT", "WALLET"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: method })}
                    className={`h-10 rounded-xl border-2 text-xs font-medium transition-all ${
                      form.paymentMethod === method
                        ? "border-rope bg-rope/10 text-rope"
                        : "border-sand-dim bg-foam text-ink-faint"
                    }`}
                  >
                    {t(method.toLowerCase() as "cash" | "debt" | "wallet")}
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

            return (
              <div
                key={item.id}
                className="bg-foam rounded-xl border border-sand-dim p-4"
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
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          STATUS_COLORS[item.status] || ""
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-ink-faint">
                      <MapPin size={10} />
                      <span>{item.senderBranch.name}</span>
                      <ArrowRight size={8} />
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

                    {/* Delivered Button */}
                    {item.status === "ARRIVED" && (
                      <button
                        onClick={() => handleMarkDelivered(item.id)}
                        className="mt-3 w-full h-9 rounded-lg bg-success text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Check size={14} />
                        {t("markDelivered")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
