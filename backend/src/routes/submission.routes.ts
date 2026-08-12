import { Router } from "express";

import { submissionController } from "../controllers/submission.controller";
import { catchAsync } from "../utils/catchAsync";

// Routes map a path to a controller and nothing more.

export const submissionRoutes = Router();

/** The feed. Readable logged out, reordered when signed in. This is Feature 01. */
submissionRoutes.get("/", catchAsync(submissionController.getFeed));

// ---------------------------------------------------------------------------
// Andrew owns the rest of this file:
//
//   GET    /:id            one request in full, with criteria, reviews and ratings
//   POST   /               post a review request, with all five validation rules
//   POST   /:id/reviews    write a review, the Karma transaction
//
// Put the rules in services/, the queries in repositories/, the zod schemas in
// models/. Use writeLimiter from middlewares/rateLimiter.middleware.ts on the two
// POST routes. Wrap every handler in catchAsync.
// ---------------------------------------------------------------------------
