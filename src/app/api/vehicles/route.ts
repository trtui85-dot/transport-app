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

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: { branch: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error("Get vehicles error:", error);
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

    const { type, plateNumber, seatCount, branchId } = await req.json();

    if (!type || !plateNumber || !seatCount) {
      return NextResponse.json(
        { error: "Type, plate number, and seat count are required" },
        { status: 400 }
      );
    }

    const effectiveBranchId =
      session.role === "OWNER" ? branchId : session.branchId;

    if (!effectiveBranchId) {
      return NextResponse.json(
        { error: "Branch is required" },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        type,
        plateNumber,
        seatCount: parseInt(seatCount),
        branchId: effectiveBranchId,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error("Create vehicle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
