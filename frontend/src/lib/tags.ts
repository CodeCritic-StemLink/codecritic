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
  tag: string;
  count: number;
};

/**
 * The most common technologies across these submissions.
 *
 * Ties are broken alphabetically rather than left to chance. Without that, two tags
 * with the same count could swap places between renders and the sidebar would appear
 * to shuffle itself for no reason.
 *
 * @param limit how many to return. The sidebar shows 8.
 */
export function popularTags(submissions: FeedItem[], limit: number): TagCount[] {
  const counts = new Map<string, number>();

  for (const submission of submissions) {
    for (const tag of submission.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, Math.max(0, limit));
}
