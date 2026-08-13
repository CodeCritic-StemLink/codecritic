import { Router } from "express";

import { submissionController } from "../controllers/submission.controller";
import { catchAsync } from "../utils/catchAsync";
import { writeLimiter } from "../middlewares/rateLimiter.middleware";

// Routes map a path to a controller and nothing more.

export const submissionRoutes = Router();

/** The feed. Readable logged out, reordered when signed in. This is Feature 01. */
submissionRoutes.get("/", catchAsync(submissionController.getFeed));

/** Post a review request. All five validation rules live in the schema, not here. */
submissionRoutes.post("/", writeLimiter, catchAsync(submissionController.create));

// ---------------------------------------------------------------------------
// Andrew owns the rest of this file:
//
//   GET    /:id            one request in full, with criteria, reviews and ratings
//   POST   /:id/reviews    write a review, the Karma transaction
//
// Put the rules in services/, the queries in repositories/, the zod schemas in
// models/. Use writeLimiter from middlewares/rateLimiter.middleware.ts on the POST
// route. Wrap every handler in catchAsync.
// ---------------------------------------------------------------------------