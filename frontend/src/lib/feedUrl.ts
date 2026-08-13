// Builds feed URLs while keeping the filters that are already on.
//
// Every filter on the feed lives in the address bar, not in React state. That is what
// makes a filtered feed a real link somebody can bookmark or paste into the group chat,
// and it is why the whole page can stay a server component.
//
// The catch with URL filters is that each control has to preserve the others. Clicking
// a tag must not silently drop the search box. One function does that for all of them.

export type FeedParams = {
  search?: string;
  tag?: string;
  status?: "pending" | "reviewed";
  page?: string;
  why?: string;
};

/** Changing any of these means you are looking at a different set of results. */
const FILTERS = ["search", "tag", "status"] as const;

/**
 * The current feed URL with some parts changed.
 *
 * Pass `undefined` for a value to leave it as it is, and `null` to clear it. That
 * difference matters: "leave the tag alone" and "remove the tag" are different clicks.
 *
 * Changing a filter also sends you back to page one, unless the caller asks for a
 * specific page. Without that rule, filtering while on page 5 leaves you on page 5 of
 * a three page result, which is an empty screen and looks like the site is broken.
 */
export function feedUrl(
  current: FeedParams,
  changes: Partial<Record<keyof FeedParams, string | null>> = {}
): string {
  const merged: Record<string, string | null | undefined> = {
    search: current.search,
    tag: current.tag,
    status: current.status,
    page: current.page,
    why: current.why,
  };

  // Applied one key at a time rather than by spreading `changes` on top.
  //
  // Spreading looks equivalent and is not: it copies keys whose value is undefined as
  // well, so { tag: undefined } would overwrite the current tag with undefined and
  // clear it. That is the opposite of what undefined is supposed to mean here, and it
  // is the exact bug tests/lib/feedUrl.test.ts caught.
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  const changedAFilter = FILTERS.some((name) => changes[name] !== undefined);
  const askedForAPage = changes.page !== undefined;

  if (changedAFilter && !askedForAPage) {
    merged.page = null;
  }

  // Page one is the default, so leaving it out keeps the address clean and means the
  // same set of results always has exactly one address rather than two.
  if (merged.page === "1") {
    merged.page = null;
  }

  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `/?${query}` : "/";
}
