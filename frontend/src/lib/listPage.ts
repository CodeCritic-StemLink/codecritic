// Paging a list that lives inside a page, rather than the page itself.
//
// The profile has three of these at once: requests posted, reviews written, reviews
// received. Each keeps its page in the query string under its own key, so the profile
// stays a server component and a particular view of it is still a real address. Same
// decision as the feed's filters, for the same reason.
//
// Both functions live here rather than inside the profile page for the same reason
// feedUrl and popularTags do: they are pure, so a test can call them directly instead
// of rendering a page and reading HTML back out of it.

/** How many items each list shows before it needs a pager. */
export const PER_PAGE = 4;

export type PagedList<T> = {
  page: number;
  lastPage: number;
  visible: T[];
};

/**
 * One page of a list, and how many pages there are.
 *
 * The page number comes from the query string, which means it comes from whatever
 * somebody typed in the address bar. `?given=99`, `?given=0`, `?given=-3` and
 * `?given=banana` are all things that will happen, so it is clamped into range rather
 * than trusted: out of range shows the nearest real page instead of an empty card.
 */
export function paginate<T>(items: T[], raw: string | undefined, perPage = PER_PAGE): PagedList<T> {
  const lastPage = Math.max(1, Math.ceil(items.length / perPage));
  const asked = Number(raw);

  // Number("") is 0, not NaN, so an empty value has to fall through the clamp rather
  // than the isFinite check. It ends up on page one either way.
  const page = Number.isFinite(asked) ? Math.min(Math.max(1, Math.trunc(asked)), lastPage) : 1;
  const start = (page - 1) * perPage;

  return { page, lastPage, visible: items.slice(start, start + perPage) };
}

/**
 * The address for one list's page, leaving every other list where it is.
 *
 * Turning to page two of "reviews received" must not send "requests posted" back to
 * page one, so every other key on the page is carried through untouched.
 */
export function listPageUrl(
  current: Record<string, string | undefined>,
  param: string,
  page: number
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value !== undefined && key !== param) {
      query.set(key, value);
    }
  }

  // Page one is left out, so the first page of a list has one address rather than two.
  if (page > 1) {
    query.set(param, String(page));
  }

  const text = query.toString();

  return text ? `?${text}` : "?";
}
