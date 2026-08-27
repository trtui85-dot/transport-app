import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        expenseCategory: true,
        branch: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Get expense error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.expenseCategoryId && { expenseCategoryId: body.expenseCategoryId }),
        ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
        ...(body.branchId !== undefined && { branchId: body.branchId }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.date && { date: new Date(body.date) }),
      },
      include: {
        expenseCategory: true,
        branch: true,
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
