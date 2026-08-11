// Loads the values from .env into process.env. This has to be the first import,
// before anything that reads a setting, or DATABASE_URL will not be there yet.
import "dotenv/config";

import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import { prisma } from "./lib/prisma";
import { usersRouter } from "./routes/users";
import { ApiError, sendError } from "./lib/errors";

// Stop now and say exactly what is missing, rather than letting every request fail
// later with a confusing 500. Clerk's middleware throws on every single request if
// its keys are absent, including the public feed, which is very hard to diagnose
// from the error alone.
const requiredEnv = ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error("Cannot start. These environment variables are missing:");
  for (const name of missingEnv) {
    console.error(`  ${name}`);
  }
  console.error("Add them to backend/.env. Ask Osini for the values.");
  process.exit(1);
}

const app = express();

const port = Number(process.env.PORT ?? 4000);

// Let the front end call us. Browsers block a page served from port 3000 from
// calling port 4000 unless this server says it is allowed.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

// Turns a JSON request body into req.body.
app.use(express.json());

// Reads the Clerk token from the Authorization header when there is one, and works
// out who is asking. It does NOT block anything on its own, which is deliberate: the
// SRS says the public feed must be readable while logged out. Routes that need a
// signed in user check for themselves.
app.use(
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  })
);

// Proves the server is alive without touching the database, so when something breaks
// we can tell the difference between "the server is down" and "the database is down".
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "codecritic-api" });
});

app.use("/api/users", usersRouter);

// The feed. Still the plain version. The ranking goes in here next.
app.get("/api/submissions", async (req, res, next) => {
  try {
    const submissions = await prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({ submissions });
  } catch (error) {
    next(error);
  }
});

// Anything that matched no route above.
app.use((req, res) => {
  sendError(res, 404, "NOT_FOUND", "That endpoint does not exist.");
});

// One place where every thrown error becomes a JSON response. Without this an
// unexpected error would send back an HTML stack trace, which tells an attacker
// about our file paths and tells the front end nothing useful.
app.use(
  (err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return sendError(res, err.status, err.code, err.message);
    }

    console.error("Unhandled error:", err);
    return sendError(res, 500, "INTERNAL_ERROR", "Something went wrong on our side.");
  }
);

app.listen(port, () => {
  console.log(`CodeCritic API listening on http://localhost:${port}/api`);
});
