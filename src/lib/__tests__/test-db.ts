import { PrismaClient } from "@prisma/client";
import path from "node:path";

export const TEST_DB_PATH = path.resolve(__dirname, "../../../prisma/test.db");
export const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

export function createTestClient() {
  return new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
}

export const SEED_EMPLOYEES = [
  { name: "Ahmad Zaki", role: "Manager" },
  { name: "Sarah Lim", role: "Finance" },
  { name: "Priya Nair", role: "Director" },
  { name: "Wei Ming", role: "Employee" },
] as const;

export async function resetDb(client: PrismaClient) {
  await client.approvalRecord.deleteMany();
  await client.expenseClaim.deleteMany();
  await client.employee.deleteMany();
  await client.employee.createMany({ data: [...SEED_EMPLOYEES] });
}

export async function employeeByRole(client: PrismaClient, role: string) {
  return client.employee.findFirstOrThrow({ where: { role } });
}
