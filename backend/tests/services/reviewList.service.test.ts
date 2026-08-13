// Tests for the Feature 02 "reviews I have written / received" list mapping.
//
// Run with:  npm test
//
// toReviewGivenItem and toReviewReceivedItem are pure mapping, no Prisma and no
// database, the same reason ranking.service.ts and insights.service.ts stand alone.

import {
  toRatingItems,
  toReviewGivenItem,
  toReviewReceivedItem,
} from "../../src/services/reviewList.service";
import type { ReviewListCore } from "../../src/services/reviewList.service";

function baseReview(overrides: Partial<ReviewListCore> = {}): ReviewListCore {
  return {
    id: "review-1",
    strengths: "Clear naming throughout.",
    improvements: "Add tests for the edge cases.",
    resources: [],
    createdAt: new Date("2026-08-11T10:00:00.000Z"),
    submission: { id: "sub-1", title: "A submission" },
    ratings: [{ score: 8, criterion: { id: "crit-1", label: "Code Quality" } }],
    ...overrides,
  };
}

test("toRatingItems flattens each rating's nested criterion into criterionId and label", () => {
  const ratings = toRatingItems([
    { score: 8, criterion: { id: "crit-1", label: "Code Quality" } },
    { score: 6, criterion: { id: "crit-2", label: "Performance" } },
  ]);

  expect(ratings).toEqual([
    { criterionId: "crit-1", label: "Code Quality", score: 8 },
    { criterionId: "crit-2", label: "Performance", score: 6 },
  ]);
});

test("toRatingItems returns an empty array for a review with no ratings", () => {
  expect(toRatingItems([])).toEqual([]);
});

test("toReviewGivenItem carries every field through, with ratings flattened", () => {
  const item = toReviewGivenItem(baseReview());

  expect(item).toEqual({
    id: "review-1",
    strengths: "Clear naming throughout.",
    improvements: "Add tests for the edge cases.",
    resources: [],
    createdAt: new Date("2026-08-11T10:00:00.000Z"),
    submission: { id: "sub-1", title: "A submission" },
    ratings: [{ criterionId: "crit-1", label: "Code Quality", score: 8 }],
  });
});

test("toReviewGivenItem has no reviewer field, since a review you wrote is always by you", () => {
  const item = toReviewGivenItem(baseReview());

  expect("reviewer" in item).toBe(false);
});

test("toReviewGivenItem carries resource links through unchanged", () => {
  const item = toReviewGivenItem(
    baseReview({ resources: ["https://expressjs.com/en/guide/using-middleware.html"] })
  );

  expect(item.resources).toEqual(["https://expressjs.com/en/guide/using-middleware.html"]);
});

test("toReviewReceivedItem is everything toReviewGivenItem returns, plus who wrote it", () => {
  const review = baseReview();
  const given = toReviewGivenItem(review);
  const received = toReviewReceivedItem({ ...review, reviewer: { username: "aqeel_codes" } });

  expect(received).toEqual({ ...given, reviewer: { username: "aqeel_codes" } });
});

test("toReviewReceivedItem reads the reviewer's username, not the profile owner's", () => {
  const received = toReviewReceivedItem({
    ...baseReview(),
    reviewer: { username: "osini_dev" },
  });

  expect(received.reviewer.username).toBe("osini_dev");
});
