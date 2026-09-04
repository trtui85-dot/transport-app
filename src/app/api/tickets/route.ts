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

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        trip: {
          include: {
            vehicle: true,
            departureBranch: true,
            arrivalBranch: true,
          },
        },
        branch: true,
        issuedBy: { select: { id: true, name: true } },
        paymentMethodConfig: true,
      },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Get tickets error:", error);
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

    if (!["OWNER", "BRANCH_MANAGER", "TICKET_AGENT", "DRIVER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { tripId, seatNumber, passengerName, passengerPhone, paymentMethod, paymentMethodConfigId, amount } =
      await req.json();

    if (!tripId || !seatNumber || !passengerName || !passengerPhone || amount === undefined) {
      return NextResponse.json(
        { error: "tripId, seatNumber, passengerName, passengerPhone, and amount are required" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, tickets: { where: { status: "CONFIRMED" } } },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (session.role === "DRIVER" && trip.driverId !== session.userId) {
      return NextResponse.json({ error: "Forbidden: not your trip" }, { status: 403 });
    }

    const isDriverAdding = session.role === "DRIVER";
    if (!isDriverAdding && trip.status !== "OPEN" && trip.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Trip is not open for booking" },
        { status: 400 }
      );
    }
    if (isDriverAdding && !["OPEN", "SCHEDULED", "DEPARTED", "IN_TRANSIT"].includes(trip.status)) {
      return NextResponse.json(
        { error: "Trip is not active" },
        { status: 400 }
      );
    }

    const seatTaken = trip.tickets.some((t: { seatNumber: number }) => t.seatNumber === parseInt(seatNumber));
    if (seatTaken) {
      return NextResponse.json(
        { error: "Seat is already taken" },
        { status: 400 }
      );
    }

    if (parseInt(seatNumber) > trip.vehicle.seatCount) {
      return NextResponse.json(
        { error: "Seat number exceeds vehicle capacity" },
        { status: 400 }
      );
    }

    const ticket = await prisma.$transaction(async (tx) => {
      let config: { id: string; isCredit: boolean } | null = null;
      if (paymentMethodConfigId) {
        config = await tx.paymentMethodConfig.findUnique({
          where: { id: paymentMethodConfigId },
          select: { id: true, isCredit: true },
        });
        if (!config || !config.id) {
          throw new Error("Invalid payment method");
        }
      }

      const newTicket = await tx.ticket.create({
        data: {
          tripId,
          seatNumber: parseInt(seatNumber),
          passengerName,
          passengerPhone,
          paymentMethod: paymentMethod || "CASH",
          paymentMethodConfigId: config ? config.id : null,
          amount: parseFloat(amount),
          status: "CONFIRMED",
          paid: config ? !config.isCredit : true,
          paidAt: config && !config.isCredit ? new Date() : null,
          branchId: session.branchId,
          issuedById: session.userId,
        },
        include: {
          paymentMethodConfig: true,
        },
      });

      const confirmedCount = trip.tickets.length + 1;
      if (confirmedCount >= trip.vehicle.seatCount && trip.status === "OPEN") {
        await tx.trip.update({
          where: { id: tripId },
          data: { status: "FULL" },
        });
      }

      return newTicket;
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Create ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
