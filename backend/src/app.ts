import "dotenv/config";

import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import { userRoutes } from "./routes/user.routes";
import { submissionRoutes } from "./routes/submission.routes";
import { morganMiddleware } from "./middlewares/morgan.middleware";
import { globalLimiter } from "./middlewares/rateLimiter.middleware";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";

// Builds the express application and returns it, without starting a server.
//
// Keeping the listening part in server.ts means a test can import this app and make
// requests against it without opening a real port.

export const app = express();

// Behind Render and most hosts there is a proxy in front of us. Without this, every
// request looks like it came from the proxy, so rate limiting would count the whole
// internet as one visitor.
app.set("trust proxy", 1);

// Log every request. Morgan watches, winston writes.
app.use(morganMiddleware);

// Cap how many requests one address may make.
app.use(globalLimiter);

// Let the front end call us. A browser blocks a page on port 3000 from calling port
// 4000 unless this server says it is allowed.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

// Turns a JSON request body into req.body.
app.use(express.json());

// Reads the Clerk token when there is one and works out who is asking. It does not
// block anything on its own, which is deliberate: the SRS requires the public feed to
// be readable while logged out. Routes that need a signed in user check for themselves.
app.use(
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  })
);

// Proves the server is alive without touching the database, so when something breaks we
// can tell "the server is down" apart from "the database is down".
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "codecritic-api" });
});

app.use("/api/users", userRoutes);
app.use("/api/submissions", submissionRoutes);

// Nothing matched.
app.use(notFoundMiddleware);

// Every error in the application ends here. Must be last.
app.use(errorMiddleware);
