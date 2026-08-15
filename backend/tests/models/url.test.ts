// Tests for what counts as a storable link.
//
// Run with:  npm test
//
// These exist because "is it a valid URL" turned out to be the wrong question. Both
// `z.string().url()` and `new URL(value)` accept `javascript:alert(1)`, because it
// genuinely is a valid URL. Every value guarded by this module is later rendered as the
// href of an anchor somebody clicks: a submission's repoUrl, a profile's githubUrl, and
// every resource link on a review. A stored `javascript:` href is script that runs in
// the reader's session, posted by anybody with an account.
//
// The rule is the scheme, not the syntax.

import { isSafeUrl, isGithubUrl } from "../../src/models/url";

// --------------------------------------------------------------------------
// The attacks, each of which passed the old check
// --------------------------------------------------------------------------

const DANGEROUS = [
  "javascript:alert(document.cookie)",
  "JaVaScRiPt:alert(1)",
  "  javascript:alert(1)  ",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///C:/Windows/System32/",
];

test("a link that runs script is refused, however it is capitalised or padded", () => {
  for (const value of DANGEROUS) {
    expect(isSafeUrl(value)).toBe(false);
  }
});

test("schemes that are not http or https are refused even when harmless", () => {
  // Not dangerous, but not a link to a repository or a profile either, and letting
  // them through means deciding case by case later.
  expect(isSafeUrl("ftp://example.com/x")).toBe(false);
  expect(isSafeUrl("mailto:someone@example.com")).toBe(false);
});

// --------------------------------------------------------------------------
// The ordinary cases
// --------------------------------------------------------------------------

test("http and https links are accepted", () => {
  expect(isSafeUrl("https://github.com/osini/repo")).toBe(true);
  expect(isSafeUrl("http://example.com/path?x=1#top")).toBe(true);
});

test("surrounding spaces do not stop a real link being accepted", () => {
  expect(isSafeUrl("  https://github.com/osini/repo  ")).toBe(true);
});

test("something that is not a URL at all is refused", () => {
  expect(isSafeUrl("not a url")).toBe(false);
  expect(isSafeUrl("github.com/osini/repo")).toBe(false);
  expect(isSafeUrl("")).toBe(false);
});

test("a link with no host is refused, because it goes nowhere", () => {
  expect(isSafeUrl("https://")).toBe(false);
});

test("anything that is not a string is refused rather than crashing", () => {
  expect(isSafeUrl(null)).toBe(false);
  expect(isSafeUrl(undefined)).toBe(false);
  expect(isSafeUrl(42)).toBe(false);
  expect(isSafeUrl({})).toBe(false);
  expect(isSafeUrl(["https://github.com"])).toBe(false);
});

// --------------------------------------------------------------------------
// isGithubUrl, for the profile field that is labelled GitHub
// --------------------------------------------------------------------------

test("a GitHub profile or repository link is accepted", () => {
  expect(isGithubUrl("https://github.com/osini")).toBe(true);
  expect(isGithubUrl("https://github.com/osini/codecritic")).toBe(true);
  expect(isGithubUrl("https://www.github.com/osini")).toBe(true);
  expect(isGithubUrl("HTTPS://GitHub.com/osini")).toBe(true);
});

test("a link to somewhere else is refused, because the field says GitHub", () => {
  expect(isGithubUrl("https://gitlab.com/osini")).toBe(false);
  expect(isGithubUrl("https://example.com")).toBe(false);
});

// The reason the host is compared exactly rather than with endsWith: a domain can be
// named to look like a familiar one and still be entirely unrelated.
test("a domain dressed up to look like GitHub is refused", () => {
  expect(isGithubUrl("https://github.com.example.org/osini")).toBe(false);
  expect(isGithubUrl("https://notgithub.com/osini")).toBe(false);
  expect(isGithubUrl("https://evil-github.com/osini")).toBe(false);
});

test("a GitHub link that runs script is still refused", () => {
  expect(isGithubUrl("javascript:alert(1)")).toBe(false);
});

// --------------------------------------------------------------------------
// Parity with the front end
//
// isSafeUrl and isGithubUrl exist twice: here, and in frontend/src/lib/url.ts. The
// browser cannot import from the back end, so the duplication is unavoidable. The two
// behaving differently would mean a form accepting something the API then rejects, or
// worse, staying quiet about something the API allows.
//
// This exact table is asserted in frontend/tests/lib/url.test.ts under the same
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

test("isSafeUrl agrees with the front end on every case in the shared table", () => {
  for (const [value, safe] of PARITY_CASES) {
    expect([value, isSafeUrl(value)]).toEqual([value, safe]);
  }
});

test("isGithubUrl agrees with the front end on every case in the shared table", () => {
  for (const [value, , github] of PARITY_CASES) {
    expect([value, isGithubUrl(value)]).toEqual([value, github]);
  }
});
