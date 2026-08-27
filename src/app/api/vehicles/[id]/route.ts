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
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        branch: true,
        trips: {
          orderBy: { departureTime: "desc" },
          include: {
            departureBranch: true,
            arrivalBranch: true,
            driver: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Get vehicle error:", error);
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
    const { type, plateNumber, seatCount, branchId, status } = await req.json();

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(plateNumber && { plateNumber }),
        ...(seatCount && { seatCount: parseInt(seatCount) }),
        ...(branchId && { branchId }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Update vehicle error:", error);
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
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.vehicle.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
