import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.setting.findMany();
    const settingsObj = Object.fromEntries(
      settings.map((s: { key: string; value: string }) => [s.key, s.value])
    );

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates = await req.json();

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Request body must be an object of key-value pairs" },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    const settingsObj = Object.fromEntries(
      results.map((s: { key: string; value: string }) => [s.key, s.value])
    );

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
