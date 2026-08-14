// Feature 01: the personalised feed.
//
// A logged out visitor sees submissions newest first. A logged in user sees the same
// submissions in a smarter order, worked out here.
//
// This file deliberately knows nothing about Prisma, Express or HTTP. It takes plain
// values in and gives a number out. Two reasons:
//
//   1. It can be tested directly, with no database and no server. See ranking.test.ts.
//   2. When we are asked "show us the ranking", it is one short file rather than
//      something buried inside a route handler.
//
// The scoring runs on the server, never in the browser. The client cannot be trusted
// to sort honestly, and the database already holds every value the formula needs.

/** Points added for each of the submission's tags found in the viewer's tech stack. */
export const POINTS_PER_MATCHING_TAG = 12;

/** The most a brand new submission can earn for being recent. */
export const MAX_RECENCY_POINTS = 10;

/** Recency points halve every this many hours. */
export const RECENCY_HALF_LIFE_HOURS = 48;

/** A flat bonus for a submission nobody has reviewed yet. */
export const NEEDS_HELP_POINTS = 6;

/** Taken off a submission this viewer has already reviewed. */
export const ALREADY_REVIEWED_PENALTY = 8;

/** The parts of a score, kept separate so the UI can show why a post ranked where it did. */
export type ScoreBreakdown = {
  total: number;
  tagPoints: number;
  matchedTags: string[];
  recencyPoints: number;
  needsHelpPoints: number;
  /** Zero, or minus ALREADY_REVIEWED_PENALTY. Negative so the parts still add up. */
  alreadyReviewedPoints: number;
};

/** The only things about a submission that the ranking cares about. */
export type RankableSubmission = {
  tags: string[];
  createdAt: Date;
  reviewCount: number;
  /** True when the viewer has already written a review on this one. */
  reviewedByViewer?: boolean;
};

/**
 * How one tag is compared with another, everywhere in this project.
 *
 * Trimmed and lowercased, so "Node", "node" and " node " are one technology. Every
 * comparison below goes through this, and so does the feed's tag filter, which is the
 * point of it being exported: the filter and the ranking cannot drift apart into
 * disagreeing about whether two tags are the same thing.
 */
export function normaliseTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Does this submission carry this tag?
 *
 * Used by the feed's tag filter. Case insensitive for the same reason matching is:
 * somebody who typed "node" on their post should still be found by a reader who
 * clicked "Node" in the sidebar.
 */
export function hasTag(submissionTags: string[], tag: string): boolean {
  const wanted = normaliseTag(tag);

  return submissionTags.some((candidate) => normaliseTag(candidate) === wanted);
}

/**
 * Which of this submission's tags does the viewer actually work with?
 *
 * Compared without case, so a submission tagged "react" still matches a user whose
 * stack says "React". Duplicates in either list are ignored.
 */
export function matchingTags(submissionTags: string[], viewerTechStack: string[]): string[] {
  const stack = new Set(viewerTechStack.map(normaliseTag));
  const seen = new Set<string>();
  const matches: string[] = [];

  for (const tag of submissionTags) {
    const key = normaliseTag(tag);

    if (stack.has(key) && !seen.has(key)) {
      seen.add(key);
      matches.push(tag);
    }
  }

  return matches;
}

/**
 * How many points this submission gets for being recent.
 *
 * Halves every RECENCY_HALF_LIFE_HOURS. Brand new is worth 10, two days old is worth
 * 5, four days old is worth 2 or 3, and it keeps shrinking without ever reaching zero.
 *
 * Why a curve and not a cutoff: a cutoff means a post is worth full marks at 47 hours
 * and nothing at 49, which is a cliff nobody can justify. A curve means age always
 * costs something and nothing ever disappears suddenly.
 *
 * Future dates are treated as brand new rather than scoring above the maximum.
 */
export function recencyPoints(createdAt: Date, now: Date = new Date()): number {
  const hoursOld = Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

  return Math.round(MAX_RECENCY_POINTS * Math.pow(0.5, hoursOld / RECENCY_HALF_LIFE_HOURS));
}

/**
 * Score one submission for one viewer.
 *
 *   score = 12 per matching tag
 *         + up to 10 for being recent, halving every 48 hours
 *         + 6 if nobody has reviewed it yet
 *         - 8 if you have already reviewed it
 *
 * Why tag matching is weighted highest: the SRS asks for requests matching the user's
 * own tech stack to appear ahead of ones that do not, so relevance has to beat
 * freshness. One matching tag is worth more than the entire recency range.
 *
 * Why the needs-help bonus exists, which is our own ranking improvement: without it,
 * submissions that already have attention keep collecting more, and a beginner's first
 * post is never seen by anyone. Six points is roughly half a tag match, so it lifts a
 * neglected post above an equally relevant one that has already been answered, without
 * ever outranking genuine relevance.
 *
 * Why the already-reviewed penalty exists: one review per person per submission is a
 * rule the API enforces, so a submission you have reviewed is one you can do nothing
 * more with. It is dead weight in your feed. Eight points pushes it below an otherwise
 * identical one you have not answered, without hiding it, because the SRS asks for the
 * same submissions reordered and because you may well want to find your own review
 * again.
 */
export function scoreSubmission(
  submission: RankableSubmission,
  viewerTechStack: string[],
  now: Date = new Date()
): ScoreBreakdown {
  const matched = matchingTags(submission.tags, viewerTechStack);

  const tagPoints = matched.length * POINTS_PER_MATCHING_TAG;
  const recency = recencyPoints(submission.createdAt, now);
  const needsHelp = submission.reviewCount === 0 ? NEEDS_HELP_POINTS : 0;
  const alreadyReviewed = submission.reviewedByViewer ? -ALREADY_REVIEWED_PENALTY : 0;

  return {
    total: tagPoints + recency + needsHelp + alreadyReviewed,
    tagPoints,
    matchedTags: matched,
    recencyPoints: recency,
    needsHelpPoints: needsHelp,
    alreadyReviewedPoints: alreadyReviewed,
  };
}

/**
 * Put a list of submissions in the order a viewer should see them.
 *
 * Highest score first. Ties break on newest first, so the order is always the same for
 * the same data rather than depending on whatever order the database handed us.
 */
export function rankSubmissions<T extends RankableSubmission>(
  submissions: T[],
  viewerTechStack: string[],
  now: Date = new Date()
): Array<T & { score: ScoreBreakdown }> {
  return submissions
    .map((submission) => ({ ...submission, score: scoreSubmission(submission, viewerTechStack, now) }))
    .sort((a, b) => {
      if (b.score.total !== a.score.total) {
        return b.score.total - a.score.total;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}
