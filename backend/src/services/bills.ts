import { BillStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { dueDateFor } from "../utils/month";

export async function ensureMonthlyBillOccurrences(userId: string, cycleMonth: Date) {
  const templates = await prisma.billTemplate.findMany({
    where: { userId, active: true }
  });

  for (const template of templates) {
    await prisma.billOccurrence.upsert({
      where: {
        billTemplateId_cycleMonth: {
          billTemplateId: template.id,
          cycleMonth
        }
      },
      update: {
        dueDate: dueDateFor(cycleMonth, template.dueDay)
      },
      create: {
        userId,
        billTemplateId: template.id,
        cycleMonth,
        dueDate: dueDateFor(cycleMonth, template.dueDay),
        amount: template.defaultAmount
      }
    });
  }
}

export async function getBillsForMonth(userId: string, cycleMonth: Date) {
  await ensureMonthlyBillOccurrences(userId, cycleMonth);

  const occurrences = await prisma.billOccurrence.findMany({
    where: { userId, cycleMonth },
    include: { billTemplate: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }]
  });

  const unpaid = occurrences
    .filter((bill) => bill.status === BillStatus.UNPAID)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const settled = occurrences
    .filter((bill) => bill.status !== BillStatus.UNPAID)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return { unpaid, settled };
}

export function decimalToNumber(value: Prisma.Decimal | number | null) {
  if (value === null) {
    return null;
  }

  return Number(value);
}

