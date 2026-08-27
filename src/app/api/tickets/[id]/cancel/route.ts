import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const VALID_REASONS = ["TEST", "PASSENGER_DISSATISFIED", "OTHER"] as const;
type CancelReason = (typeof VALID_REASONS)[number];

export async function POST(
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
    const reason = body?.reason as CancelReason;

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid cancel reason" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        trip: {
          include: { vehicle: true, tickets: { where: { status: "CONFIRMED" } } },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "CANCELLED") {
      return NextResponse.json({ error: "Ticket already cancelled" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id },
        data: { status: "CANCELLED", cancelReason: reason },
      });

      if (ticket.trip.status === "FULL") {
        const confirmedCount = ticket.trip.tickets.filter(
          (t: { id: string }) => t.id !== id
        ).length;
        if (confirmedCount < ticket.trip.vehicle.seatCount) {
          await tx.trip.update({
            where: { id: ticket.tripId },
            data: { status: "OPEN" },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Cancel ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}