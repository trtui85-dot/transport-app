import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { amount } = await req.json();

    if (amount === undefined || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "A positive payment amount is required" },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.findUnique({ where: { id } });
    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    const paymentAmount = parseFloat(amount);
    const newPaidAmount = debt.paidAmount + paymentAmount;

    if (newPaidAmount > debt.amount) {
      return NextResponse.json(
        { error: "Payment exceeds remaining balance" },
        { status: 400 }
      );
    }

    let newStatus: "OPEN" | "PARTIAL" | "PAID" = "OPEN";
    if (newPaidAmount >= debt.amount) {
      newStatus = "PAID";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIAL";
    }

    const updated = await prisma.$transaction(async (tx) => {
      const payment = await tx.debtPayment.create({
        data: {
          debtId: id,
          amount: paymentAmount,
        },
      });

      const updatedDebt = await tx.debt.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
        include: { payments: { orderBy: { date: "desc" } } },
      });

      return { debt: updatedDebt, payment };
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Pay debt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
