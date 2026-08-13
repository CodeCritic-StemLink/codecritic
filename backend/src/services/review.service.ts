import { submissionRepository } from "../repositories/submission.repository";
import { reviewRepository } from "../repositories/review.repository";
import type { ReviewWithRatings } from "../repositories/review.repository";
import {
  BadRequestError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../errors/appError";
import type { User } from "../generated/prisma/client";

// The rules for writing a review. This is the endpoint that awards Karma, so it is the
// one most worth attacking and the one that needs the most care.
//
// The checks run in the exact order docs/api-design.md lists them in:
//
//   1. submission exists           404 SUBMISSION_NOT_FOUND
//   2. not reviewing your own work 403 SELF_REVIEW_FORBIDDEN
//   3. not reviewing it twice      409 DUPLICATE_REVIEW
//   4. strengths                   400 INVALID_STRENGTHS
//   5. improvements                400 INVALID_IMPROVEMENTS
//   6. resources                   400 INVALID_RESOURCES
//   7. ratings cover the criteria  400 INCOMPLETE_RATINGS
//   8. every score 1 to 10         400 INVALID_SCORE
//
// Steps 1 to 3 need the database and live in createReview below. Steps 4 to 8 are
// about the body alone, so they live in the pure function validateReviewFields, which
// takes plain values and throws or returns plain values — no prisma, no req, no res.
// That is what lets tests/services/review.service.test.ts exercise every one of these
// error codes with no database, the same trick ranking.service.ts already uses.

const MAX_TEXT_LENGTH = 5000;
const MAX_RESOURCES = 5;

export type CriterionRef = { id: string };

export type ValidatedReview = {
  strengths: string;
  improvements: string;
  resources: string[];
  ratings: { criterionId: string; score: number }[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Steps 4 to 8. See the file comment above for why this is pure. */
export function validateReviewFields(body: unknown, criteria: CriterionRef[]): ValidatedReview {
  const input = (body ?? {}) as Record<string, unknown>;

  // Step 4: strengths.
  if (!isNonEmptyString(input.strengths) || input.strengths.length > MAX_TEXT_LENGTH) {
    throw new BadRequestError(
      "Strengths must be present, not empty, and at most 5000 characters.",
      "INVALID_STRENGTHS"
    );
  }

  // Step 5: improvements.
  if (!isNonEmptyString(input.improvements) || input.improvements.length > MAX_TEXT_LENGTH) {
    throw new BadRequestError(
      "Improvements must be present, not empty, and at most 5000 characters.",
      "INVALID_IMPROVEMENTS"
    );
  }

  // Step 6: resources, optional, at most 5, every one a valid URL.
  const resourcesRaw = input.resources ?? [];

  if (
    !Array.isArray(resourcesRaw) ||
    resourcesRaw.length > MAX_RESOURCES ||
    !resourcesRaw.every(isValidUrl)
  ) {
    throw new BadRequestError(
      "Resources must be an array of valid URLs, at most 5.",
      "INVALID_RESOURCES"
    );
  }

  // Step 7: ratings cover exactly this submission's criteria, no extras, no duplicates.
  const ratingsRaw = input.ratings;

  if (!Array.isArray(ratingsRaw)) {
    throw new BadRequestError(
      "Ratings must cover every criterion on the submission.",
      "INCOMPLETE_RATINGS"
    );
  }

  const criterionIds = new Set(criteria.map((c) => c.id));
  const seen = new Set<string>();
  const ratings: { criterionId: string; score: unknown }[] = [];

  for (const entry of ratingsRaw) {
    const rating = (entry ?? {}) as { criterionId?: unknown; score?: unknown };
    const criterionId = rating.criterionId;

    if (
      typeof criterionId !== "string" ||
      !criterionIds.has(criterionId) ||
      seen.has(criterionId)
    ) {
      throw new BadRequestError(
        "Ratings must cover every criterion on the submission, no extras, no duplicates.",
        "INCOMPLETE_RATINGS"
      );
    }

    seen.add(criterionId);
    ratings.push({ criterionId, score: rating.score });
  }

  if (seen.size !== criterionIds.size) {
    throw new BadRequestError(
      "Every criterion on the submission must get a score.",
      "INCOMPLETE_RATINGS"
    );
  }

  // Step 8: every score is a whole number from 1 to 10.
  for (const rating of ratings) {
    if (
      typeof rating.score !== "number" ||
      !Number.isInteger(rating.score) ||
      rating.score < 1 ||
      rating.score > 10
    ) {
      throw new BadRequestError(
        "Every score must be a whole number from 1 to 10.",
        "INVALID_SCORE"
      );
    }
  }

  return {
    strengths: input.strengths.trim(),
    improvements: input.improvements.trim(),
    resources: resourcesRaw as string[],
    ratings: ratings as { criterionId: string; score: number }[],
  };
}

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