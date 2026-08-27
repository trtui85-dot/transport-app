"use client";

import Link from "next/link";
import { LayoutDashboard, Ticket, Package, Menu } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface BottomNavProps {
  currentPath: string;
}

const navItems = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "nav.tickets", icon: Ticket },
  { href: "/cargo", label: "nav.cargo", icon: Package },
  { href: "/more", label: "nav.more", icon: Menu },
];

export default function BottomNav({ currentPath }: BottomNavProps) {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-foam border-t border-sand/20 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full text-xs transition-colors ${
                isActive
                  ? "text-rope font-semibold"
                  : "text-ink/40 hover:text-ink/60"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span>{t(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
