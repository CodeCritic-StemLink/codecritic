// What counts as a link somebody is allowed to store.
//
// This exists because "is it a valid URL" is not the question. Both `z.string().url()`
// and `new URL(value)` happily accept all of these:
//
//   javascript:alert(document.cookie)
//   data:text/html,<script>alert(1)</script>
//   file:///C:/Windows/System32/
//   vbscript:msgbox(1)
//
// They are valid URLs. They are not links. Every one of these values is later rendered
// as the href of an anchor: a submission's repoUrl on the detail page, a profile's
// githubUrl, and every resource link on a review. A stored `javascript:` href is script
// that runs in the reader's session when they click it, posted by anybody with an
// account.
//
// So the rule is the scheme, not the syntax. http and https, nothing else, checked
// on the back end where it cannot be skipped. frontend/src/lib/url.ts is the same rule
// again for the forms, and the two are pinned by a shared table of cases.

/** The only two schemes that may ever end up in an href. */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Is this a link we will store and later render?
 *
 * Parsed rather than pattern matched, so "https://x" and "HTTPS://X" and a URL with a
 * query string all behave the way the browser will behave with them.
 */
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
 * Used for the githubUrl on a profile, which is labelled GitHub in the form and shown
 * as a GitHub link on the profile. Somebody's personal site is a fine thing to have and
 * is not what this field is for.
 *
 * The host is checked exactly, plus the www form. `endsWith(".github.com")` would be
 * wrong in the other direction: it would accept `github.com.example.org`, which is a
 * classic way of dressing an unrelated domain up as a familiar one.
 */
export function isGithubUrl(value: unknown): value is string {
  if (!isSafeUrl(value)) return false;

  const host = new URL(value.trim()).hostname.toLowerCase();

  return host === "github.com" || host === "www.github.com";
}
