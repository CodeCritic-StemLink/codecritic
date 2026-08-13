import type { ReviewGivenForInsights } from "../repositories/user.repository";

// Feature 02: turning a person's reviews into the three profile insights.
//
// Pulled out of user.service.ts into its own file for the same reason
// ranking.service.ts stands alone: this is pure maths, no Prisma and no Express, so
// it can be tested directly with no database and no server. See
// tests/services/insights.service.test.ts.

/** One entry in "which technologies does this person review in". */
export type TagCount = { tag: string; count: number };

/** One entry in "how many reviews did this person write in a given month". */
export type MonthCount = { month: string; count: number };

export type ProfileInsights = {
  reviewsByTag: TagCount[];
  reviewsByMonth: MonthCount[];
  /** Null when this person has never rated anything, rather than a misleading 0. */
  averageScoreGiven: number | null;
};

/**
 * Turns the raw reviews this person wrote into the three insight figures.
 *
 * Takes what the repository already fetched and does the counting. No database call
 * of its own.
 */
export function buildInsights(reviews: ReviewGivenForInsights[]): ProfileInsights {
  const tagCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  let scoreTotal = 0;
  let scoreCount = 0;

  for (const review of reviews) {
    for (const tag of review.submission.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    // "2026-08", grouping by calendar month regardless of which day it happened.
    const month = review.createdAt.toISOString().slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);

    for (const rating of review.ratings) {
      scoreTotal += rating.score;
      scoreCount += 1;
    }
  }

  const reviewsByTag = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const reviewsByMonth = [...monthCounts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    reviewsByTag,
    reviewsByMonth,
    // Rounded to one decimal place so the UI never shows a long float. Null, not 0,
    // when nobody has ever been scored, so "no data" cannot be misread as "scored zero".
    averageScoreGiven: scoreCount === 0 ? null : Math.round((scoreTotal / scoreCount) * 10) / 10,
  };
}