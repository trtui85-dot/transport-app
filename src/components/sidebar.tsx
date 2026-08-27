"use client";

import Link from "next/link";
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
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard, roles: ["OWNER", "BRANCH_MANAGER", "TICKET_AGENT", "CARGO_AGENT", "DRIVER", "ACCOUNTANT"] },
  { href: "/tickets", label: "nav.tickets", icon: Ticket, roles: ["OWNER", "BRANCH_MANAGER", "TICKET_AGENT"] },
  { href: "/cargo", label: "nav.cargo", icon: Package, roles: ["OWNER", "BRANCH_MANAGER", "CARGO_AGENT"] },
  { href: "/branches", label: "nav.branches", icon: Building2, roles: ["OWNER"] },
  { href: "/vehicles", label: "nav.vehicles", icon: Car, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/trips", label: "nav.trips", icon: Route, roles: ["OWNER", "BRANCH_MANAGER", "DRIVER"] },
  { href: "/expenses", label: "nav.expenses", icon: Wallet, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/debts", label: "nav.debts", icon: AlertCircle, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/salaries", label: "nav.salaries", icon: Users, roles: ["OWNER"] },
  { href: "/reports", label: "nav.reports", icon: BarChart3, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/settings", label: "nav.settings", icon: Settings, roles: ["OWNER", "BRANCH_MANAGER"] },
  { href: "/users", label: "nav.users", icon: Users, roles: ["OWNER"] },
];

export default function Sidebar({ user, currentPath, onLogout }: SidebarProps) {
  const { t, lang, setLang } = useLanguage();

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  const handleLanguageToggle = () => {
    setLang(lang === "ar" ? "fr" : "ar");
  };

  return (
    <aside
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="fixed top-0 right-0 h-screen w-60 bg-ink text-sand rounded-2xl m-2 flex flex-col z-40 overflow-hidden"
    >
      <div className="px-5 py-6 border-b border-sand/10">
        <h1 className="text-lg font-bold tracking-tight">{t("app.name")}</h1>
        <p className="text-xs text-sand/50 mt-0.5">{user.role.replace("_", " ")}</p>
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
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
