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
    const cargo = await prisma.cargo.findUnique({
      where: { id },
      include: {
        senderBranch: true,
        receiverBranch: true,
        trip: {
          include: {
            vehicle: true,
            driver: { select: { id: true, name: true, phone: true } },
            departureBranch: true,
            arrivalBranch: true,
          },
        },
      },
    });

    if (!cargo) {
      return NextResponse.json({ error: "Cargo not found" }, { status: 404 });
    }

    return NextResponse.json({ cargo });
  } catch (error) {
    console.error("Get cargo error:", error);
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

    const STATUS_FLOW: Record<string, string> = {
      PENDING: "IN_TRANSIT",
      IN_TRANSIT: "ARRIVED",
      ARRIVED: "DELIVERED",
    };

    const CANCEL_FROM: Record<string, boolean> = {
      PENDING: true,
      IN_TRANSIT: true,
    };

    if (body.status) {
      const cargo = await prisma.cargo.findUnique({ where: { id } });
      if (!cargo) {
        return NextResponse.json({ error: "Cargo not found" }, { status: 404 });
      }

      if (body.status === "CANCELLED") {
        if (!CANCEL_FROM[cargo.status]) {
          return NextResponse.json(
            { error: `Cannot cancel cargo in ${cargo.status} status` },
            { status: 400 }
          );
        }
      } else {
        const expectedNext = STATUS_FLOW[cargo.status];
        if (expectedNext !== body.status) {
          return NextResponse.json(
            { error: `Cannot transition from ${cargo.status} to ${body.status}. Expected: ${expectedNext}` },
            { status: 400 }
          );
        }
      }

      const updateData: Record<string, unknown> = { status: body.status };
      if (body.status === "DELIVERED") {
        updateData.deliveredAt = new Date();
        updateData.deliveredById = session.userId;
      }
      if (body.tripId !== undefined) {
        updateData.tripId = body.tripId;
      }

      const updated = await prisma.cargo.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ cargo: updated });
    }

    const updated = await prisma.cargo.update({
      where: { id },
      data: {
        ...(body.description && { description: body.description }),
        ...(body.weight && { weight: parseFloat(body.weight) }),
        ...(body.packageType && { packageType: body.packageType }),
        ...(body.tripId !== undefined && { tripId: body.tripId }),
        ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ cargo: updated });
  } catch (error) {
    console.error("Update cargo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
