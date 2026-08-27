import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const period = searchParams.get("period") || "monthly";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let fromDate: Date;
    let toDate: Date;

    if (from && to) {
      fromDate = new Date(from);
      toDate = new Date(to);
    } else {
      toDate = new Date();
      fromDate = new Date();
      if (period === "daily") {
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (period === "weekly") {
        fromDate.setDate(fromDate.getDate() - 12 * 7);
      } else {
        fromDate.setMonth(fromDate.getMonth() - 12);
      }
    }

    switch (type) {
      case "profit": {
        const branches = await prisma.branch.findMany({
          where: session.role === "OWNER" ? {} : { id: session.branchId || "" },
        });

        const data = await Promise.all(
          branches.map(async (branch: { id: string; name: string }) => {
            const ticketRevenue = await prisma.ticket.aggregate({
              where: {
                branchId: branch.id,
                status: "CONFIRMED",
                paid: true,
                issuedAt: { gte: fromDate, lte: toDate },
              },
              _sum: { amount: true },
            });

            const cargoRevenue = await prisma.cargo.aggregate({
              where: {
                OR: [
                  { senderBranchId: branch.id },
                  { receiverBranchId: branch.id },
                ],
                createdAt: { gte: fromDate, lte: toDate },
              },
              _sum: { amount: true },
            });

            const expensesSum = await prisma.expense.aggregate({
              where: {
                branchId: branch.id,
                date: { gte: fromDate, lte: toDate },
              },
              _sum: { amount: true },
            });

            const revenue =
              (ticketRevenue._sum.amount || 0) +
              (cargoRevenue._sum.amount || 0);
            const expenses = expensesSum._sum.amount || 0;

            return {
              branch: { id: branch.id, name: branch.name },
              ticketRevenue: ticketRevenue._sum.amount || 0,
              cargoRevenue: cargoRevenue._sum.amount || 0,
              totalRevenue: revenue,
              expenses,
              profit: revenue - expenses,
            };
          })
        );

        return NextResponse.json({ type: "profit", period, from: fromDate, to: toDate, data });
      }

      case "cashflow": {
        const ticketInflows = await prisma.ticket.groupBy({
          by: ["paymentMethod"],
          where: {
            status: "CONFIRMED",
            paid: true,
            issuedAt: { gte: fromDate, lte: toDate },
            ...(session.role !== "OWNER" && { branchId: session.branchId }),
          },
          _sum: { amount: true },
          _count: true,
        });

        const cargoInflows = await prisma.cargo.groupBy({
          by: ["paymentMethod"],
          where: {
            createdAt: { gte: fromDate, lte: toDate },
            ...(session.role !== "OWNER" && {
              OR: [
                { senderBranchId: session.branchId! },
                { receiverBranchId: session.branchId! },
              ],
            }),
          },
          _sum: { amount: true },
          _count: true,
        });

        const inflows: Record<string, number> = {};
        ticketInflows.forEach((item: { paymentMethod: string; _sum: { amount: number | null } }) => {
          inflows[item.paymentMethod] =
            (inflows[item.paymentMethod] || 0) + (item._sum.amount || 0);
        });
        cargoInflows.forEach((item) => {
          inflows[item.paymentMethod] =
            (inflows[item.paymentMethod] || 0) + (item._sum.amount || 0);
        });

        const expensesByCategory = await prisma.expense.groupBy({
          by: ["expenseCategoryId"],
          where: {
            date: { gte: fromDate, lte: toDate },
            ...(session.role !== "OWNER" && { branchId: session.branchId }),
          },
          _sum: { amount: true },
        });

        const categories = await prisma.expenseCategory.findMany();
        const categoryMap = Object.fromEntries(
          categories.map((c: { id: string; name: string }) => [c.id, c.name])
        );

        const outflows: Record<string, number> = {};
        expensesByCategory.forEach((item: { expenseCategoryId: string; _sum: { amount: number | null } }) => {
          const name = categoryMap[item.expenseCategoryId] || "Other";
          outflows[name] = (outflows[name] || 0) + (item._sum.amount || 0);
        });

        return NextResponse.json({
          type: "cashflow",
          period,
          from: fromDate,
          to: toDate,
          inflows,
          outflows,
        });
      }

      case "ageing": {
        const debts = await prisma.debt.findMany({
          where: {
            status: { in: ["OPEN", "PARTIAL"] },
            ...(session.role !== "OWNER" && { branchId: session.branchId }),
          },
        });

        const now = new Date();
        const buckets = { "0-30": 0, "31-60": 0, "60+": 0 };

        debts.forEach((debt: { createdAt: Date; amount: number; paidAmount: number }) => {
          const daysDiff = Math.floor(
            (now.getTime() - new Date(debt.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const remaining = debt.amount - debt.paidAmount;
          if (daysDiff <= 30) {
            buckets["0-30"] += remaining;
          } else if (daysDiff <= 60) {
            buckets["31-60"] += remaining;
          } else {
            buckets["60+"] += remaining;
          }
        });

        return NextResponse.json({ type: "ageing", period, from: fromDate, to: toDate, data: buckets });
      }

      case "activity": {
        const users = await prisma.user.findMany({
          where: session.role === "OWNER" ? {} : { branchId: session.branchId },
          select: { id: true, name: true, role: true },
        });

        const data = await Promise.all(
          users.map(async (user: { id: string; name: string; role: string }) => {
            const ticketCount = await prisma.ticket.count({
              where: {
                issuedById: user.id,
                issuedAt: { gte: fromDate, lte: toDate },
              },
            });

            const cargoCount = await prisma.cargo.count({
              where: {
                deliveredById: user.id,
                createdAt: { gte: fromDate, lte: toDate },
              },
            });

            return {
              user,
              ticketsIssued: ticketCount,
              cargoHandled: cargoCount,
            };
          })
        );

        return NextResponse.json({ type: "activity", period, from: fromDate, to: toDate, data });
      }

      default:
        return NextResponse.json(
          { error: "Invalid report type. Use: profit, cashflow, ageing, activity" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
