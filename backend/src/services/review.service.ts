import { submissionRepository } from "../repositories/submission.repository";
import { reviewRepository } from "../repositories/review.repository";
import type { ReviewWithRatings } from "../repositories/review.repository";
import { validateReviewFields } from "../models/review.schema";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../errors/appError";
import type { User } from "../generated/prisma/client";

// The rules for writing a review. This is the endpoint that awards Karma, so it is the
// one most worth attacking and the one that needs the most care.
//
// Steps 1 to 3 need the database and live here. Steps 4 to 8 are about the body
// alone and live in models/review.schema.ts, which imports nothing that touches a
// database, so tests/services/review.service.test.ts can call it with no
// DATABASE_URL set.

export const reviewService = {
  async createReview(
    reviewer: User,
    submissionId: string,
    body: unknown
  ): Promise<{ review: ReviewWithRatings; karma: number }> {
    // Step 1: the submission exists.
    const submission = await submissionRepository.findById(submissionId);

    if (!submission) {
      throw new NotFoundError("No submission has that id.", "SUBMISSION_NOT_FOUND");
    }

    // Step 2: the reviewer did not write this submission.
    if (submission.authorId === reviewer.id) {
      throw new ForbiddenError(
        "You cannot review your own submission.",
        "SELF_REVIEW_FORBIDDEN"
      );
    }

    // Step 3: the reviewer has not already reviewed this one.
    const alreadyReviewed = await reviewRepository.existsForReviewer(submissionId, reviewer.id);

    if (alreadyReviewed) {
      throw new ConflictError("You have already reviewed this submission.", "DUPLICATE_REVIEW");
    }

    const validated = validateReviewFields(body, submission.criteria);

    return reviewRepository.createWithRatingsAndKarma({
      submissionId,
      reviewerId: reviewer.id,
      ...validated,
    });
  },
};
