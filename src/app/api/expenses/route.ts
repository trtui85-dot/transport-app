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

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        expenseCategory: true,
        branch: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Get expenses error:", error);
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

    const { expenseCategoryId, amount, branchId, description, date } =
      await req.json();

    if (!expenseCategoryId || amount === undefined) {
      return NextResponse.json(
        { error: "expenseCategoryId and amount are required" },
        { status: 400 }
      );
    }

    const effectiveBranchId =
      session.role === "OWNER" ? branchId : session.branchId;

    const expense = await prisma.expense.create({
      data: {
        expenseCategoryId,
        amount: parseFloat(amount),
        branchId: effectiveBranchId,
        description,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        expenseCategory: true,
        branch: true,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
