import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pin = await bcrypt.hash("1234", 10);
  // Branches
  const b1 = await prisma.branch.create({ data: { name: "الفرع الرئيسي", city: "نواكشوط", address: "شارع المرسلات", phone: "43227748" } });
  const b2 = await prisma.branch.create({ data: { name: "فرعlinky", city: "نواذيبو", address: "شارع الميناء", phone: "44556677" } });
  const b3 = await prisma.branch.create({ data: { name: "فرع روصو", city: "روصو", address: "وسط المدينة", phone: "45667788" } });

  // Users
  const owner = await prisma.user.create({ data: { name: "المالك", phone: "36445523", pin, role: "OWNER", baseSalary: 0, commissionPerTrip: 0 } });
  const agent1 = await prisma.user.create({ data: { name: "أحمد التذاكر", phone: "43227748", pin, role: "TICKET_AGENT", branchId: b1.id, baseSalary: 50000, commissionPerTrip: 200 } });
  const agent2 = await prisma.user.create({ data: { name: "محمد الشحن", phone: "12345678", pin, role: "CARGO_AGENT", branchId: b1.id, baseSalary: 45000, commissionPerTrip: 100 } });
  const driver1 = await prisma.user.create({ data: { name: "علي السائق", phone: "55667788", pin, role: "DRIVER", branchId: b1.id, baseSalary: 80000, commissionPerTrip: 5000 } });
  const driver2 = await prisma.user.create({ data: { name: "حسن السائق", phone: "66778899", pin, role: "DRIVER", branchId: b2.id, baseSalary: 75000, commissionPerTrip: 4500 } });
  const mgr1 = await prisma.user.create({ data: { name: "-manager branch1", phone: "77889900", pin, role: "BRANCH_MANAGER", branchId: b1.id, baseSalary: 70000 } });

  // Vehicles
  const v1 = await prisma.vehicle.create({ data: { type: "Hino", plateNumber: "NK-1234", seatCount: 40, branchId: b1.id, status: "ACTIVE" } });
  const v2 = await prisma.vehicle.create({ data: { type: "Mercedes", plateNumber: "NK-5678", seatCount: 30, branchId: b1.id, status: "ACTIVE" } });
  const v3 = await prisma.vehicle.create({ data: { type: "Toyota Coaster", plateNumber: "NDB-1111", seatCount: 25, branchId: b2.id, status: "ACTIVE" } });
  const v4 = await prisma.vehicle.create({ data: { type: "Hilux", plateNumber: "NK-9999", seatCount: 5, branchId: b1.id, status: "MAINTENANCE" } });

  // Trips
  const now = new Date();
  const t1 = await prisma.trip.create({
    data: { vehicleId: v1.id, driverId: driver1.id, departureBranchId: b1.id, arrivalBranchId: b2.id, departureTime: new Date(now.getTime() + 3600000), price: 3000, status: "OPEN" },
  });
  const t2 = await prisma.trip.create({
    data: { vehicleId: v2.id, driverId: driver1.id, departureBranchId: b1.id, arrivalBranchId: b3.id, departureTime: new Date(now.getTime() + 7200000), price: 4500, status: "SCHEDULED" },
  });
  const t3 = await prisma.trip.create({
    data: { vehicleId: v3.id, driverId: driver2.id, departureBranchId: b2.id, arrivalBranchId: b1.id, departureTime: new Date(now.getTime() - 3600000), price: 3000, status: "ARRIVED" },
  });

  // Tickets
  await prisma.ticket.create({ data: { tripId: t1.id, seatNumber: 1, passengerName: "محمد ولد بابا", passengerPhone: "44112233", paymentMethod: "CASH", amount: 3000, branchId: b1.id, issuedById: agent1.id } });
  await prisma.ticket.create({ data: { tripId: t1.id, seatNumber: 2, passengerName: "فاطمة بنت أحمد", passengerPhone: "44223344", paymentMethod: "CASH", amount: 3000, branchId: b1.id, issuedById: agent1.id } });
  await prisma.ticket.create({ data: { tripId: t1.id, seatNumber: 5, passengerName: "عبدالله ولد علي", passengerPhone: "44334455", paymentMethod: "DEBT", amount: 3000, branchId: b1.id, issuedById: agent1.id } });
  await prisma.ticket.create({ data: { tripId: t3.id, seatNumber: 3, passengerName: "عائشة بنت محمد", passengerPhone: "55112233", paymentMethod: "CASH", amount: 3000, branchId: b2.id, issuedById: agent1.id } });

  // Expense Categories
  const ec1 = await prisma.expenseCategory.create({ data: { name: "وقود" } });
  const ec2 = await prisma.expenseCategory.create({ data: { name: "صيانة" } });
  const ec3 = await prisma.expenseCategory.create({ data: { name: "إيجار" } });
  const ec4 = await prisma.expenseCategory.create({ data: { name: "رواتب" } });

  // Expenses
  await prisma.expense.create({ data: { expenseCategoryId: ec1.id, amount: 50000, branchId: b1.id, description: " tanks أساسي الحافلة 1234", date: new Date() } });
  await prisma.expense.create({ data: { expenseCategoryId: ec2.id, amount: 15000, branchId: b1.id, description: "تبديل زنبركات", date: new Date() } });

  // Debts
  await prisma.debt.create({ data: { contactName: "_AGENT ولد بابا", contactPhone: "44112233", type: "RECEIVABLE", amount: 9000, paidAmount: 3000, status: "PARTIAL", branchId: b1.id } });
  await prisma.debt.create({ data: { contactName: " חברת المقاولات", contactPhone: "45556677", type: "PAYABLE", amount: 200000, status: "OPEN", branchId: b2.id } });

  // Salaries
  await prisma.salary.create({ data: { userId: agent1.id, month: "2026-08", base: 50000, commission: 600, total: 50600, status: "PAID", paidAt: new Date() } });
  await prisma.salary.create({ data: { userId: driver1.id, month: "2026-08", base: 80000, commission: 15000, total: 95000, status: "PENDING" } });

  // Settings
  await prisma.setting.create({ data: { key: "company_name", value: "شركة النقل البري" } });
  await prisma.setting.create({ data: { key: "company_phone", value: "43227748" } });

  console.log("Seed data created successfully!");
  console.log("Login credentials:");
  console.log("  Owner: 36445523 / 1234");
  console.log("  Agent: 43227748 / 1234");
  console.log("  Cargo: 12345678 / 1234");
  console.log("  Driver: 55667788 / 1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
