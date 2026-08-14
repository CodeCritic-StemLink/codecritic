import type { FeedItem } from "@/services/submission.service";

// Counting which technologies appear in a feed.
//
// This lives here rather than inside FeedFilters.tsx for the same reason
// ranking.service.ts stands apart from its repository on the back end: it is pure
// logic that takes values and returns values, so a test can call it directly without
// rendering a single component. A function buried inside a .tsx file can only be
// tested by mounting React, which needs a browser environment and is a much heavier
// thing to set up and explain.

/** The tag counts a feed produces, most used first. */
export type TagCount = {
  /** The spelling to show, chosen from the ones actually used. */
  tag: string;
  count: number;
};

/**
 * How one tag is compared with another.
 *
 * Trimmed and lowercased, matching normaliseTag in the back end's ranking.service.ts.
 * Tags are typed by hand on the post form, so the same technology arrives as "Node",
 * "node" and sometimes " node ". They are one technology to a reader and must be one
 * technology here.
 */
export function normaliseTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Are these two tags the same technology? Used to light up the selected filter. */
export function sameTag(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) return false;

  return normaliseTag(a) === normaliseTag(b);
}

/**
 * The most common technologies across these submissions.
 *
 * Spellings are grouped, so two submissions tagged "Node" and one tagged "node" are one
 * entry reading "Node 3" rather than two entries reading "Node 2" and "node 1". The
 * spelling shown is whichever one was used most, because that is the one most readers
 * will recognise, and ties there fall back to alphabetical so the label never flickers
 * between renders.
 *
 * Ties on the count are broken alphabetically for the same reason. Without it, two tags
 * on the same count could swap places between renders and the sidebar would appear to
 * shuffle itself for no reason.
 *
 * @param limit how many to return. The sidebar shows 8.
 */
export function popularTags(submissions: FeedItem[], limit: number): TagCount[] {
  // key: the normalised tag. value: how often each spelling of it was used.
  const groups = new Map<string, Map<string, number>>();

  for (const submission of submissions) {
    for (const tag of submission.tags) {
      const key = normaliseTag(tag);

      // A tag that is only spaces normalises to nothing and is not a technology.
      if (key === "") continue;

      const spellings = groups.get(key) ?? new Map<string, number>();
      spellings.set(tag.trim(), (spellings.get(tag.trim()) ?? 0) + 1);
      groups.set(key, spellings);
    }
  }

  return [...groups.values()]
    .map((spellings) => {
      /*
       * Most used spelling first. Ties fall back to a plain character comparison
       * rather than localeCompare, for two reasons: it does not depend on the server's
       * locale, and it puts capitals first, so an even split between "Node" and "node"
       * shows "Node", which is how the technology is actually written.
       */
      const used = [...spellings.entries()].sort(
        ([spellingA, timesA], [spellingB, timesB]) =>
          timesB - timesA || (spellingA < spellingB ? -1 : 1)
      );

      const count = used.reduce((running, [, times]) => running + times, 0);

      return { tag: used[0][0], count };
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, Math.max(0, limit));
}
