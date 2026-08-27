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
    const debt = await prisma.debt.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { date: "desc" } },
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    return NextResponse.json({ debt });
  } catch (error) {
    console.error("Get debt error:", error);
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

    const debt = await prisma.debt.update({
      where: { id },
      data: {
        ...(body.contactName && { contactName: body.contactName }),
        ...(body.contactPhone && { contactPhone: body.contactPhone }),
        ...(body.type && { type: body.type }),
        ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
      },
    });

    return NextResponse.json({ debt });
  } catch (error) {
    console.error("Update debt error:", error);
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
    await prisma.debt.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete debt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
