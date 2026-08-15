// Tests for what counts as a link somebody is allowed to save.
//
// Run with:  npm test    (from frontend)
//
// The rule is about the scheme, not the syntax. `javascript:alert(1)` is a genuinely
// valid URL, so every "is this a URL" check accepts it, and these values are later
// rendered as the href of a link other people click.

import { isSafeUrl, isGithubUrl, urlProblem } from "@/lib/url";

test("a link that runs script is refused, however it is capitalised or padded", () => {
  expect(isSafeUrl("javascript:alert(document.cookie)")).toBe(false);
  expect(isSafeUrl("JaVaScRiPt:alert(1)")).toBe(false);
  expect(isSafeUrl("  javascript:alert(1)  ")).toBe(false);
  expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
  expect(isSafeUrl("file:///C:/Windows/System32/")).toBe(false);
});

test("http and https links are accepted", () => {
  expect(isSafeUrl("https://github.com/osini/repo")).toBe(true);
  expect(isSafeUrl("http://example.com/path?x=1#top")).toBe(true);
});

test("a link with no host is refused, because it goes nowhere", () => {
  expect(isSafeUrl("https://")).toBe(false);
});

test("anything that is not a string is refused rather than crashing", () => {
  expect(isSafeUrl(null)).toBe(false);
  expect(isSafeUrl(undefined)).toBe(false);
  expect(isSafeUrl(42)).toBe(false);
});

// --------------------------------------------------------------------------
// isGithubUrl
// --------------------------------------------------------------------------

test("a GitHub link is accepted, with or without www, in any case", () => {
  expect(isGithubUrl("https://github.com/osini")).toBe(true);
  expect(isGithubUrl("https://www.github.com/osini/codecritic")).toBe(true);
  expect(isGithubUrl("HTTPS://GitHub.com/osini")).toBe(true);
});

// The reason the host is compared exactly rather than with endsWith: a domain can be
// named to look like a familiar one and still be entirely unrelated.
test("a domain dressed up to look like GitHub is refused", () => {
  expect(isGithubUrl("https://github.com.example.org/osini")).toBe(false);
  expect(isGithubUrl("https://notgithub.com/osini")).toBe(false);
});

test("a link somewhere else entirely is refused, because the field says GitHub", () => {
  expect(isGithubUrl("https://gitlab.com/osini")).toBe(false);
});

// --------------------------------------------------------------------------
// urlProblem, which is what the forms show under the box
// --------------------------------------------------------------------------

test("an empty box is not a problem, because these fields are optional", () => {
  expect(urlProblem("")).toBe(null);
  expect(urlProblem("   ")).toBe(null);
  expect(urlProblem("", "github")).toBe(null);
});

test("a good link produces no message", () => {
  expect(urlProblem("https://example.com")).toBe(null);
  expect(urlProblem("https://github.com/osini", "github")).toBe(null);
});

test("a bad link produces a message that says what to do", () => {
  expect(urlProblem("abc")).toContain("https://");
  expect(urlProblem("javascript:alert(1)")).toContain("https://");
});

test("a real link that is not GitHub is only a problem where GitHub is asked for", () => {
  expect(urlProblem("https://gitlab.com/osini")).toBe(null);
  expect(urlProblem("https://gitlab.com/osini", "github")).toContain("GitHub");
});

// --------------------------------------------------------------------------
// Parity with the back end
//
// isSafeUrl and isGithubUrl exist twice: here, and in backend/src/models/url.ts, which
// is the canonical pair. The browser cannot import from the back end, so the
// duplication is unavoidable. The two behaving differently would mean a form accepting
// something the API then rejects, or worse, warning about something the API allows.
//
// This exact table is asserted in backend/tests/models/url.test.ts under the same
// heading. Change one implementation without the other and one of the two suites
// fails. Keep the two tables identical.
// --------------------------------------------------------------------------

const PARITY_CASES: Array<[string, boolean, boolean]> = [
  // value, isSafeUrl, isGithubUrl
  ["https://github.com/osini/repo", true, true],
  ["http://github.com/osini", true, true],
  ["https://www.github.com/osini", true, true],
  ["HTTPS://GitHub.com/osini", true, true],
  ["https://gitlab.com/osini", true, false],
  ["https://github.com.example.org/x", true, false],
  ["javascript:alert(1)", false, false],
  ["JaVaScRiPt:alert(1)", false, false],
  ["data:text/html,<script>alert(1)</script>", false, false],
  ["file:///C:/Windows/", false, false],
  ["ftp://example.com/x", false, false],
  ["mailto:someone@example.com", false, false],
  ["not a url", false, false],
  ["github.com/osini", false, false],
  ["https://", false, false],
  ["", false, false],
];

test("isSafeUrl agrees with the back end on every case in the shared table", () => {
  for (const [value, safe] of PARITY_CASES) {
    expect([value, isSafeUrl(value)]).toEqual([value, safe]);
  }
});

test("isGithubUrl agrees with the back end on every case in the shared table", () => {
  for (const [value, , github] of PARITY_CASES) {
    expect([value, isGithubUrl(value)]).toEqual([value, github]);
  }
});
