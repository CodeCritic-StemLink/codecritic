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

export type ProfileInput = {
  username: string;
  bio?: string;
  techStack: string[];
  githubUrl?: string;
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
 * Your own row. Used by the navbar for the karma chip and the "who am I" links.
 *
 * Throws `USER_NOT_FOUND` when signed in to Clerk but `POST /users/sync` has never
 * run, which callers should treat as "not finished setting up" rather than an error.
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
