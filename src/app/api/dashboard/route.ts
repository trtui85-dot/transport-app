import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface BranchData {
  branch: { id: string; name: string };
  todayNet: number;
  totalTickets: number;
  totalCargo: number;
  totalExpenses: number;
  openDebts: number;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (session.role === "OWNER") {
      const branches = await prisma.branch.findMany({ where: { active: true } });

      const branchData = await Promise.all(
        branches.map(async (branch: { id: string; name: string }) => {
          const ticketRevenue = await prisma.ticket.aggregate({
            where: {
              branchId: branch.id,
              status: "CONFIRMED",
              paid: true,
              issuedAt: { gte: todayStart, lte: todayEnd },
            },
            _sum: { amount: true },
          });

          const cargoRevenue = await prisma.cargo.aggregate({
            where: {
              OR: [
                { senderBranchId: branch.id },
                { receiverBranchId: branch.id },
              ],
              status: { in: ["PENDING", "IN_TRANSIT", "ARRIVED", "DELIVERED"] },
              createdAt: { gte: todayStart, lte: todayEnd },
            },
            _sum: { amount: true },
          });

          const expensesSum = await prisma.expense.aggregate({
            where: {
              branchId: branch.id,
              date: { gte: todayStart, lte: todayEnd },
            },
            _sum: { amount: true },
          });

          const ticketCount = await prisma.ticket.count({
            where: {
              branchId: branch.id,
              status: "CONFIRMED",
              issuedAt: { gte: todayStart, lte: todayEnd },
            },
          });

          const cargoCount = await prisma.cargo.count({
            where: {
              OR: [
                { senderBranchId: branch.id },
                { receiverBranchId: branch.id },
              ],
              createdAt: { gte: todayStart, lte: todayEnd },
            },
          });

          const openDebts = await prisma.debt.count({
            where: {
              branchId: branch.id,
              status: { in: ["OPEN", "PARTIAL"] },
            },
          });

          const todayNet =
            (ticketRevenue._sum.amount || 0) +
            (cargoRevenue._sum.amount || 0) -
            (expensesSum._sum.amount || 0);

          return {
            branch,
            todayNet,
            totalTickets: ticketCount,
            totalCargo: cargoCount,
            totalExpenses: expensesSum._sum.amount || 0,
            openDebts,
          };
        })
      );

      const totalTicketRevenue = branchData.reduce(
        (sum: number, b: BranchData) => sum + b.totalTickets,
        0
      );
      const totalCargoCount = branchData.reduce(
        (sum: number, b: BranchData) => sum + b.totalCargo,
        0
      );
      const totalExpensesAll = branchData.reduce(
        (sum: number, b: BranchData) => sum + b.totalExpenses,
        0
      );
      const totalOpenDebts = branchData.reduce(
        (sum: number, b: BranchData) => sum + b.openDebts,
        0
      );
      const totalTodayNet = branchData.reduce(
        (sum: number, b: BranchData) => sum + b.todayNet,
        0
      );

      return NextResponse.json({
        branches: branchData,
        totals: {
          todayNet: totalTodayNet,
          totalTickets: totalTicketRevenue,
          totalCargo: totalCargoCount,
          totalExpenses: totalExpensesAll,
          openDebts: totalOpenDebts,
        },
      });
    }

    const branchId = session.branchId;
    if (!branchId) {
      return NextResponse.json({ branches: [], totals: {} });
    }

    const ticketRevenue = await prisma.ticket.aggregate({
      where: {
        branchId,
        status: "CONFIRMED",
        paid: true,
        issuedAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
    });

    const cargoRevenue = await prisma.cargo.aggregate({
      where: {
        OR: [
          { senderBranchId: branchId },
          { receiverBranchId: branchId },
        ],
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
    });

    const expensesSum = await prisma.expense.aggregate({
      where: {
        branchId,
        date: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
    });

    const ticketCount = await prisma.ticket.count({
      where: {
        branchId,
        status: "CONFIRMED",
        issuedAt: { gte: todayStart, lte: todayEnd },
      },
    });

    const cargoCount = await prisma.cargo.count({
      where: {
        OR: [
          { senderBranchId: branchId },
          { receiverBranchId: branchId },
        ],
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    const openDebts = await prisma.debt.count({
      where: {
        branchId,
        status: { in: ["OPEN", "PARTIAL"] },
      },
    });

    const todayNet =
      (ticketRevenue._sum.amount || 0) +
      (cargoRevenue._sum.amount || 0) -
      (expensesSum._sum.amount || 0);

    return NextResponse.json({
      todayNet,
      totalTickets: ticketCount,
      totalCargo: cargoCount,
      totalExpenses: expensesSum._sum.amount || 0,
      openDebts,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
