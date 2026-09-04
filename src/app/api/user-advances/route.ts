import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const advances = await prisma.userAdvance.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ advances });
  } catch (error) {
    console.error("Get user advances error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, amount, note } = await req.json();
    if (!userId || amount === undefined || amount === null || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "userId and a positive amount are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const advance = await prisma.userAdvance.create({
      data: {
        userId,
        amount: parseFloat(amount),
        note: note || null,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
    });

    return NextResponse.json({ advance }, { status: 201 });
  } catch (error) {
    console.error("Create user advance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}