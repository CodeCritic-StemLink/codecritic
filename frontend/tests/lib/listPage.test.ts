// Tests for paging the lists inside a profile.
//
// Run with:  npm test    (from frontend)
//
// A profile has three lists paging at once, each under its own query string key. The
// thing worth pinning down is that they do not interfere: turning to page two of one
// must not send the other two back to page one, and a page number typed into the
// address bar by hand must not produce an empty card.

import { paginate, listPageUrl, PER_PAGE } from "@/lib/listPage";

const ITEMS = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

// --------------------------------------------------------------------------
// paginate
// --------------------------------------------------------------------------

test("no page in the address means page one", () => {
  const result = paginate(ITEMS, undefined);

  expect(result.page).toBe(1);
  expect(result.visible).toEqual(["a", "b", "c", "d"]);
});

test("the page size is what the profile shows", () => {
  expect(paginate(ITEMS, undefined).visible).toHaveLength(PER_PAGE);
});

test("page two is the next slice, not the same one again", () => {
  expect(paginate(ITEMS, "2").visible).toEqual(["e", "f", "g", "h"]);
});

test("the last page can be short without breaking", () => {
  const result = paginate(ITEMS, "3");

  expect(result.visible).toEqual(["i"]);
  expect(result.lastPage).toBe(3);
});

test("an empty list is one page, not zero, so the pager has something to say", () => {
  const result = paginate([], undefined);

  expect(result.page).toBe(1);
  expect(result.lastPage).toBe(1);
  expect(result.visible).toEqual([]);
});

test("a list shorter than one page needs no pager", () => {
  expect(paginate(["a", "b"], undefined).lastPage).toBe(1);
});

// The page number comes from the address bar, so it comes from whatever somebody typed.
// Every one of these will happen eventually and none of them may show an empty card.

test("a page past the end shows the last real page", () => {
  expect(paginate(ITEMS, "99").page).toBe(3);
  expect(paginate(ITEMS, "99").visible).toEqual(["i"]);
});

test("page zero and negative pages fall back to page one", () => {
  expect(paginate(ITEMS, "0").page).toBe(1);
  expect(paginate(ITEMS, "-4").page).toBe(1);
});

test("a page that is not a number falls back to page one", () => {
  expect(paginate(ITEMS, "banana").page).toBe(1);
  expect(paginate(ITEMS, "").page).toBe(1);
});

test("a fractional page is truncated rather than producing half a slice", () => {
  expect(paginate(ITEMS, "2.7").page).toBe(2);
});

// --------------------------------------------------------------------------
// listPageUrl
// --------------------------------------------------------------------------

test("page one is left out, so the first page of a list has one address", () => {
  expect(listPageUrl({}, "given", 1)).toBe("?");
});

test("any other page is in the address under its own key", () => {
  expect(listPageUrl({}, "given", 3)).toBe("?given=3");
});

// The point of the whole component. Three lists page independently on one page.
test("paging one list leaves the other lists where they are", () => {
  const url = listPageUrl({ given: "2", received: "3" }, "received", 4);

  expect(url).toContain("given=2");
  expect(url).toContain("received=4");
});

test("going back to page one drops that key and keeps the others", () => {
  const url = listPageUrl({ given: "2", received: "3" }, "received", 1);

  expect(url).toBe("?given=2");
});

test("the key being paged is never left in twice", () => {
  const url = listPageUrl({ given: "2" }, "given", 5);

  expect(url).toBe("?given=5");
});

test("a key with no value is dropped rather than written as empty", () => {
  const url = listPageUrl({ given: undefined, received: "2" }, "posted", 2);

  expect(url).not.toContain("given");
  expect(url).toContain("received=2");
  expect(url).toContain("posted=2");
});
