import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "1";

    const configs = await prisma.paymentMethodConfig.findMany({
      where: showAll ? {} : { active: true },
      orderBy: { sortOrder: "asc" },
    });

    let list = configs.map((c) => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      logo: c.logo,
      isCredit: c.isCredit,
      active: c.active,
      sortOrder: c.sortOrder,
    }));

    // Branch users only see methods assigned to their branch
    if (session.role !== "OWNER" && session.branchId) {
      const assigned = await prisma.branchPaymentMethod.findMany({
        where: { branchId: session.branchId, active: true },
        select: { paymentMethodConfigId: true },
      });
      const allowed = new Set(assigned.map((a) => a.paymentMethodConfigId));
      list = list.filter((m) => allowed.has(m.id));
    }

    return NextResponse.json({ methods: list });
  } catch (error) {
    console.error("Get payment methods error:", error);
    return NextResponse.json({ methods: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, nameAr, logo, isCredit, sortOrder } = await req.json();
    if (!name || !nameAr) {
      return NextResponse.json(
        { error: "name and nameAr are required" },
        { status: 400 }
      );
    }

    const method = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentMethodConfig.create({
        data: {
          name,
          nameAr,
          logo: logo || null,
          isCredit: Boolean(isCredit),
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : 99,
        },
      });

      // Auto-assign new method to all active branches
      const branches = await tx.branch.findMany({ where: { active: true } });
      if (branches.length > 0) {
        await tx.branchPaymentMethod.createMany({
          data: branches.map((b) => ({
            branchId: b.id,
            paymentMethodConfigId: created.id,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    console.error("Create payment method error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}