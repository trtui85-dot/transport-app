import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where =
      session.role === "OWNER"
        ? {}
        : {
            OR: [
              { senderBranchId: session.branchId || "" },
              { receiverBranchId: session.branchId || "" },
            ],
          };

    const cargo = await prisma.cargo.findMany({
      where,
      include: {
        senderBranch: true,
        receiverBranch: true,
        trip: true,
        paymentMethodConfig: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ cargo });
  } catch (error) {
    console.error("Get cargo error:", error);
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

    const {
      description,
      weight,
      packageType,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      senderBranchId,
      receiverBranchId,
      amount,
      paymentMethod,
      paymentMethodConfigId,
    } = await req.json();

    if (!description || !weight || !senderName || !senderPhone || !receiverName || !receiverPhone || !senderBranchId || !receiverBranchId || amount === undefined) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `TRK-${dateStr}-${random}`;

    const cargo = await prisma.cargo.create({
      data: {
        trackingCode,
        description,
        weight: parseFloat(weight),
        packageType: packageType || "box",
        senderName,
        senderPhone,
        receiverName,
        receiverPhone,
        senderBranchId,
        receiverBranchId,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || "CASH",
        paymentMethodConfigId: paymentMethodConfigId || null,
      },
      include: {
        senderBranch: true,
        receiverBranch: true,
        paymentMethodConfig: true,
      },
    });

    return NextResponse.json({ cargo }, { status: 201 });
  } catch (error) {
    console.error("Create cargo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
