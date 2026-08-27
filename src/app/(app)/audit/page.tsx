"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Calendar, Filter, Clock, User, FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
}

const ENTITY_TYPES = [
  "ALL",
  "TICKET",
  "CARGO",
  "TRIP",
  "VEHICLE",
  "BRANCH",
  "USER",
  "EXPENSE",
  "DEBT",
  "SALARY",
  "SETTING",
];

export default function AuditPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchAudit = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (entityFilter !== "ALL") params.set("entity", entityFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (search) params.set("search", search);

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || data.audit || []);
      } else if (res.status === 403) {
        setError("Access denied");
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [entityFilter, dateFrom, dateTo, search, t]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const filtered = entries.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        e.userName?.toLowerCase().includes(q) ||
        e.action?.toLowerCase().includes(q) ||
        e.entity?.toLowerCase().includes(q) ||
        e.details?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const actionColor = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes("CREATE") || a.includes("ADD")) return "bg-green-100 text-green-700";
    if (a.includes("UPDATE") || a.includes("EDIT")) return "bg-blue-100 text-blue-700";
    if (a.includes("DELETE") || a.includes("REMOVE")) return "bg-red-100 text-red-700";
    if (a.includes("LOGIN")) return "bg-purple-100 text-purple-700";
    if (a.includes("LOGOUT")) return "bg-gray-100 text-gray-700";
    return "bg-sand text-ink/60";
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-ink mb-3">{t("audit")}</h1>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-foam border border-sand-dim rounded-xl text-sm text-ink placeholder:text-ink/40 outline-none focus:border-rope/50"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {ENTITY_TYPES.map((et) => (
              <button
                key={et}
                onClick={() => setEntityFilter(et)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                  entityFilter === et
                    ? "bg-rope text-white"
                    : "bg-foam text-ink/50 border border-sand-dim"
                }`}
              >
                {et === "ALL" ? t("filter") : et}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-2 items-center">
          <Calendar size={14} className="text-ink/40 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-foam border border-sand-dim rounded-lg text-xs text-ink outline-none"
          />
          <span className="text-ink/30 text-xs">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-foam border border-sand-dim rounded-lg text-xs text-ink outline-none"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-sand-dim" />
            <div className="space-y-3">
              {filtered.map((entry) => (
                <div key={entry.id} className="relative flex gap-3">
                  <div className="relative z-10 w-10 h-10 rounded-full bg-foam border border-sand-dim flex items-center justify-center shrink-0">
                    <Clock size={14} className="text-ink/40" />
                  </div>
                  <div className="flex-1 bg-foam border border-sand-dim rounded-xl p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-ink/40" />
                        <span className="text-xs font-medium text-ink">{entry.userName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${actionColor(entry.action)}`}>
                        {entry.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-ink/50 mb-1">
                      <FileText size={10} />
                      <span className="font-medium">{entry.entity}</span>
                      {entry.entityId && (
                        <span className="text-ink/30 text-[10px]">#{entry.entityId.slice(0, 8)}</span>
                      )}
                    </div>

                    {entry.details && (
                      <p className="text-[11px] text-ink/40 mt-1 bg-sand/50 rounded-lg p-2">{entry.details}</p>
                    )}

                    <p className="text-[10px] text-ink/30 mt-2">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
