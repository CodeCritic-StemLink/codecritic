// Tests for the Feature 02 profile insights.
//
// Run with:  npm test
//
// buildInsights needs no database and no server: it takes the raw reviews the
// repository already fetched and does the counting. That is the whole reason it lives
// in its own file, insights.service.ts, with no Prisma import, the same way
// ranking.service.ts does for Feature 01.

import { test } from "node:test";
import assert from "node:assert/strict";

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

  assert.deepEqual(insights.reviewsByTag, []);
  assert.deepEqual(insights.reviewsByMonth, []);
  assert.equal(insights.averageScoreGiven, null);
});

test("one review counts each of its tags once and averages its own scores", () => {
  const insights = buildInsights([review(["Node", "Express"], [8, 6], "2026-08-11T10:00:00.000Z")]);

  assert.deepEqual(insights.reviewsByTag, [
    { tag: "Node", count: 1 },
    { tag: "Express", count: 1 },
  ]);
  assert.equal(insights.averageScoreGiven, 7);
});

test("the same tag across two reviews adds up, not two separate entries", () => {
  const insights = buildInsights([
    review(["Node"], [5], "2026-08-01T10:00:00.000Z"),
    review(["Node", "Prisma"], [7], "2026-08-02T10:00:00.000Z"),
  ]);

  assert.deepEqual(insights.reviewsByTag, [
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

  assert.deepEqual(insights.reviewsByTag.map((t) => t.tag), ["Node", "Rust"]);
});

test("reviews are grouped by calendar month regardless of the day", () => {
  const insights = buildInsights([
    review(["Node"], [5], "2026-07-01T10:00:00.000Z"),
    review(["Node"], [5], "2026-07-30T23:00:00.000Z"),
    review(["Node"], [5], "2026-08-01T00:00:00.000Z"),
  ]);

  assert.deepEqual(insights.reviewsByMonth, [
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

  assert.deepEqual(
    insights.reviewsByMonth.map((m) => m.month),
    ["2026-06", "2026-07", "2026-08"]
  );
});

test("averageScoreGiven is the mean of every rating across every review, rounded to one decimal", () => {
  // Matches the real aqeel_codes seed data: nine ratings summing to 57. 57 / 9 = 6.3.
  const insights = buildInsights([
    review(["Node", "Express", "Prisma"], [8, 6, 7], "2026-08-01T10:00:00.000Z"),
    review(["Python", "Django"], [5, 7], "2026-08-02T10:00:00.000Z"),
    review(["Next.js", "TypeScript"], [6, 7], "2026-08-03T10:00:00.000Z"),
    review(["PostgreSQL", "Node"], [7, 4], "2026-08-04T10:00:00.000Z"),
  ]);

  assert.equal(insights.averageScoreGiven, 6.3);
});

test("a review with no ratings does not break the average", () => {
  const insights = buildInsights([review(["Node"], [], "2026-08-01T10:00:00.000Z")]);

  assert.equal(insights.averageScoreGiven, null);
});