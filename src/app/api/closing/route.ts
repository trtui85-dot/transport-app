import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isSameLocalDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "BRANCH_MANAGER" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let branchId = session.branchId;
    if (session.role === "OWNER") {
      const url = new URL(req.url);
      const q = url.searchParams.get("branchId");
      if (q) {
        branchId = q;
      } else {
        const firstBranch = await prisma.branch.findFirst({ select: { id: true } });
        branchId = firstBranch?.id || null;
      }
    }
    if (!branchId) {
      return NextResponse.json({ error: "Branch not found for this user" }, { status: 400 });
    }

    const now = new Date();
    const todayKey = toDateKey(now);

    const closedSetting = await prisma.setting.findUnique({
      where: { key: `closed:${branchId}:${todayKey}` },
    });

    const [tickets, cargo, expenses, branch] = await Promise.all([
      prisma.ticket.findMany({
        where: { branchId, status: { in: ["CONFIRMED", "COMPLETED"] } },
        include: {
          trip: {
            include: {
              vehicle: true,
              departureBranch: true,
              arrivalBranch: true,
            },
          },
          issuedBy: { select: { id: true, name: true } },
          paymentMethodConfig: true,
        },
      }),
      prisma.cargo.findMany({ where: { senderBranchId: branchId }, include: { paymentMethodConfig: true } }),
      prisma.expense.findMany({
        where: { branchId },
        include: { expenseCategory: true },
      }),
      prisma.branch.findUnique({ where: { id: branchId } }),
    ]);

    const todayTickets = tickets.filter((tk) => isSameLocalDay(tk.issuedAt, now));
    const paidTodayTickets = todayTickets.filter((tk) => tk.paid);
    const todayCargo = cargo.filter((c) => isSameLocalDay(c.createdAt, now));
    const todayExpenses = expenses.filter((e) => isSameLocalDay(e.date, now));

    const ticketRevenue = paidTodayTickets.reduce((s, tk) => s + tk.amount, 0);
    const unpaidToday = todayTickets.length - paidTodayTickets.length;
    const cargoRevenue = todayCargo.reduce((s, c) => s + c.amount, 0);
    const expenseAmount = todayExpenses.reduce((s, e) => s + e.amount, 0);

    const transactions = [
      ...todayTickets.map((tk) => ({
        id: tk.id,
        type: "TICKET",
        label: `${tk.trip?.departureBranch?.name ?? ""} → ${tk.trip?.arrivalBranch?.name ?? ""}`,
        passengerName: tk.passengerName,
        amount: tk.amount,
        time: tk.issuedAt.toISOString(),
        paymentMethod: tk.paymentMethod,
        paymentMethodLabel:
          tk.paymentMethodConfig?.nameAr ||
          tk.paymentMethodConfig?.name ||
          tk.paymentMethod,
        paymentMethodLogo: tk.paymentMethodConfig?.logo || null,
        paid: tk.paid,
        paidAt: tk.paidAt ? tk.paidAt.toISOString() : null,
      })),
      ...todayCargo.map((c) => ({
        id: c.id,
        type: "CARGO",
        label: `${c.senderName} → ${c.receiverName}`,
        trackingCode: c.trackingCode,
        amount: c.amount,
        time: c.createdAt.toISOString(),
        paymentMethod: c.paymentMethod,
        paymentMethodLabel:
          c.paymentMethodConfig?.nameAr ||
          c.paymentMethodConfig?.name ||
          c.paymentMethod,
        paymentMethodLogo: c.paymentMethodConfig?.logo || null,
      })),
      ...todayExpenses.map((e) => ({
        id: e.id,
        type: "EXPENSE",
        label: e.expenseCategory?.name ?? "Expense",
        description: e.description,
        amount: e.amount,
        time: e.date.toISOString(),
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      date: todayKey,
      branch: { id: branch?.id, name: branch?.name, city: branch?.city },
      closed: !!closedSetting,
      closedAt: closedSetting ? closedSetting.value : null,
      summary: {
        tickets: todayTickets.length,
        ticketRevenue,
        unpaidToday,
        cargo: todayCargo.length,
        cargoRevenue,
        expenses: todayExpenses.length,
        expenseAmount,
        net: ticketRevenue + cargoRevenue - expenseAmount,
      },
      transactions,
    });
  } catch (error) {
    console.error("Get closing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "BRANCH_MANAGER" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let branchId = session.branchId;
    if (session.role === "OWNER") {
      const url = new URL(req.url);
      branchId = url.searchParams.get("branchId") || branchId;
    }
    if (!branchId) {
      return NextResponse.json({ error: "Branch not found for this user" }, { status: 400 });
    }

    const now = new Date();
    const todayKey = toDateKey(now);
    const key = `closed:${branchId}:${todayKey}`;

    const existing = await prisma.setting.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json({ error: "Today already closed" }, { status: 409 });
    }

    const setting = await prisma.setting.create({
      data: { key, value: now.toISOString() },
    });

    return NextResponse.json({ ok: true, setting, key }, { status: 201 });
  } catch (error) {
    console.error("Close day error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
