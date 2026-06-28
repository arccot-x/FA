import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@frictionless.finance" },
    update: {},
    create: {
      email: "demo@frictionless.finance",
      name: "Demo User",
      defaultMonthlyIncome: 4200,
      paydayDay: 1,
      variableIncomeEnabled: true
    }
  });

  const bills = [
    { name: "Rent", category: "HOME", defaultAmount: 1600, dueDay: 1, icon: "home-city" },
    { name: "Netflix", category: "SUBSCRIPTION", defaultAmount: 15.49, dueDay: 12, icon: "television-classic" },
    { name: "Car Insurance", category: "TRANSPORT", defaultAmount: 148.2, dueDay: 18, icon: "car" }
  ] as const;

  for (const bill of bills) {
    const existing = await prisma.billTemplate.findFirst({
      where: { userId: user.id, name: bill.name }
    });

    if (!existing) {
      await prisma.billTemplate.create({
        data: {
          userId: user.id,
          name: bill.name,
          category: bill.category,
          defaultAmount: bill.defaultAmount,
          dueDay: bill.dueDay,
          icon: bill.icon
        }
      });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
