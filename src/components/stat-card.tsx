"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: "green" | "red" | "blue" | "orange";
  trend?: number;
}

const colorMap = {
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-rope/10 text-rope",
};

const borderColorMap = {
  green: "border-green-200",
  red: "border-red-200",
  blue: "border-blue-200",
  orange: "border-rope/20",
};

export default function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <div className={`bg-foam rounded-2xl p-4 border ${color ? borderColorMap[color] : "border-sand/30"}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-ink/45 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-ink mt-1">{value}</p>

          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
              {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color ? colorMap[color] : "bg-sand/30 text-ink/40"}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
