"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Wallet, X, Calendar, Tag, Trash2, Pencil } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ExpenseCategory {
  id: string;
  name: string;
  _count?: { expenses: number };
}

interface Branch {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  expenseCategory: ExpenseCategory;
  branch: Branch;
}

export default function ExpensesPage() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    expenseCategoryId: "",
    amount: "",
    branchId: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/expense-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {}
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchBranches();
  }, [fetchExpenses, fetchCategories, fetchBranches]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date).toISOString().split("T")[0];
      return d >= dateFrom && d <= dateTo;
    });
  }, [expenses, dateFrom, dateTo]);

  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return expenses
      .filter((e) => new Date(e.date).toISOString().split("T")[0] === today)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const handleSubmit = async () => {
    if (!form.expenseCategoryId || !form.amount) {
      setError(t("required"));
      return;
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({ expenseCategoryId: "", amount: "", branchId: "", description: "", date: new Date().toISOString().split("T")[0] });
        fetchExpenses();
      } else {
        const data = await res.json();
        setError(data.error || t("error"));
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) fetchExpenses();
    } catch {}
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        setNewCategoryName("");
        fetchCategories();
      }
    } catch {}
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    try {
      const res = await fetch(`/api/expense-categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        setEditingCategory(null);
        setNewCategoryName("");
        fetchCategories();
      }
    } catch {}
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/expense-categories/${id}`, { method: "DELETE" });
      if (res.ok) fetchCategories();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-sand pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-sand border-b border-sand-dim">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">{t("expenses")}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center gap-2 bg-foam border border-sand-dim text-ink/60 px-3 py-2 rounded-xl text-xs font-medium"
            >
              <Tag size={14} />
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setError("");
                if (branches.length > 0) {
                  setForm((f) => ({ ...f, branchId: branches[0].id }));
                }
              }}
              className="flex items-center gap-2 bg-rope text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              <Plus size={16} />
              {t("newExpense")}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="bg-foam border border-sand-dim rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Wallet size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-ink/50">{t("todayExpenses")}</p>
              <p className="text-xl font-bold text-ink">{todayTotal.toLocaleString()} {t("mr")}</p>
            </div>
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
        {loading ? (
          <div className="text-center py-12 text-ink/40">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ink/40">{t("noResults")}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((expense) => (
              <div key={expense.id} className="bg-foam border border-sand-dim rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-rope/10 text-rope text-[10px] font-medium">
                        {expense.expenseCategory.name}
                      </span>
                      <span className="text-[10px] text-ink/40">{expense.branch.name}</span>
                    </div>
                    {expense.description && (
                      <p className="text-xs text-ink/50 mt-1">{expense.description}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-red-600">-{expense.amount.toLocaleString()} {t("mr")}</p>
                    <p className="text-[10px] text-ink/40 mt-0.5">
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] left-0 right-0 bg-foam rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink">{t("newExpense")}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-sand rounded-xl">
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("type")}</label>
                <select
                  value={form.expenseCategoryId}
                  onChange={(e) => setForm({ ...form, expenseCategoryId: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                >
                  <option value="">--</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("price")}</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("branches")}</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                >
                  <option value="">--</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("address")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50 resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">{t("departureTime")}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-3 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-sand-dim rounded-xl text-sm text-ink/60 font-medium"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-rope text-white rounded-xl text-sm font-medium"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCategoryManager(false); setEditingCategory(null); setNewCategoryName(""); }} />
          <div className="relative bg-foam rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">{t("type")}</h3>
              <button
                onClick={() => { setShowCategoryManager(false); setEditingCategory(null); setNewCategoryName(""); }}
                className="p-2 hover:bg-sand rounded-xl"
              >
                <X size={20} className="text-ink/40" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t("name")}
                className="flex-1 px-4 py-2.5 bg-sand border border-sand-dim rounded-xl text-sm text-ink outline-none focus:border-rope/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    editingCategory ? handleUpdateCategory() : handleAddCategory();
                  }
                }}
              />
              <button
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                className="px-4 py-2.5 bg-rope text-white rounded-xl text-sm font-medium"
              >
                {editingCategory ? t("save") : t("add")}
              </button>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-sand rounded-xl">
                  <div>
                    <span className="text-sm text-ink">{cat.name}</span>
                    {cat._count && (
                      <span className="text-xs text-ink/40 mr-2">({cat._count.expenses})</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setNewCategoryName(cat.name);
                      }}
                      className="p-1.5 hover:bg-foam rounded-lg"
                    >
                      <Pencil size={14} className="text-ink/40" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
