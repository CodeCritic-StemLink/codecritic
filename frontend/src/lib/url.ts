// What counts as a link somebody is allowed to save.
//
// DELIBERATELY DUPLICATED from backend/src/models/url.ts, which is the canonical one.
// The browser cannot import from the back end, and both sides need the rule: the back
// end because that is where it is actually enforced, and here so somebody finds out
// while they are typing rather than after pressing the button.
//
// Both sides are pinned by the same table of cases, so changing one without the other
// fails a test rather than shipping. See the "parity" block in tests/lib/url.test.ts
// and backend/tests/models/url.test.ts.
//
// The reason the rule is about the scheme and not the syntax: `javascript:alert(1)` is
// a genuinely valid URL, so every "is this a URL" check accepts it, and these values
// are later rendered as the href of a link other people click.

/** The only two schemes that may ever end up in an href. */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/** Is this a link we will save and later render? */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }

  // Protocol comes back lowercased by the parser, so "JaVaScRiPt:" is caught too.
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;

  // "https://" parses but has no host, and a link to nowhere is not a link.
  return parsed.hostname.length > 0;
}

/**
 * Is this a link to GitHub?
 *
 * The host is compared exactly, plus the www form, rather than with endsWith, which
 * would accept `github.com.example.org`.
 */
export function isGithubUrl(value: unknown): value is string {
  if (!isSafeUrl(value)) return false;

  const host = new URL(value.trim()).hostname.toLowerCase();

  return host === "github.com" || host === "www.github.com";
}

/**
 * The one line to show under a box holding a link, or null when there is nothing to
 * say. Kept here so the three forms word the same problem the same way.
 */
export function urlProblem(value: string, kind: "any" | "github" = "any"): string | null {
  const trimmed = value.trim();

  if (trimmed === "") return null;

  if (!isSafeUrl(trimmed)) {
    return "That is not a valid link. It should start with https://";
  }

  if (kind === "github" && !isGithubUrl(trimmed)) {
    return "That is not a GitHub link. It should look like https://github.com/you";
  }

  return null;
}
