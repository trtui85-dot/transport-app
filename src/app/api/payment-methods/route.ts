import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DEFAULT_METHODS = [
  {
    id: "CASH",
    name: "Cash",
    nameAr: "نقدي",
    icon: "💵",
    color: "#16a34a",
    enumKey: "CASH",
    sortOrder: 1,
  },
  {
    id: "DEBT",
    name: "Crédit",
    nameAr: "آجل",
    icon: "💳",
    color: "#f59e0b",
    enumKey: "DEBT",
    sortOrder: 2,
  },
  {
    id: "WALLET",
    name: "Portefeuille",
    nameAr: "محفظة إلكترونية",
    icon: "📱",
    color: "#146574",
    enumKey: "WALLET",
    sortOrder: 3,
  },
];

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await prisma.paymentMethodConfig.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });

    if (configs.length === 0) {
      return NextResponse.json({ methods: DEFAULT_METHODS });
    }

    const methods = configs.map((c) => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      icon: c.icon || "💰",
      color: c.color || "#146574",
    }));

    return NextResponse.json({ methods });
  } catch (error) {
    console.error("Get payment methods error:", error);
    // Fallback so the ticket page always works
    return NextResponse.json({ methods: DEFAULT_METHODS });
  }
}
