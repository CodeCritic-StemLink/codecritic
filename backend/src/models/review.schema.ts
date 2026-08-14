import { BadRequestError } from "../errors/appError";

// Pure validation for a review body. No prisma, no req, no res — takes plain values,
// returns plain values or throws. This has to be a hand-written function rather than
// a single Zod schema because the API contract requires the checks to fail in a
// strict order (see docs/api-design.md), and a database-backed check like "does this
// criterion belong to this submission" cannot live inside a Zod schema at all.
//
// Living in models/ rather than services/ matches the rule in docs/architecture.md
// that a file in models/ may import nothing but zod-adjacent helpers — this file
// imports only the error type, nothing that touches a database — which is what makes
// it safely importable from a test with no DATABASE_URL set.

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

/**
 * Steps 4 to 8 of the review validation in docs/api-design.md. Steps 1 to 3
 * (submission exists, not the author, not a duplicate) need the database and stay
 * in review.service.ts.
 */
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