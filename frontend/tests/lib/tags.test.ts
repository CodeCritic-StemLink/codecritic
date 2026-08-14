// Tests for the technology counts in the feed's left rail.
//
// Run with:  npm test    (from frontend)
//
// popularTags takes the submissions the page already fetched and counts their tags.
// It lives in lib/ rather than inside FeedFilters.tsx precisely so it can be tested
// like this, with no React and no browser.

import { popularTags, normaliseTag, sameTag } from "@/lib/tags";
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

test("a limit of zero returns nothing rather than everything", () => {
  expect(popularTags([submission(["Node"])], 0)).toEqual([]);
});

// --------------------------------------------------------------------------
// Spelling
//
// Tags are typed by hand on the post form, so the same technology arrives written
// several ways. The rail showed "Node 3" and "node 1" as two separate technologies,
// which is nonsense to a reader and does not match how the ranking compares tags.
// --------------------------------------------------------------------------

test("Node and node are one technology, not two", () => {
  const tags = popularTags([submission(["Node"]), submission(["node"])], 8);

  expect(tags).toEqual([{ tag: "Node", count: 2 }]);
});

test("the spelling shown is whichever one was used most", () => {
  const tags = popularTags(
    [submission(["node"]), submission(["node"]), submission(["Node"])],
    8
  );

  expect(tags[0].tag).toBe("node");
  expect(tags[0].count).toBe(3);
});

test("spellings used equally often fall back to alphabetical, so the label never flickers", () => {
  const tags = popularTags([submission(["node"]), submission(["Node"])], 8);

  // "Node" sorts before "node", so the label is stable whichever order they arrive in.
  expect(tags[0].tag).toBe("Node");
  expect(popularTags([submission(["Node"]), submission(["node"])], 8)).toEqual(tags);
});

test("stray spaces around a tag do not create a second technology", () => {
  const tags = popularTags([submission([" React "]), submission(["React"])], 8);

  expect(tags).toEqual([{ tag: "React", count: 2 }]);
});

test("a tag that is only spaces is not a technology", () => {
  expect(popularTags([submission(["   "]), submission(["Node"])], 8)).toEqual([
    { tag: "Node", count: 1 },
  ]);
});

test("grouping happens before the limit, so a split spelling cannot lose its place", () => {
  const tags = popularTags(
    [submission(["Node"]), submission(["node"]), submission(["Rust"]), submission(["Go"])],
    1
  );

  expect(tags).toEqual([{ tag: "Node", count: 2 }]);
});

// --------------------------------------------------------------------------
// normaliseTag and sameTag
// --------------------------------------------------------------------------

test("normalising trims and lowercases, matching the back end", () => {
  expect(normaliseTag(" Node ")).toBe("node");
  expect(normaliseTag("NODE")).toBe(normaliseTag("node"));
});

test("sameTag ignores case, so ?tag=node still lights up the Node filter", () => {
  expect(sameTag("Node", "node")).toBe(true);
  expect(sameTag("Node", "Nodemon")).toBe(false);
});

test("sameTag says no when either side is missing, so nothing is selected by default", () => {
  expect(sameTag(undefined, "Node")).toBe(false);
  expect(sameTag("Node", undefined)).toBe(false);
});
