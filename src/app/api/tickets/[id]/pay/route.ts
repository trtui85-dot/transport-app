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
    if (session.role !== "BRANCH_MANAGER" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { paymentMethodConfigId } = await req.json();
    if (!paymentMethodConfigId) {
      return NextResponse.json(
        { error: "paymentMethodConfigId is required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Branch managers can only collect for their own branch
    if (
      session.role === "BRANCH_MANAGER" &&
      ticket.branchId !== session.branchId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (ticket.paid) {
      return NextResponse.json(
        { error: "Ticket already paid" },
        { status: 400 }
      );
    }

    const method = await prisma.paymentMethodConfig.findUnique({
      where: { id: paymentMethodConfigId },
    });
    if (!method || !method.active) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 400 }
      );
    }
    if (method.isCredit) {
      return NextResponse.json(
        { error: "Credit method cannot be used to collect payment" },
        { status: 400 }
      );
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        paid: true,
        paidAt: new Date(),
        paymentMethodConfigId: method.id,
      },
      include: { paymentMethodConfig: true },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    console.error("Collect ticket payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}