// Feature 02: turning raw review rows into the two "reviews I have written / received"
// lists on a profile.
//
// Pulled out of user.service.ts for the same reason ranking.service.ts and
// insights.service.ts stand alone: pure mapping, no Prisma import, so it can be
// tested with no database. See tests/services/reviewList.service.test.ts.

/** One score, with the criterion it was scored against, inside a review list item. */
export type RatingItem = { criterionId: string; label: string; score: number };

/** One review this person wrote, in the "reviews I have written" list. */
export type ReviewGivenItem = {
  id: string;
  strengths: string;
  improvements: string;
  resources: string[];
  createdAt: Date;
  submission: { id: string; title: string };
  ratings: RatingItem[];
};

/** One review written on this person's own work, in the "reviews I have received" list. */
export type ReviewReceivedItem = ReviewGivenItem & {
  reviewer: { username: string };
};

/**
 * The fields every raw review row has, regardless of whether it came from the
 * "given" query or the "received" query. Typed loosely on purpose: both
 * ReviewGivenForInsights and ReviewReceived in user.repository.ts carry more fields
 * than this (tags, a reviewer), and TypeScript allows a wider object wherever this
 * narrower shape is asked for.
 */
export type ReviewListCore = {
  id: string;
  strengths: string;
  improvements: string;
  resources: string[];
  createdAt: Date;
  submission: { id: string; title: string };
  ratings: Array<{ score: number; criterion: { id: string; label: string } }>;
};

export function toRatingItems(
  ratings: Array<{ score: number; criterion: { id: string; label: string } }>
): RatingItem[] {
  return ratings.map((rating) => ({
    criterionId: rating.criterion.id,
    label: rating.criterion.label,
    score: rating.score,
  }));
}

export function toReviewGivenItem(review: ReviewListCore): ReviewGivenItem {
  return {
    id: review.id,
    strengths: review.strengths,
    improvements: review.improvements,
    resources: review.resources,
    createdAt: review.createdAt,
    submission: { id: review.submission.id, title: review.submission.title },
    ratings: toRatingItems(review.ratings),
  };
}

export function toReviewReceivedItem(
  review: ReviewListCore & { reviewer: { username: string } }
): ReviewReceivedItem {
  return {
    ...toReviewGivenItem(review),
    reviewer: { username: review.reviewer.username },
  };
}
