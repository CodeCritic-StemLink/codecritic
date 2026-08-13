import { Router } from "express";

import { submissionController } from "../controllers/submission.controller";
import { reviewController } from "../controllers/review.controller";
import { catchAsync } from "../utils/catchAsync";
import { writeLimiter } from "../middlewares/rateLimiter.middleware";

// Routes map a path to a controller and nothing more.

export const submissionRoutes = Router();

/** The feed. Readable logged out, reordered when signed in. This is Feature 01. */
submissionRoutes.get("/", catchAsync(submissionController.getFeed));

/** One request in full, with criteria, reviews and ratings. Readable logged out. */
submissionRoutes.get("/:id", catchAsync(submissionController.getById));

/** Write a review. Auth required. This is the endpoint that awards Karma. */
submissionRoutes.post(
  "/:id/reviews",
  writeLimiter,
  catchAsync(reviewController.create)
);

// ---------------------------------------------------------------------------
// Aaysha owns the rest of this file:
//
//   POST   /               post a review request, with all five validation rules
//
// Put the rules in services/, the queries in repositories/, the zod schemas in
// models/. Use writeLimiter from middlewares/rateLimiter.middleware.ts.
// ---------------------------------------------------------------------------