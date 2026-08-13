// Tests for the Feature 01 ranking.
//
// Run with:  npm test
//
// This file needs no database and no server, because ranking.ts is pure maths. That is
// the whole reason the scoring lives in its own file.

import {
  matchingTags,
  recencyPoints,
  scoreSubmission,
  rankSubmissions,
  POINTS_PER_MATCHING_TAG,
  MAX_RECENCY_POINTS,
  NEEDS_HELP_POINTS,
} from "../../src/services/ranking.service";

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

  expect(matches).toEqual(["React", "Next.js"]);
});

test("matching ignores case, so a react tag still matches a React stack", () => {
  expect(matchingTags(["react"], ["React"])).toEqual(["react"]);
});

test("a repeated tag is only counted once", () => {
  expect(matchingTags(["React", "React"], ["React"])).toEqual(["React"]);
});

test("nothing matches for a viewer with an empty stack", () => {
  expect(matchingTags(["React", "Node"], [])).toEqual([]);
});

// --------------------------------------------------------------------------
// recencyPoints
// --------------------------------------------------------------------------

test("a brand new submission gets the full recency score", () => {
  expect(recencyPoints(NOW, NOW)).toBe(MAX_RECENCY_POINTS);
});

test("recency halves after 48 hours", () => {
  expect(recencyPoints(hoursBefore(48), NOW)).toBe(5);
});

test("recency halves again after another 48 hours", () => {
  expect(recencyPoints(hoursBefore(96), NOW)).toBe(3);
});

test("a very old submission decays towards zero but never goes negative", () => {
  const points = recencyPoints(hoursBefore(24 * 365), NOW);

  expect(points).toBe(0);
  expect(points >= 0).toBe(true);
});

test("a future date is treated as brand new, not scored above the maximum", () => {
  const future = new Date(NOW.getTime() + 60 * 60 * 1000);

  expect(recencyPoints(future, NOW)).toBe(MAX_RECENCY_POINTS);
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

  expect(score.tagPoints).toBe(2 * POINTS_PER_MATCHING_TAG);
  expect(score.needsHelpPoints).toBe(NEEDS_HELP_POINTS);
  expect(score.total).toBe(score.tagPoints + score.recencyPoints + score.needsHelpPoints);
});

test("a reviewed submission gets no needs-help bonus", () => {
  const score = scoreSubmission(
    { tags: ["React"], createdAt: hoursBefore(2), reviewCount: 3 },
    ["React"],
    NOW
  );

  expect(score.needsHelpPoints).toBe(0);
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

  expect(relevantButOld.total > freshButIrrelevant.total).toBe(true);
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

  expect(ignored.total > alreadyAnswered.total).toBe(true);
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

  expect(twoTagsReviewed.total > oneTagNoReviews.total).toBe(true);
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

  expect(order[0]).toBe("react-dashboard");
  expect(order[1]).toBe("tailwind-components");
});

test("a back end developer sees a completely different order from the same submissions", () => {
  const frontEnd = rankSubmissions(FEED, ["React", "Next.js", "Tailwind"], NOW).map((s) => s.id);
  const backEnd = rankSubmissions(FEED, ["Node", "Express", "Prisma"], NOW).map((s) => s.id);

  expect(backEnd[0]).toBe("bookstore-api");
  expect(backEnd[1]).toBe("booking-schema");
  expect(frontEnd).not.toEqual(backEnd);
});

test("the same submissions come back, only reordered, nothing dropped or added", () => {
  const ranked = rankSubmissions(FEED, ["React"], NOW);

  expect(ranked.length).toBe(FEED.length);
  expect([...ranked.map((s) => s.id)].sort()).toEqual([...FEED.map((s) => s.id)].sort());
});

test("a viewer with no tech stack still gets a sensible order, newest and unreviewed first", () => {
  const order = rankSubmissions(FEED, [], NOW).map((s) => s.id);

  expect(order[0]).toBe("react-dashboard");
});

test("equal scores break the tie on newest first, so the order is never random", () => {
  const twins = [
    { id: "older", tags: ["Go"], createdAt: hoursBefore(10), reviewCount: 1 },
    { id: "newer", tags: ["Go"], createdAt: hoursBefore(9), reviewCount: 1 },
  ];

  const order = rankSubmissions(twins, ["React"], NOW).map((s) => s.id);

  expect(order).toEqual(["newer", "older"]);
});
