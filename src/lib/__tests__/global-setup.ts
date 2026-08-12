import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve(__dirname, "../../../prisma/test.db");

export default function setup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = dbPath + suffix;
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, "../../.."),
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "inherit",
  });
}
