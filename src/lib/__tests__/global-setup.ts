import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve(__dirname, "../../../prisma/test.db");

export default function setup() {
  // SQLite can leave -journal/-wal/-shm sidecar files alongside the main
  // .db file; removing only the .db would leave stale write-ahead data that
  // could resurrect rows resetDb() thinks it already cleared.
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = dbPath + suffix;
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  // --accept-data-loss is safe here specifically because this is a
  // throwaway file at prisma/test.db, never the dev/prod database.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, "../../.."),
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "inherit",
  });
}
