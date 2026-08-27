import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cargo = await prisma.cargo.findUnique({
      where: { trackingCode: code },
      select: {
        trackingCode: true,
        description: true,
        senderName: true,
        receiverName: true,
        status: true,
        createdAt: true,
        deliveredAt: true,
        senderBranch: { select: { name: true, city: true } },
        receiverBranch: { select: { name: true, city: true } },
      },
    });

    if (!cargo) {
      return NextResponse.json(
        { error: "Cargo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ cargo });
  } catch (error) {
    console.error("Track cargo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
