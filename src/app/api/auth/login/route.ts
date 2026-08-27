import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession, verifyPin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return NextResponse.json(
        { error: "Phone and pin are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid phone or pin" },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    const valid = await verifyPin(pin, user.pin);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid phone or pin" },
        { status: 401 }
      );
    }

    await setSession({
      userId: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      branchId: user.branchId,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        branchId: user.branchId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
