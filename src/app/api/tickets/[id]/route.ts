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
    const ticket = await prisma.ticket.findUnique({
      where: { id },
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
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
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

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id },
        data: { status: "CANCELLED" },
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
    console.error("Delete ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
