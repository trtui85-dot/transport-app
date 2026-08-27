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
        : { id: session.branchId || "" };

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    console.error("Get branches error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, city, address, phone } = await req.json();

    if (!name || !city) {
      return NextResponse.json(
        { error: "Name and city are required" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.create({
      data: { name, city, address, phone },
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    console.error("Create branch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
