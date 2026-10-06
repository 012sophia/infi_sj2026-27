// Prisma 7 — zentrale CLI-Konfiguration.
// Ersetzt die früheren CLI-Flags --schema/--url; die Verbindungs-URL steht hier
// (aus der .env), nicht im Schema.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
