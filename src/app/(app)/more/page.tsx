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
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null));
  }, []);

  const role = user?.role || "";
  const isOwner = role === "OWNER";
  const isManager = isOwner || role === "BRANCH_MANAGER";

  const items = [
    { href: "/fleet", label: "fleet", icon: Navigation, show: isManager || isOwner },
    { href: "/closing", label: "closing", icon: Lock, show: isManager || isOwner },
    { href: "/alerts", label: "alerts", icon: Bell, show: isManager || isOwner },
    { href: "/branches", label: "branches", icon: Building2, show: isOwner },
    { href: "/vehicles", label: "vehicles", icon: Car, show: isManager || isOwner },
    { href: "/trips", label: "trips", icon: Route, show: isManager || isOwner || role === "DRIVER" },
    { href: "/expenses", label: "expenses", icon: Wallet, show: isManager || isOwner },
    { href: "/debts", label: "debts", icon: AlertCircle, show: isManager || isOwner },
    { href: "/salaries", label: "salaries", icon: Users, show: isOwner },
    { href: "/reports", label: "reports", icon: BarChart3, show: isManager || isOwner },
    { href: "/settings", label: "settings", icon: Settings, show: isManager || isOwner },
  ];

  return (
    <div className="space-y-2 pb-24">
      {items.filter((i) => i.show).map((item) => {
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