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
