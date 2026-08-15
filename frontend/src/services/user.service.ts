import { apiFetch } from "@/api/api";

// Everything the app does with users. Pages call these, never fetch directly.

export type User = {
  id: string;
  username: string;
  bio: string | null;
  techStack: string[];
  githubUrl: string | null;
  karma: number;
};

/**
 * What the profile form sends.
 *
 * bio and githubUrl are `string | null`, not `string | undefined`, and the difference
 * decides whether an edit can empty a field:
 *
 *   null       clear it
 *   absent     leave whatever is stored alone
 *
 * They used to be sent as undefined when the box was blank. JSON.stringify drops
 * undefined keys, so the field never reached the API, and the update left the old
 * value in place. You could change a bio but never remove one.
 */
export type ProfileInput = {
  username: string;
  bio?: string | null;
  techStack: string[];
  githubUrl?: string | null;
};

/**
 * Creates our User row the first time somebody signs in, and updates it after that.
 *
 * This is the join between Clerk and our own database. Clerk knows who you are. Your
 * karma, your tech stack and everything you post live in our database, and the two are
 * tied together by the Clerk id, which the API reads from the token rather than from
 * anything we send.
 */
export function syncProfile(input: ProfileInput, token: string): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/users/sync", {
    method: "POST",
    token,
    body: input,
  });
}

/**
 * Edits the profile you already have.
 *
 * Different from syncProfile in the one way that matters: this is a partial update, so
 * a field left out is left alone, while sync writes every field it is given and nulls
 * anything it is not.
 *
 * That is why the edit form uses this one. Sync is for the very first save, when there
 * is no row yet and nothing to lose. Once a profile exists, a save that could not first
 * read what was there must not be able to flatten it.
 *
 * There is no id in the path on purpose. The row updated is whichever one the caller's
 * own token resolves to, so this cannot be aimed at somebody else's profile.
 */
export function updateProfile(input: Partial<ProfileInput>, token: string): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/users/me", {
    method: "PATCH",
    token,
    body: input,
  });
}

/**
 * Your own row. Used by the navbar for the karma chip and the "who am I" links.
 *
 * Throws `USER_NOT_FOUND` when signed in to Clerk but `POST /users/sync` has never
 * run, which callers should treat as "not finished setting up" rather than an error.
 * Every other failure means we do not know whether a profile exists, which is a
 * different thing and must not be treated as "there is none".
 */
export function getMe(token: string): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/users/me", { token });
}

/** One technology and how many reviews this person has written on submissions tagged with it. */
export type TagCount = { tag: string; count: number };

/** One calendar month, "2026-08", and how many reviews this person wrote in it. */
export type MonthCount = { month: string; count: number };

export type ProfileInsights = {
  reviewsByTag: TagCount[];
  reviewsByMonth: MonthCount[];
  /** Null when this person has never rated anything, not a misleading 0. */
  averageScoreGiven: number | null;
};

export type ProfileSubmission = {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  reviewCount: number;
  status: "pending" | "reviewed";
};

/** One score, with the criterion it was scored against, inside a review list item. */
export type RatingItem = { criterionId: string; label: string; score: number };

/** One review this person wrote, in the "reviews I have written" list. */
export type ReviewGivenItem = {
  id: string;
  strengths: string;
  improvements: string;
  resources: string[];
  createdAt: string;
  submission: { id: string; title: string };
  ratings: RatingItem[];
};

/** One review written on this person's own work, in the "reviews I have received" list. */
export type ReviewReceivedItem = ReviewGivenItem & {
  reviewer: { username: string };
};

export type PublicProfile = {
  username: string;
  bio: string | null;
  techStack: string[];
  githubUrl: string | null;
  karma: number;
  reviewsGiven: number;
  reviewsReceived: number;
  insights: ProfileInsights;
  submissions: ProfileSubmission[];
  reviewsGivenList: ReviewGivenItem[];
  reviewsReceivedList: ReviewReceivedItem[];
};

/**
 * A public profile. Feature 02.
 *
 * Works logged out: the SRS requires that anyone can view anyone's profile without an
 * account, so this never sends a token.
 */
export function getProfile(username: string): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/users/${encodeURIComponent(username)}`);
}
