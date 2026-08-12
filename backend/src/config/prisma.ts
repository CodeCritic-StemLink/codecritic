import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add it to backend/.env.");
}

// Prisma 7 does not connect to the database itself. It hands the work to a standard
// Node PostgreSQL driver through this adapter.
const adapter = new PrismaPg({ connectionString });

// One shared client for the whole application.
//
// Every PrismaClient opens its own pool of database connections. Creating a new one
// inside each request would open a new pool every time, and the database would start
// refusing connections within minutes.
//
// Only files in src/repositories should import this. See docs/architecture.md.
export const prisma = new PrismaClient({ adapter });
