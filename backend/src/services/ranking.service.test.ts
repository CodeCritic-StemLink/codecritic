// Tests for the Feature 01 ranking.
//
// Run with:  npm run test:ranking
//
// This file needs no database and no server, because ranking.ts is pure maths. That is
// the whole reason the scoring lives in its own file.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  matchingTags,
  recencyPoints,
  scoreSubmission,
  rankSubmissions,
  POINTS_PER_MATCHING_TAG,
  MAX_RECENCY_POINTS,
  NEEDS_HELP_POINTS,
} from "./ranking.service";

// A fixed "now" so the tests give the same answer today and next month.
const NOW = new Date("2026-08-12T12:00:00.000Z");

function hoursBefore(hours: number): Date {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

// --------------------------------------------------------------------------
// matchingTags
// --------------------------------------------------------------------------

test("matches the tags the viewer works with, and ignores the rest", () => {
  const matches = matchingTags(["React", "Next.js", "Rust"], ["React", "Next.js", "Tailwind"]);

  assert.deepEqual(matches, ["React", "Next.js"]);
});

test("matching ignores case, so a react tag still matches a React stack", () => {
  assert.deepEqual(matchingTags(["react"], ["React"]), ["react"]);
});

test("a repeated tag is only counted once", () => {
  assert.deepEqual(matchingTags(["React", "React"], ["React"]), ["React"]);
});

test("nothing matches for a viewer with an empty stack", () => {
  assert.deepEqual(matchingTags(["React", "Node"], []), []);
});

// --------------------------------------------------------------------------
// recencyPoints
// --------------------------------------------------------------------------

test("a brand new submission gets the full recency score", () => {
  assert.equal(recencyPoints(NOW, NOW), MAX_RECENCY_POINTS);
});

test("recency halves after 48 hours", () => {
  assert.equal(recencyPoints(hoursBefore(48), NOW), 5);
});

test("recency halves again after another 48 hours", () => {
  assert.equal(recencyPoints(hoursBefore(96), NOW), 3);
});

test("a very old submission decays towards zero but never goes negative", () => {
  const points = recencyPoints(hoursBefore(24 * 365), NOW);

  assert.equal(points, 0);
  assert.ok(points >= 0);
});

test("a future date is treated as brand new, not scored above the maximum", () => {
  const future = new Date(NOW.getTime() + 60 * 60 * 1000);

  assert.equal(recencyPoints(future, NOW), MAX_RECENCY_POINTS);
});

// --------------------------------------------------------------------------
// scoreSubmission
// --------------------------------------------------------------------------

test("the three parts add up to the total", () => {
  const score = scoreSubmission(
    { tags: ["React", "Next.js"], createdAt: hoursBefore(2), reviewCount: 0 },
    ["React", "Next.js", "Tailwind"],
    NOW
  );

  assert.equal(score.tagPoints, 2 * POINTS_PER_MATCHING_TAG);
  assert.equal(score.needsHelpPoints, NEEDS_HELP_POINTS);
  assert.equal(score.total, score.tagPoints + score.recencyPoints + score.needsHelpPoints);
});

test("a reviewed submission gets no needs-help bonus", () => {
  const score = scoreSubmission(
    { tags: ["React"], createdAt: hoursBefore(2), reviewCount: 3 },
    ["React"],
    NOW
  );

  assert.equal(score.needsHelpPoints, 0);
});

test("one matching tag beats the entire recency range, so relevance beats freshness", () => {
  const relevantButOld = scoreSubmission(
    { tags: ["React"], createdAt: hoursBefore(24 * 30), reviewCount: 5 },
    ["React"],
    NOW
  );

  const freshButIrrelevant = scoreSubmission(
    { tags: ["Rust"], createdAt: NOW, reviewCount: 5 },
    ["React"],
    NOW
  );

  assert.ok(relevantButOld.total > freshButIrrelevant.total);
});

test("between two equally relevant submissions, the unreviewed one wins", () => {
  const ignored = scoreSubmission(
    { tags: ["React"], createdAt: hoursBefore(10), reviewCount: 0 },
    ["React"],
    NOW
  );

  const alreadyAnswered = scoreSubmission(
    { tags: ["React"], createdAt: hoursBefore(10), reviewCount: 4 },
    ["React"],
    NOW
  );

  assert.ok(ignored.total > alreadyAnswered.total);
});

test("the needs-help bonus never outranks a genuine extra tag match", () => {
  const oneTagNoReviews = scoreSubmission(
    { tags: ["React"], createdAt: hoursBefore(10), reviewCount: 0 },
    ["React", "Node"],
    NOW
  );

  const twoTagsReviewed = scoreSubmission(
    { tags: ["React", "Node"], createdAt: hoursBefore(10), reviewCount: 9 },
    ["React", "Node"],
    NOW
  );

  assert.ok(twoTagsReviewed.total > oneTagNoReviews.total);
});

// --------------------------------------------------------------------------
// rankSubmissions, the behaviour the SRS asks us to demonstrate
// --------------------------------------------------------------------------

const FEED = [
  { id: "react-dashboard", tags: ["React", "Next.js"], createdAt: hoursBefore(2), reviewCount: 0 },
  { id: "bookstore-api", tags: ["Node", "Express", "Prisma"], createdAt: hoursBefore(5), reviewCount: 3 },
  { id: "django-blog", tags: ["Python", "Django"], createdAt: hoursBefore(26), reviewCount: 2 },
  { id: "tailwind-components", tags: ["React", "Tailwind"], createdAt: hoursBefore(50), reviewCount: 0 },
  { id: "rust-dedup", tags: ["Rust"], createdAt: hoursBefore(74), reviewCount: 2 },
  { id: "booking-schema", tags: ["Prisma", "Node"], createdAt: hoursBefore(98), reviewCount: 0 },
];

test("a front end developer sees their own technologies first", () => {
  const order = rankSubmissions(FEED, ["React", "Next.js", "Tailwind"], NOW).map((s) => s.id);

  assert.equal(order[0], "react-dashboard");
  assert.equal(order[1], "tailwind-components");
});

test("a back end developer sees a completely different order from the same submissions", () => {
  const frontEnd = rankSubmissions(FEED, ["React", "Next.js", "Tailwind"], NOW).map((s) => s.id);
  const backEnd = rankSubmissions(FEED, ["Node", "Express", "Prisma"], NOW).map((s) => s.id);

  assert.equal(backEnd[0], "bookstore-api");
  assert.equal(backEnd[1], "booking-schema");
  assert.notDeepEqual(frontEnd, backEnd);
});

test("the same submissions come back, only reordered, nothing dropped or added", () => {
  const ranked = rankSubmissions(FEED, ["React"], NOW);

  assert.equal(ranked.length, FEED.length);
  assert.deepEqual([...ranked.map((s) => s.id)].sort(), [...FEED.map((s) => s.id)].sort());
});

test("a viewer with no tech stack still gets a sensible order, newest and unreviewed first", () => {
  const order = rankSubmissions(FEED, [], NOW).map((s) => s.id);

  assert.equal(order[0], "react-dashboard");
});

test("equal scores break the tie on newest first, so the order is never random", () => {
  const twins = [
    { id: "older", tags: ["Go"], createdAt: hoursBefore(10), reviewCount: 1 },
    { id: "newer", tags: ["Go"], createdAt: hoursBefore(9), reviewCount: 1 },
  ];

  const order = rankSubmissions(twins, ["React"], NOW).map((s) => s.id);

  assert.deepEqual(order, ["newer", "older"]);
});
