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
        : {
            OR: [
              { departureBranchId: session.branchId || "" },
              { arrivalBranchId: session.branchId || "" },
            ],
          };

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, phone: true } },
        departureBranch: true,
        arrivalBranch: true,
        tickets: { where: { status: "CONFIRMED" } },
        cargo: true,
      },
      orderBy: { departureTime: "desc" },
    });

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Get trips error:", error);
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

    const { vehicleId, driverId, departureBranchId, arrivalBranchId, departureTime, price, notes } =
      await req.json();

    if (!vehicleId || !driverId || !departureBranchId || !arrivalBranchId || !departureTime || price === undefined) {
      return NextResponse.json(
        { error: "vehicleId, driverId, departureBranchId, arrivalBranchId, departureTime, and price are required" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        vehicleId,
        driverId,
        departureBranchId,
        arrivalBranchId,
        departureTime: new Date(departureTime),
        price: parseFloat(price),
        notes,
        status: "SCHEDULED",
      },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, phone: true } },
        departureBranch: true,
        arrivalBranch: true,
      },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error("Create trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
