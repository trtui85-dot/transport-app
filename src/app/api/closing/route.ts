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

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "BRANCH_MANAGER" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const branchId = session.branchId;
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
        },
      }),
      prisma.cargo.findMany({ where: { senderBranchId: branchId } }),
      prisma.expense.findMany({
        where: { branchId },
        include: { expenseCategory: true },
      }),
      prisma.branch.findUnique({ where: { id: branchId } }),
    ]);

    const todayTickets = tickets.filter((tk) => isSameLocalDay(tk.issuedAt, now));
    const todayCargo = cargo.filter((c) => isSameLocalDay(c.createdAt, now));
    const todayExpenses = expenses.filter((e) => isSameLocalDay(e.date, now));

    const ticketRevenue = todayTickets.reduce((s, tk) => s + tk.amount, 0);
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
      })),
      ...todayCargo.map((c) => ({
        id: c.id,
        type: "CARGO",
        label: `${c.senderName} → ${c.receiverName}`,
        trackingCode: c.trackingCode,
        amount: c.amount,
        time: c.createdAt.toISOString(),
        paymentMethod: c.paymentMethod,
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

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "BRANCH_MANAGER" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const branchId = session.branchId;
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
