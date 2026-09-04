"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Package,
  Building2,
  Car,
  Route,
  Wallet,
  AlertCircle,
  Users,
  BarChart3,
  Settings,
  Globe,
  LogOut,
  Moon,
  Sun,
  Navigation,
  Lock,
  Bell,
  CircleUser,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type UserRole = "OWNER" | "BRANCH_MANAGER" | "TICKET_AGENT" | "CARGO_AGENT" | "DRIVER" | "ACCOUNTANT";

interface User {
  role: UserRole;
  branchId?: string | null;
}

interface SidebarProps {
  user: User;
  currentPath: string;
  onLogout?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "dashboard", icon: LayoutDashboard, roles: ["OWNER", "BRANCH_MANAGER", "TICKET_AGENT", "CARGO_AGENT", "DRIVER", "ACCOUNTANT"] },
  { href: "/tickets", label: "tickets", icon: Ticket, roles: ["OWNER", "BRANCH_MANAGER", "TICKET_AGENT"] },
  { href: "/cargo", label: "cargo", icon: Package, roles: ["OWNER", "BRANCH_MANAGER", "CARGO_AGENT"] },
  { href: "/fleet", label: "fleet", icon: Navigation, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/closing", label: "closing", icon: Lock, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/alerts", label: "alerts", icon: Bell, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/branches", label: "branches", icon: Building2, roles: ["OWNER"] },
  { href: "/vehicles", label: "vehicles", icon: Car, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/trips", label: "trips", icon: Route, roles: ["OWNER", "BRANCH_MANAGER", "DRIVER"] },
  { href: "/branch-trips", label: "branchTrips", icon: Route, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/driver", label: "myTrips", icon: CircleUser, roles: ["DRIVER"] },
  { href: "/expenses", label: "expenses", icon: Wallet, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/debts", label: "debts", icon: AlertCircle, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/salaries", label: "salaries", icon: Users, roles: ["OWNER"] },
  { href: "/reports", label: "reports", icon: BarChart3, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/settings", label: "settings", icon: Settings, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/users", label: "users", icon: Users, roles: ["OWNER"] },
];

export default function Sidebar({ user, currentPath, onLogout }: SidebarProps) {
  const { t, lang, setLang } = useLanguage();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("transport:theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("transport:theme", dark ? "dark" : "light");
  }, [dark]);

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  const handleLanguageToggle = () => {
    setLang(lang === "ar" ? "fr" : "ar");
  };

  const roleLabel = (r: UserRole) => {
    switch (r) {
      case "OWNER": return t("owner");
      case "BRANCH_MANAGER": return t("manager");
      case "TICKET_AGENT": return t("ticketAgent");
      case "CARGO_AGENT": return t("cargoAgent");
      case "DRIVER": return t("driver");
      case "ACCOUNTANT": return t("accountant");
      default: return r;
    }
  };

  return (
    <aside
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="fixed top-0 right-0 h-screen w-60 bg-ink text-sand rounded-2xl m-2 flex flex-col z-40 overflow-hidden"
    >
      <div className="px-5 py-6 border-b border-sand/10">
        <h1 className="text-lg font-bold tracking-tight">{t("appName")}</h1>
        <p className="text-xs text-sand/50 mt-0.5">{roleLabel(user.role)}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleItems.map((item) => {
          const isActive = currentPath.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors mb-0.5 ${
                isActive
                  ? "bg-rope text-white font-medium"
                  : "text-sand/70 hover:bg-sand/10 hover:text-sand"
              }`}
            >
              <Icon size={18} />
              <span>{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-sand/10">
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sand/70 hover:bg-sand/10 hover:text-sand w-full transition-colors"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{t(dark ? "lightMode" : "darkMode")}</span>
        </button>
        <button
          onClick={handleLanguageToggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sand/70 hover:bg-sand/10 hover:text-sand w-full transition-colors"
        >
          <Globe size={18} />
          <span>{lang === "ar" ? "Français" : "العربية"}</span>
        </button>
        <button
          onClick={() => onLogout?.()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sand/70 hover:bg-red-500/20 hover:text-red-400 w-full transition-colors"
        >
          <LogOut size={18} />
          <span>{t("logout")}</span>
        </button>
      </div>
    </aside>
  );
}
