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
    const salary = await prisma.salary.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
    });

    if (!salary) {
      return NextResponse.json({ error: "Salary not found" }, { status: 404 });
    }

    return NextResponse.json({ salary });
  } catch (error) {
    console.error("Get salary error:", error);
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
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (status !== "PAID" && status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Status must be PAID or CANCELLED" },
        { status: 400 }
      );
    }

    const salary = await prisma.$transaction(async (tx) => {
      const updated = await tx.salary.update({
        where: { id },
        data: {
          status,
          ...(status === "PAID" && { paidAt: new Date() }),
        },
        include: {
          user: { select: { id: true, name: true, phone: true, role: true } },
        },
      });

      if (status === "PAID") {
        await tx.userAdvance.updateMany({
          where: { userId: updated.userId, settledAt: null },
          data: { settledAt: new Date() },
        });
      }

      return updated;
    });

    return NextResponse.json({ salary });
  } catch (error) {
    console.error("Update salary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
