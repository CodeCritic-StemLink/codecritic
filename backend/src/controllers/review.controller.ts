import type { Request, Response } from "express";

import { reviewService } from "../services/review.service";
import { requireUser } from "../middlewares/auth.middleware";

// Controllers unpack the request, validate it, call a service, send the response.
// No database calls and no rules here. See docs/architecture.md.

export const reviewController = {
  /**
   * POST /api/submissions/:id/reviews
   *
   * Auth required. requireUser throws 401 with no token, and 404 USER_NOT_FOUND if the
   * Clerk identity has never called POST /users/sync. Everything else is
   * reviewService.createReview's job.
   */
  async create(req: Request, res: Response) {
    const reviewer = await requireUser(req);
    const { review, karma } = await reviewService.createReview(reviewer, req.params.id, req.body);

    // The new Karma total comes back with the review, so the UI can update the number
    // in the navigation bar without a second request.
    res.status(201).json({
      review: {
        id: review.id,
        strengths: review.strengths,
        improvements: review.improvements,
        resources: review.resources,
        createdAt: review.createdAt,
        reviewer: review.reviewer,
        ratings: review.ratings,
      },
      karma,
    });
  },
};