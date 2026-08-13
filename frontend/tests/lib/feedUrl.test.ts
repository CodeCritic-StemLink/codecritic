// Tests for the feed's URL builder.
//
// Run with:  npm test    (from frontend)
//
// Every filter on the feed lives in the address bar rather than in React state. That
// is what lets the feed stay a server component and what makes a filtered feed a real
// link. The whole idea rests on one rule: changing one filter must never quietly throw
// away the others. These tests are that rule written down.
//
// No browser, no React, no network. feedUrl takes plain values and returns a string.

import { feedUrl } from "@/lib/feedUrl";

test("no filters at all gives the plain feed address, not a trailing question mark", () => {
  expect(feedUrl({})).toBe("/");
});

test("setting one filter puts it in the address", () => {
  expect(feedUrl({}, { tag: "React" })).toBe("/?tag=React");
});

test("an existing filter is carried through when it is not the one being changed", () => {
  const url = feedUrl({ search: "prisma" }, { status: "pending" });

  expect(url).toContain("search=prisma");
  expect(url).toContain("status=pending");
});

// This is the bug the whole helper exists to prevent. Before it, each control built
// its own URL and quietly dropped whatever it did not know about.
test("clicking a tag does not throw away the search box", () => {
  const url = feedUrl({ search: "auth", status: "pending" }, { tag: "Node" });

  expect(url).toContain("search=auth");
  expect(url).toContain("status=pending");
  expect(url).toContain("tag=Node");
});

test("passing null clears just that filter and leaves the rest alone", () => {
  const url = feedUrl({ search: "auth", tag: "Node", status: "pending" }, { tag: null });

  expect(url).not.toContain("tag=");
  expect(url).toContain("search=auth");
  expect(url).toContain("status=pending");
});

test("clearing the only filter goes back to the plain feed address", () => {
  expect(feedUrl({ tag: "Node" }, { tag: null })).toBe("/");
});

// undefined and null mean different things on purpose: "leave it alone" and "remove
// it". Getting these two confused is how a filter becomes impossible to switch off.
test("undefined means leave it alone, which is not the same as clearing it", () => {
  const left = feedUrl({ tag: "Node" }, { tag: undefined });
  const cleared = feedUrl({ tag: "Node" }, { tag: null });

  expect(left).toBe("/?tag=Node");
  expect(cleared).toBe("/");
});

test("changing a filter replaces the old value rather than adding a second one", () => {
  const url = feedUrl({ tag: "Node" }, { tag: "React" });

  expect(url).toBe("/?tag=React");
  expect(url).not.toContain("Node");
});

test("a tag with a space or a plus is encoded, so the link still works", () => {
  const url = feedUrl({}, { tag: "C++ Builder" });

  expect(url).not.toContain(" ");
  expect(new URL(url, "http://x").searchParams.get("tag")).toBe("C++ Builder");
});

test("the why toggle survives a filter change, so the explanation stays open", () => {
  const url = feedUrl({ why: "1", tag: "Node" }, { status: "reviewed" });

  expect(url).toContain("why=1");
});

test("turning the why toggle off leaves every filter in place", () => {
  const url = feedUrl({ why: "1", search: "auth", tag: "Node" }, { why: null });

  expect(url).not.toContain("why=");
  expect(url).toContain("search=auth");
  expect(url).toContain("tag=Node");
});

test("an empty string is treated as no filter, so a blank search box is not in the URL", () => {
  expect(feedUrl({ search: "" })).toBe("/");
});

// --------------------------------------------------------------------------
// Paging
// --------------------------------------------------------------------------

test("page one is left out of the address, so one set of results has one address", () => {
  expect(feedUrl({}, { page: "1" })).toBe("/");
});

test("any other page is in the address", () => {
  expect(feedUrl({}, { page: "3" })).toBe("/?page=3");
});

test("paging keeps the filters you already had", () => {
  const url = feedUrl({ tag: "Node", search: "auth" }, { page: "2" });

  expect(url).toContain("tag=Node");
  expect(url).toContain("search=auth");
  expect(url).toContain("page=2");
});

// Without this rule, filtering while on page 5 leaves you on page 5 of a shorter
// result, which is a blank screen and looks like the site is broken.
test("changing a filter sends you back to page one", () => {
  const url = feedUrl({ page: "5", tag: "Node" }, { tag: "React" });

  expect(url).not.toContain("page=");
  expect(url).toContain("tag=React");
});

test("clearing a filter also sends you back to page one", () => {
  expect(feedUrl({ page: "4", tag: "Node" }, { tag: null })).toBe("/");
});

test("searching from deep in the feed starts again at the top", () => {
  const url = feedUrl({ page: "7" }, { search: "prisma" });

  expect(url).not.toContain("page=");
});

// The explanation toggle does not change which submissions match, so it must not
// throw away the page you were reading.
test("the why toggle does not reset the page, because it changes no results", () => {
  const url = feedUrl({ page: "3" }, { why: "1" });

  expect(url).toContain("page=3");
  expect(url).toContain("why=1");
});
