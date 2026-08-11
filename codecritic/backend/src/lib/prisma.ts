import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Copy .env.example to .env and fill it in.");
}

// The adapter is the actual PostgreSQL driver. Prisma 7 does not connect to the
// database itself, it hands the work to a standard Node driver through this.
const adapter = new PrismaPg({ connectionString });

// One shared Prisma client for the whole application.
//
// Why a single shared one: every PrismaClient opens its own pool of connections to
// the database. Creating a new one inside each route would open a new pool on every
// request, and the database would refuse connections within minutes.
export const prisma = new PrismaClient({ adapter });
