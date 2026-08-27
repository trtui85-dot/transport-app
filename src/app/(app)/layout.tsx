"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";

interface User {
  userId: string;
  name: string;
  phone: string;
  role: "OWNER" | "BRANCH_MANAGER" | "TICKET_AGENT" | "CARGO_AGENT" | "DRIVER" | "ACCOUNTANT";
  branchId?: string | null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.replace("/");
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-sand">
        <Loader2 size={32} className="animate-spin text-rope" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-sand" dir="rtl">
      <div className="hidden lg:block">
        <Sidebar user={user} currentPath={pathname} onLogout={handleLogout} />
      </div>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-foam border-b border-sand-dim px-4 h-14 flex items-center justify-between">
        <h1 className="text-base font-bold text-ink font-[family-name:var(--font-display)]">
          نظام النقل
        </h1>
        <button
          onClick={handleLogout}
          className="text-xs text-danger font-medium px-3 py-1.5 rounded-lg hover:bg-danger/10 transition-colors"
        >
          خروج
        </button>
      </div>

      <main className="pt-0 lg:pr-64 pb-20 lg:pb-0 min-h-dvh">
        <div className="lg:hidden h-14" />
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      <div className="lg:hidden">
        <BottomNav currentPath={pathname} />
      </div>
    </div>
  );
}
