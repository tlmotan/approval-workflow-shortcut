import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const employees = [
  { name: "Ahmad Zaki", role: "Manager" },
  { name: "Sarah Lim", role: "Finance" },
  { name: "Priya Nair", role: "Director" },
  { name: "Wei Ming", role: "Employee" },
];

async function main() {
  await prisma.approvalRecord.deleteMany();
  await prisma.expenseClaim.deleteMany();
  await prisma.employee.deleteMany();

  await prisma.employee.createMany({ data: employees });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
