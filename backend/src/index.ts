// Loads the values from .env into process.env. This has to be the first import,
// before anything that reads a setting, or DATABASE_URL will not be there yet.
import "dotenv/config";

import express from "express";
import { prisma } from "./lib/prisma";

// Create the application. This object collects all the routes and settings,
// and knows how to answer incoming requests.
const app = express();

const port = 4000;

// A route is a pairing of two things: a method and a path.
// This one answers a GET request for /api/health.
// It exists so we can check the server is alive without touching the database.
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "codecritic-api" });
});

// The feed. Right now it only proves we can reach the database.
// The ranking and the filters come later.
app.get("/api/submissions", async (req, res) => {
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({ submissions });
});

// Start listening. Until this line runs, nothing is reachable.
app.listen(port, () => {
  console.log(`CodeCritic API listening on http://localhost:${port}/api`);
});
