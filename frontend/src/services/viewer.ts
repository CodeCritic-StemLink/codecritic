import { cache } from "react";
import { auth } from "@clerk/nextjs/server";

import { getMe } from "@/services/user.service";
import type { User } from "@/services/user.service";

// Who is looking at this page, asked once per request no matter how many components
// want to know.
//
// The navbar needs it for the karma chip. The profile page needs it to decide whether
// to draw an Edit button. Both are server components, both used to call GET /users/me
// themselves, and both run on every single page load because the navbar lives in the
// root layout. That was two round trips to Singapore for the same row, on every
// navigation, to render a number that had not changed.
//
// React's `cache` deduplicates by argument within one render pass. The first caller
// makes the request, every later caller in the same request gets the same promise, and
// the next request starts fresh. It is not a cache across requests: nothing is held
// between page loads, so karma is still correct the instant a review is written.
//
// The API call itself still says no-store. This removes the duplicate, not the freshness.

export type Viewer = {
  /** Our own User row. Null when signed out, or signed in but never synced. */
  me: User | null;
  /** True when Clerk knows who this is, whether or not we have a row for them. */
  signedIn: boolean;
};

/**
 * The viewer for this request.
 *
 * Never throws. A signed in visitor who has not finished profile setup has no row yet,
 * and an API that is briefly down must not take down every page on the site: the navbar
 * renders on every route, so a rethrown error here is a crashed site rather than a
 * missing karma chip. Callers get `me: null` and decide what that means for them.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const { userId, getToken } = await auth();

  if (!userId) {
    return { me: null, signedIn: false };
  }

  try {
    const token = await getToken();

    if (!token) {
      return { me: null, signedIn: true };
    }

    const { user } = await getMe(token);

    return { me: user, signedIn: true };
  } catch {
    // Swallowed on purpose. See above.
    return { me: null, signedIn: true };
  }
});
