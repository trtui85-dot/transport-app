"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle, Info, AlertOctagon, Users, Wrench,
  Wallet, Package, Route, RefreshCw, ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Severity = "danger" | "warning" | "info";

interface AlertItem {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  href?: string;
  icon: React.ElementType;
  source: string;
}

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
  createdAt: string;
  branch: Branch;
}

interface DriverRef {
  id: string;
  name: string;
}

interface Trip {
  id: string;
  status: string;
  departureTime: string;
  vehicleId: string;
  vehicle: Vehicle;
  driver: DriverRef;
  departureBranch: Branch;
  arrivalBranch: Branch;
  tickets: { id: string; status: string }[];
  cargo: { id: string }[];
}

interface Debt {
  id: string;
  contactName: string;
  amount: number;
  paidAmount: number;
  createdAt: string;
}

interface Exp {
  id: string;
  amount: number;
  date: string;
}

interface UserRow {
  id: string;
  name: string;
  role: string;
  branchId: string | null;
  active: boolean;
}

const SEVERITY_META: Record<
  Severity,
  { badge: string; text: string; bar: string; label: string }
> = {
  danger: {
    badge: "bg-red-100 text-red-700",
    text: "text-red-600",
    bar: "bg-danger",
    label: "danger",
  },
  warning: {
    badge: "bg-yellow-100 text-yellow-700",
    text: "text-yellow-700",
    bar: "bg-warning",
    label: "warning",
  },
  info: {
    badge: "bg-blue-100 text-blue-700",
    text: "text-blue-600",
    bar: "bg-sea",
    label: "info",
  },
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function AlertsPage() {
  const { t, lang } = useLanguage();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const buildAlerts = useCallback(
    async () => {
      try {
        setLoading(true);

        const [tripsRes, debtsRes, branchesRes, vehiclesRes, expensesRes, usersRes] =
          await Promise.all([
            fetch("/api/trips"),
            fetch("/api/debts"),
            fetch("/api/branches"),
            fetch("/api/vehicles"),
            fetch("/api/expenses"),
            fetch("/api/users").catch(() => null),
          ]);

        const trips = tripsRes.ok ? ((await tripsRes.json()).trips as Trip[]) : [];
        const debts = debtsRes.ok ? ((await debtsRes.json()).debts as Debt[]) : [];
        const branches = branchesRes.ok
          ? ((await branchesRes.json()).branches as Branch[])
          : [];
        const vehicles = vehiclesRes.ok
          ? ((await vehiclesRes.json()).vehicles as Vehicle[])
          : [];
        const expenses = expensesRes.ok
          ? ((await expensesRes.json()).expenses as Exp[])
          : [];
        const users = usersRes && usersRes.ok
          ? ((await usersRes.json()).users as UserRow[])
          : [];

        const result: AlertItem[] = [];
        const today = startOfDay(new Date());

        // 1. Trips with <= 2 remaining seats
        trips
          .filter((tp) =>
            ["SCHEDULED", "OPEN", "FULL"].includes(tp.status)
          )
          .forEach((tp) => {
            const sold = tp.tickets.length;
            const remaining = (tp.vehicle?.seatCount ?? 0) - sold;
            if (remaining <= 2) {
              result.push({
                id: `seat-${tp.id}`,
                severity: remaining <= 0 ? "danger" : "warning",
                title:
                  lang === "ar"
                    ? `أوشكت رحلة ${tp.departureBranch.name} → ${tp.arrivalBranch.name} على الامتلاء`
                    : `Trip ${tp.departureBranch.name} → ${tp.arrivalBranch.name} almost full`,
                message:
                  remaining <= 0
                    ? lang === "ar"
                      ? "لا مقاعد متبقية - الرحلة ممتلئة"
                      : "No seats left - trip is full"
                    : lang === "ar"
                    ? `متبقي ${remaining} مقاعد فقط`
                    : `Only ${remaining} seats remaining`,
                href: "/trips",
                icon: Users,
                source: "trips",
              });
            }
          });

        // 2. Debts overdue > 30 days
        debts
          .filter((d) => {
            const ageDays =
              (Date.now() - new Date(d.createdAt).getTime()) / 86400000;
            const remaining = d.amount - d.paidAmount;
            return ageDays > 30 && remaining > 0;
          })
          .forEach((d) => {
            result.push({
              id: `debt-${d.id}`,
              severity: "danger",
              title:
                lang === "ar"
                  ? `دين متأخر: ${d.contactName}`
                  : `Overdue debt: ${d.contactName}`,
              message:
                lang === "ar"
                  ? `أكثر من 30 يومًا • المتبقي ${(d.amount - d.paidAmount).toLocaleString()} ${t("mr")}`
                  : `Over 30 days • remaining ${(d.amount - d.paidAmount).toLocaleString()} ${t("mr")}`,
              href: "/debts",
              icon: Wallet,
              source: "debts",
            });
          });

        // 3. Branches with 0 expenses today
        const todayExpenses = expenses.filter(
          (e) =>
            startOfDay(new Date(e.date)).getTime() === today.getTime()
        );
        branches.forEach((b) => {
          if (todayExpenses.length === 0) {
            result.push({
              id: `exp-${b.id}`,
              severity: "info",
              title:
                lang === "ar"
                  ? `فرع ${b.name} بدون مصاريف اليوم`
                  : `Branch ${b.name} has no expenses today`,
              message:
                lang === "ar"
                  ? "ربما نسي الفرع تسجيل مصاريفه"
                  : "The branch might have forgotten to record expenses",
              href: "/expenses",
              icon: Package,
              source: "expenses",
            });
          }
        });

        // 4. Vehicles in maintenance > 7 days
        vehicles
          .filter(
            (v) =>
              v.status === "MAINTENANCE" &&
              (Date.now() - new Date(v.createdAt).getTime()) / 86400000 > 7
          )
          .forEach((v) => {
            result.push({
              id: `maint-${v.id}`,
              severity: "warning",
              title:
                lang === "ar"
                  ? `مركبة ${v.plateNumber} في الصيانة لفترة طويلة`
                  : `Vehicle ${v.plateNumber} in maintenance too long`,
              message:
                lang === "ar"
                  ? "أكثر من 7 أيام في الصيانة"
                  : "More than 7 days in maintenance",
              href: "/vehicles",
              icon: Wrench,
              source: "maintenance",
            });
          });

        // 5. Drivers with no trips this week
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        users
          .filter((u) => u.role === "DRIVER" && u.active)
          .forEach((u) => {
            const hasTrip = trips.some(
              (tp) =>
                tp.driver.id === u.id &&
                new Date(tp.departureTime).getTime() >= weekStart.getTime()
            );
            if (!hasTrip) {
              result.push({
                id: `driver-${u.id}`,
                severity: "info",
                title:
                  lang === "ar"
                    ? `السائق ${u.name} بدون رحلات هذا الأسبوع`
                    : `Driver ${u.name} has no trips this week`,
                message:
                  lang === "ar"
                    ? "لم تكن له أي رحلة منذ 7 أيام"
                    : "No trip assigned in the last 7 days",
                href: "/trips",
                icon: Route,
                source: "drivers",
              });
            }
          });

        setAlerts(result);
      } catch {
        setError(t("error"));
      } finally {
        setLoading(false);
      }
    },
    [lang, t]
  );

  useEffect(() => {
    buildAlerts();
    const interval = setInterval(buildAlerts, 60000);
    return () => clearInterval(interval);
  }, [buildAlerts]);

  const severityMeta = (s: Severity) => SEVERITY_META[s];

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">
            {lang === "ar" ? "التنبيهات الذكية" : "Smart alerts"}
          </h1>
          <p className="text-xs text-ink/40 mt-0.5">
            {lang === "ar"
              ? "تنبيهات تلقائية حول عملياتك"
              : "Automatic alerts about your operations"}
          </p>
        </div>
        <button
          onClick={buildAlerts}
          className="p-2.5 bg-foam border border-sand-dim rounded-xl text-rope hover:border-rope/30 transition-colors"
          title={t("loading")}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="px-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">
            {error}
          </div>
        )}

        {loading && alerts.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : alerts.length === 0 ? (
          <div className="bg-foam border border-sand-dim rounded-2xl p-10 text-center">
            <AlertTriangle size={40} className="mx-auto text-green-500 mb-3" />
            <p className="text-sm font-medium text-ink">
              {lang === "ar" ? "لا توجد تنبيهات!" : "No alerts!"}
            </p>
            <p className="text-xs text-ink/40 mt-1">
              {lang === "ar"
                ? "كل شيء بحالة جيدة الآن"
                : "Everything looks good right now"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const meta = severityMeta(alert.severity);
              const Icon = alert.icon;
              const SeverityIcon =
                alert.severity === "danger"
                  ? AlertOctagon
                  : alert.severity === "warning"
                  ? AlertTriangle
                  : Info;
              const card = (
                <div
                  className="bg-foam border border-sand-dim rounded-2xl overflow-hidden"
                >
                  <div className={`h-1 ${meta.bar}`} />
                  <div className="p-4 flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${meta.badge} flex items-center justify-center shrink-0`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">
                          {alert.title}
                        </p>
                        <SeverityIcon
                          size={16}
                          className={`${meta.text} shrink-0`}
                        />
                      </div>
                      <p className="text-xs text-ink/50 mt-1">
                        {alert.message}
                      </p>
                    </div>
                    {alert.href && (
                      <ChevronRight size={16} className="text-ink/30 shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              );
              return alert.href ? (
                <Link key={alert.id} href={alert.href} className="block">
                  {card}
                </Link>
              ) : (
                <div key={alert.id}>{card}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
