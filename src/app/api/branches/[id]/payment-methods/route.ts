import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { paymentMethodConfigIds } = await req.json();

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const ids: string[] = Array.isArray(paymentMethodConfigIds)
      ? paymentMethodConfigIds
      : [];

    const methods = await prisma.paymentMethodConfig.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const validIds = methods.map((m) => m.id);

    await prisma.$transaction(async (tx) => {
      await tx.branchPaymentMethod.deleteMany({ where: { branchId: id } });
      if (validIds.length > 0) {
        await tx.branchPaymentMethod.createMany({
          data: validIds.map((methodId) => ({
            branchId: id,
            paymentMethodConfigId: methodId,
            active: true,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true, paymentMethodConfigIds: validIds });
  } catch (error) {
    console.error("Update branch payment methods error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}