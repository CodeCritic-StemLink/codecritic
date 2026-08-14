// Tests for the technology counts in the feed's left rail.
//
// Run with:  npm test    (from frontend)
//
// popularTags takes the submissions the page already fetched and counts their tags.
// It lives in lib/ rather than inside FeedFilters.tsx precisely so it can be tested
// like this, with no React and no browser.

import { popularTags } from "@/lib/tags";
import type { FeedItem } from "@/services/submission.service";

/**
 * A submission with only the fields popularTags reads.
 *
 * Cast because FeedItem carries a lot more than this (author, description, score, and
 * so on) and filling all of it in would bury the one thing each test is about.
 */
function submission(tags: string[]): FeedItem {
  return { tags } as FeedItem;
}

test("an empty feed produces no tags rather than throwing", () => {
  expect(popularTags([], 8)).toEqual([]);
});

test("one submission counts each of its tags once", () => {
  expect(popularTags([submission(["React", "Tailwind"])], 8)).toEqual([
    { tag: "React", count: 1 },
    { tag: "Tailwind", count: 1 },
  ]);
});

test("the same tag on two submissions adds up instead of appearing twice", () => {
  const tags = popularTags([submission(["Node"]), submission(["Node", "Prisma"])], 8);

  expect(tags).toEqual([
    { tag: "Node", count: 2 },
    { tag: "Prisma", count: 1 },
  ]);
});

test("the most used technology comes first", () => {
  const tags = popularTags(
    [
      submission(["Rust"]),
      submission(["Node"]),
      submission(["Node"]),
      submission(["Node"]),
    ],
    8
  );

  expect(tags.map((t) => t.tag)).toEqual(["Node", "Rust"]);
});

// Without this, two tags on the same count could swap places between renders and the
// sidebar would look like it was shuffling itself for no reason.
test("tags on the same count are ordered alphabetically, so the rail never shuffles", () => {
  const tags = popularTags([submission(["Zod", "Angular", "Meteor"])], 8);

  expect(tags.map((t) => t.tag)).toEqual(["Angular", "Meteor", "Zod"]);
});

test("the same feed in a different order gives exactly the same result", () => {
  const feed = [submission(["Node", "React"]), submission(["React"]), submission(["Go"])];
  const reversed = [...feed].reverse();

  expect(popularTags(feed, 8)).toEqual(popularTags(reversed, 8));
});

test("the limit caps how many come back", () => {
  const tags = popularTags([submission(["A", "B", "C", "D", "E"])], 3);

  expect(tags).toHaveLength(3);
});

test("the limit keeps the most used ones, not the first ones it happened to see", () => {
  const tags = popularTags(
    [submission(["Rare"]), submission(["Common"]), submission(["Common"])],
    1
  );

  expect(tags).toEqual([{ tag: "Common", count: 2 }]);
});

test("a submission with no tags is skipped without breaking the count", () => {
  const tags = popularTags([submission([]), submission(["Node"])], 8);

  expect(tags).toEqual([{ tag: "Node", count: 1 }]);
});

test("tag matching is exact, so Node and node are counted as two technologies", () => {
  // Worth pinning down: the ranking engine matches tags case insensitively, but this
  // is a display list, and showing "Node 2" when the data holds two different strings
  // would be a quiet lie about what is in the database.
  const tags = popularTags([submission(["Node"]), submission(["node"])], 8);

  expect(tags).toHaveLength(2);
});

test("a limit of zero returns nothing rather than everything", () => {
  expect(popularTags([submission(["Node"])], 0)).toEqual([]);
});
