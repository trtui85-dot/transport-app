import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        baseSalary: true,
        commissionPerTrip: true,
        active: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
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

    const { name, phone, pin, role, branchId, baseSalary, commissionPerTrip } =
      await req.json();

    if (!name || !phone || !pin || !role) {
      return NextResponse.json(
        { error: "Name, phone, pin, and role are required" },
        { status: 400 }
      );
    }

    const hashedPin = await hashPin(pin);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        pin: hashedPin,
        role,
        branchId,
        baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
        commissionPerTrip: commissionPerTrip ? parseFloat(commissionPerTrip) : 0,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        baseSalary: true,
        commissionPerTrip: true,
        active: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
