"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Car,
  Route,
  Wallet,
  AlertCircle,
  Users,
  BarChart3,
  Settings,
  Navigation,
  Lock,
  Bell,
  Globe,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function MorePage() {
  const { t, lang, setLang } = useLanguage();
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((u) => setUser(u));
  }, []);

  const role = user?.role || "";
  const isOwner = role === "OWNER";
  const isManager = isOwner || role === "BRANCH_MANAGER";
  const isAuthorized = (roles: string[]) => roles.includes(role);

  const items = [
    { href: "/fleet", label: "fleet", icon: Navigation, show: isManager },
    { href: "/closing", label: "closing", icon: Lock, show: isManager },
    { href: "/alerts", label: "alerts", icon: Bell, show: isManager },
    { href: "/branches", label: "branches", icon: Building2, show: isOwner },
    { href: "/vehicles", label: "vehicles", icon: Car, show: isManager },
    { href: "/trips", label: "trips", icon: Route, show: isManager || role === "DRIVER" },
    { href: "/expenses", label: "expenses", icon: Wallet, show: isManager },
    { href: "/debts", label: "debts", icon: AlertCircle, show: isManager },
    { href: "/salaries", label: "salaries", icon: Users, show: isOwner },
    { href: "/reports", label: "reports", icon: BarChart3, show: isManager },
    { href: "/settings", label: "settings", icon: Settings, show: isManager },
  ];

  return (
    <div className="space-y-2 pb-24">
      {items.filter((i) => i.show || isOwner).map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 bg-foam rounded-2xl p-4 border border-sand-dim shadow-sm text-sm font-medium"
          >
            <Icon size={20} className="text-rope" />
            <span>{t(item.label as never)}</span>
          </Link>
        );
      })}
      <button
        onClick={() => setLang(lang === "ar" ? "fr" : "ar")}
        className="flex items-center gap-3 w-full bg-foam rounded-2xl p-4 border border-sand-dim shadow-sm text-sm font-medium"
      >
        <Globe size={20} className="text-rope" />
        <span>{lang === "ar" ? "Français" : "العربية"}</span>
      </button>
    </div>
  );
}