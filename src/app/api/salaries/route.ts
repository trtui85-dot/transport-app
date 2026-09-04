import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salaries = await prisma.salary.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ salaries });
  } catch (error) {
    console.error("Get salaries error:", error);
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

    const { month } = await req.json();

    if (!month) {
      return NextResponse.json(
        { error: "month (YYYY-MM) is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.salary.findMany({
      where: { month },
    });

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Salaries already generated for this month" },
        { status: 400 }
      );
    }

    const [yearStr, monthStr] = month.split("-");
    const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    const endDate = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59);

    const users = await prisma.user.findMany({
      where: { active: true },
      include: {
        advances: { where: { settledAt: null } },
      },
    });

    const salaries = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const user of users) {
        const deduction = user.advances.reduce((s, a) => s + a.amount, 0);

        if (user.role === "DRIVER" && user.commissionPerTrip > 0) {
          const tripCount = await tx.trip.count({
            where: {
              driverId: user.id,
              status: "ARRIVED",
              arrivalTime: {
                gte: startDate,
                lte: endDate,
              },
            },
          });
          const commission = tripCount * user.commissionPerTrip;
          const total = user.baseSalary + commission;
          const due = total - deduction;

          const salary = await tx.salary.create({
            data: {
              userId: user.id,
              month,
              base: user.baseSalary,
              commission,
              total,
              deduction,
              due,
              status: "PENDING",
            },
          });
          created.push(salary);
        } else {
          const total = user.baseSalary;
          const due = total - deduction;
          const salary = await tx.salary.create({
            data: {
              userId: user.id,
              month,
              base: user.baseSalary,
              commission: 0,
              total,
              deduction,
              due,
              status: "PENDING",
            },
          });
          created.push(salary);
        }
      }

      return created;
    });

    return NextResponse.json({ salaries }, { status: 201 });
  } catch (error) {
    console.error("Generate salaries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
