import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "BRANCH_MANAGER" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const branchId =
      session.role === "OWNER" ? searchParams.get("branchId") : session.branchId;
    if (!branchId) {
      return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }

    const methodId = searchParams.get("methodId") || undefined;
    const search = searchParams.get("search")?.trim() || "";
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? Math.min(parseInt(limitStr) || 50, 200) : 50;

    const [assignments, unpaid, transactions] = await Promise.all([
      prisma.branchPaymentMethod.findMany({
        where: { branchId, active: true },
        include: { paymentMethodConfig: true },
      }),
      prisma.ticket.findMany({
        where: {
          branchId,
          paid: false,
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
        orderBy: { issuedAt: "desc" },
        take: 100,
        include: {
          trip: {
            include: {
              vehicle: true,
              departureBranch: true,
              arrivalBranch: true,
            },
          },
          paymentMethodConfig: true,
        },
      }),
      prisma.ticket.findMany({
        where: {
          branchId,
          paid: true,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          ...(methodId ? { paymentMethodConfigId: methodId } : {}),
          ...(search
            ? {
                OR: [
                  { passengerName: { contains: search, mode: "insensitive" } },
                  { passengerPhone: { contains: search } },
                ],
              }
            : {}),
        },
        orderBy: { paidAt: "desc" },
        take: limit,
        include: {
          trip: {
            include: {
              vehicle: true,
              departureBranch: true,
              arrivalBranch: true,
            },
          },
          paymentMethodConfig: true,
        },
      }),
    ]);

    const methods = [];
    for (const a of assignments) {
      const m = a.paymentMethodConfig;
      const agg = await prisma.ticket.aggregate({
        where: {
          branchId,
          paid: true,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          paymentMethodConfigId: m.id,
        },
        _sum: { amount: true },
        _count: true,
      });
      methods.push({
        id: m.id,
        name: m.name,
        nameAr: m.nameAr,
        logo: m.logo,
        isCredit: m.isCredit,
        sortOrder: m.sortOrder,
        balance: agg._sum.amount || 0,
        txCount: agg._count,
      });
    }
    methods.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return NextResponse.json({
      branchId,
      methods,
      unpaid,
      transactions,
    });
  } catch (error) {
    console.error("Branch payments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}