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
        : { branchId: session.branchId || "" };

    const debts = await prisma.debt.findMany({
      where,
      include: {
        payments: { orderBy: { date: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ debts });
  } catch (error) {
    console.error("Get debts error:", error);
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

    const { contactName, contactPhone, type, amount, branchId, description } =
      await req.json();

    if (!contactName || !contactPhone || !type || amount === undefined) {
      return NextResponse.json(
        { error: "contactName, contactPhone, type, and amount are required" },
        { status: 400 }
      );
    }

    const effectiveBranchId =
      session.role === "OWNER" ? branchId : session.branchId;

    const debt = await prisma.debt.create({
      data: {
        contactName,
        contactPhone,
        type,
        amount: parseFloat(amount),
        branchId: effectiveBranchId,
        description,
      },
    });

    return NextResponse.json({ debt }, { status: 201 });
  } catch (error) {
    console.error("Create debt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
