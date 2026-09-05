import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const STATUS_FLOW: Record<string, string> = {
  SCHEDULED: "OPEN",
  OPEN: "FULL",
  FULL: "DEPARTED",
  DEPARTED: "IN_TRANSIT",
  IN_TRANSIT: "ARRIVED",
};

const VEHICLE_STATUS_MAP: Record<string, string> = {
  DEPARTED: "ACTIVE",
  IN_TRANSIT: "ACTIVE",
  ARRIVED: "ACTIVE",
};

const VEHICLE_BRANCH_MAP: Record<string, string> = {
  ARRIVED: "arrivalBranchId",
};

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
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, phone: true } },
        departureBranch: true,
        arrivalBranch: true,
        tickets: {
          orderBy: { seatNumber: "asc" },
          include: {
            issuedBy: { select: { id: true, name: true } },
          },
        },
        cargo: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({ trip });
  } catch (error) {
    console.error("Get trip error:", error);
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

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (body.status) {
      const expectedNext = STATUS_FLOW[trip.status];
      const canStart =
        body.status === "IN_TRANSIT" &&
        ["SCHEDULED", "OPEN", "FULL", "DEPARTED"].includes(trip.status);
      const canArrive =
        body.status === "ARRIVED" && ["DEPARTED", "IN_TRANSIT"].includes(trip.status);
      if (!canStart && !canArrive && expectedNext !== body.status) {
        return NextResponse.json(
          { error: `Cannot transition from ${trip.status} to ${body.status}. Expected: ${expectedNext}` },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = { status: body.status };

      if (body.status === "ARRIVED") {
        updateData.arrivalTime = new Date();
      }

      const vehicleUpdate: Record<string, unknown> = {};
      if (VEHICLE_STATUS_MAP[body.status]) {
        vehicleUpdate.status = VEHICLE_STATUS_MAP[body.status];
      }
      if (body.status === "ARRIVED") {
        vehicleUpdate.branchId = trip.arrivalBranchId;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedTrip = await tx.trip.update({
          where: { id },
          data: updateData,
        });

        if (Object.keys(vehicleUpdate).length > 0) {
          await tx.vehicle.update({
            where: { id: trip.vehicleId },
            data: vehicleUpdate,
          });
        }

        return updatedTrip;
      });

      return NextResponse.json({ trip: updated });
    }

    const updated = await prisma.trip.update({
      where: { id },
      data: {
        ...(body.vehicleId && { vehicleId: body.vehicleId }),
        ...(body.driverId && { driverId: body.driverId }),
        ...(body.departureBranchId && { departureBranchId: body.departureBranchId }),
        ...(body.arrivalBranchId && { arrivalBranchId: body.arrivalBranchId }),
        ...(body.departureTime && { departureTime: new Date(body.departureTime) }),
        ...(body.price !== undefined && { price: parseFloat(body.price) }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ trip: updated });
  } catch (error) {
    console.error("Update trip error:", error);
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
    await prisma.trip.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
