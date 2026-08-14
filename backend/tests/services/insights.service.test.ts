// Tests for the Feature 02 profile insights.
//
// Run with:  npm test
//
// buildInsights needs no database and no server: it takes the raw reviews the
// repository already fetched and does the counting. That is the whole reason it lives
// in its own file, insights.service.ts, with no Prisma import, the same way
// ranking.service.ts does for Feature 01.

import { buildInsights } from "../../src/services/insights.service";
import type { ReviewGivenForInsights } from "../../src/repositories/user.repository";

/** Builds one review with just the fields buildInsights reads. */
function review(
  tags: string[],
  scores: number[],
  createdAt: string
): ReviewGivenForInsights {
  return {
    createdAt: new Date(createdAt),
    submission: { tags },
    ratings: scores.map((score) => ({ score })),
  } as ReviewGivenForInsights;
}

test("nobody has ever reviewed: empty insights, null average, not zero", () => {
  const insights = buildInsights([]);

  expect(insights.reviewsByTag).toEqual([]);
  expect(insights.reviewsByMonth).toEqual([]);
  expect(insights.averageScoreGiven).toBe(null);
});

test("one review counts each of its tags once and averages its own scores", () => {
  const insights = buildInsights([review(["Node", "Express"], [8, 6], "2026-08-11T10:00:00.000Z")]);

  // Alphabetical on an equal count, so the panel is the same on every request rather
  // than depending on whatever order the reviews came back in.
  expect(insights.reviewsByTag).toEqual([
    { tag: "Express", count: 1 },
    { tag: "Node", count: 1 },
  ]);
  expect(insights.averageScoreGiven).toBe(7);
});

// --------------------------------------------------------------------------
// Spelling
//
// Tags are typed by hand on the post form, so the same technology arrives written
// several ways. This panel listed "Node 2" and "node 1" as two technologies, which is
// nonsense to a reader and disagrees with how the feed's ranking compares the same
// tags. It shares normaliseTag with the ranking so the two cannot drift.
// --------------------------------------------------------------------------

test("Node and node are one technology on a profile, not two", () => {
  const insights = buildInsights([
    review(["Node"], [5], "2026-08-01T10:00:00.000Z"),
    review(["node"], [5], "2026-08-02T10:00:00.000Z"),
  ]);

  expect(insights.reviewsByTag).toEqual([{ tag: "Node", count: 2 }]);
});

test("the spelling shown is whichever one was used most", () => {
  const insights = buildInsights([
    review(["node"], [5], "2026-08-01T10:00:00.000Z"),
    review(["node"], [5], "2026-08-02T10:00:00.000Z"),
    review(["Node"], [5], "2026-08-03T10:00:00.000Z"),
  ]);

  expect(insights.reviewsByTag).toEqual([{ tag: "node", count: 3 }]);
});

test("stray spaces around a tag do not create a second technology", () => {
  const insights = buildInsights([
    review([" React "], [5], "2026-08-01T10:00:00.000Z"),
    review(["React"], [5], "2026-08-02T10:00:00.000Z"),
  ]);

  expect(insights.reviewsByTag).toEqual([{ tag: "React", count: 2 }]);
});

test("a tag that is only spaces is not counted as a technology", () => {
  const insights = buildInsights([review(["   ", "Node"], [5], "2026-08-01T10:00:00.000Z")]);

  expect(insights.reviewsByTag).toEqual([{ tag: "Node", count: 1 }]);
});

test("the same tag across two reviews adds up, not two separate entries", () => {
  const insights = buildInsights([
    review(["Node"], [5], "2026-08-01T10:00:00.000Z"),
    review(["Node", "Prisma"], [7], "2026-08-02T10:00:00.000Z"),
  ]);

  expect(insights.reviewsByTag).toEqual([
    { tag: "Node", count: 2 },
    { tag: "Prisma", count: 1 },
  ]);
});

test("reviewsByTag is sorted highest count first", () => {
  const insights = buildInsights([
    review(["Rust"], [5], "2026-08-01T10:00:00.000Z"),
    review(["Node"], [5], "2026-08-02T10:00:00.000Z"),
    review(["Node"], [5], "2026-08-03T10:00:00.000Z"),
    review(["Node"], [5], "2026-08-04T10:00:00.000Z"),
  ]);

  expect(insights.reviewsByTag.map((t) => t.tag)).toEqual(["Node", "Rust"]);
});

test("reviews are grouped by calendar month regardless of the day", () => {
  const insights = buildInsights([
    review(["Node"], [5], "2026-07-01T10:00:00.000Z"),
    review(["Node"], [5], "2026-07-30T23:00:00.000Z"),
    review(["Node"], [5], "2026-08-01T00:00:00.000Z"),
  ]);

  expect(insights.reviewsByMonth).toEqual([
    { month: "2026-07", count: 2 },
    { month: "2026-08", count: 1 },
  ]);
});

test("reviewsByMonth is sorted chronologically, not by insertion order", () => {
  const insights = buildInsights([
    review(["Node"], [5], "2026-08-05T10:00:00.000Z"),
    review(["Node"], [5], "2026-06-05T10:00:00.000Z"),
    review(["Node"], [5], "2026-07-05T10:00:00.000Z"),
  ]);

  expect(insights.reviewsByMonth.map((m) => m.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
});

test("averageScoreGiven is the mean of every rating across every review, rounded to one decimal", () => {
  // Matches the real aqeel_codes seed data: nine ratings summing to 57. 57 / 9 = 6.3.
  const insights = buildInsights([
    review(["Node", "Express", "Prisma"], [8, 6, 7], "2026-08-01T10:00:00.000Z"),
    review(["Python", "Django"], [5, 7], "2026-08-02T10:00:00.000Z"),
    review(["Next.js", "TypeScript"], [6, 7], "2026-08-03T10:00:00.000Z"),
    review(["PostgreSQL", "Node"], [7, 4], "2026-08-04T10:00:00.000Z"),
  ]);

  expect(insights.averageScoreGiven).toBe(6.3);
});

test("a review with no ratings does not break the average", () => {
  const insights = buildInsights([review(["Node"], [], "2026-08-01T10:00:00.000Z")]);

  expect(insights.averageScoreGiven).toBe(null);
});
