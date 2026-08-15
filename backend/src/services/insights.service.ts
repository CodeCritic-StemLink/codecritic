import { normaliseTag } from "./ranking.service";
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
  /*
   * Keyed by the normalised tag, holding how often each spelling of it was used.
   *
   * Tags are typed by hand on the post form, so the same technology arrives as "Node",
   * "node" and sometimes " node ". Counted by the raw string this read "Node 2" and
   * "node 1" as two technologies, which is nonsense to anybody reading the profile and
   * disagrees with how the feed's ranking compares the very same tags.
   *
   * normaliseTag is imported from the ranking rather than rewritten here, so the two
   * cannot drift into disagreeing about whether two tags are the same thing.
   */
  const tagGroups = new Map<string, Map<string, number>>();
  const monthCounts = new Map<string, number>();
  let scoreTotal = 0;
  let scoreCount = 0;

  for (const review of reviews) {
    for (const tag of review.submission.tags) {
      const key = normaliseTag(tag);

      // A tag of nothing but spaces is not a technology.
      if (key === "") continue;

      const spellings = tagGroups.get(key) ?? new Map<string, number>();
      const spelling = tag.trim();
      spellings.set(spelling, (spellings.get(spelling) ?? 0) + 1);
      tagGroups.set(key, spellings);
    }

    // "2026-08", grouping by calendar month regardless of which day it happened.
    const month = review.createdAt.toISOString().slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);

    for (const rating of review.ratings) {
      scoreTotal += rating.score;
      scoreCount += 1;
    }
  }

  const reviewsByTag = [...tagGroups.values()]
    .map((spellings) => {
      /*
       * Show whichever spelling was used most. Ties fall back to a plain character
       * comparison rather than localeCompare: it does not depend on the server's
       * locale, and it puts capitals first, so an even split between "Node" and "node"
       * shows "Node", which is how the technology is actually written.
       */
      const used = [...spellings.entries()].sort(
        ([spellingA, timesA], [spellingB, timesB]) =>
          timesB - timesA || (spellingA < spellingB ? -1 : 1)
      );

      return {
        tag: used[0][0],
        count: used.reduce((running, [, times]) => running + times, 0),
      };
    })
    // Ties broken alphabetically so the list is the same on every request, rather than
    // depending on whatever order the reviews happened to come back in.
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

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