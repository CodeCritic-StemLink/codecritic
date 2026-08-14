import { apiFetch } from "@/api/api";
import { FEED_PAGE_SIZE } from "@/constants/constants";

// Everything the app does with submissions. Pages call these, never fetch directly.

/** The score breakdown, only present when somebody is signed in. */
export type ScoreBreakdown = {
  total: number;
  tagPoints: number;
  matchedTags: string[];
  recencyPoints: number;
  needsHelpPoints: number;
};

export type Criterion = {
  id: string;
  label: string;
  position: number;
};

export type FeedItem = {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  tags: string[];
  createdAt: string;
  author: { username: string; karma: number };
  criteria: Criterion[];
  reviewCount: number;
  status: "pending" | "reviewed";
  score?: ScoreBreakdown;
};

export type FeedResult = {
  submissions: FeedItem[];
  page: number;
  limit: number;
  total: number;
  /** True when the API reordered the list for the signed in user. */
  personalised: boolean;
};

export type FeedFilters = {
  search?: string;
  tag?: string;
  status?: "pending" | "reviewed";
  page?: number;
};

/**
 * The feed.
 *
 * Works with or without a token. Without one the API returns newest first, with one it
 * returns the same submissions reordered for that person, plus the score breakdown.
 */
export function getFeed(filters: FeedFilters = {}, token?: string | null): Promise<FeedResult> {
  return apiFetch<FeedResult>("/submissions", {
    token,
    query: {
      search: filters.search,
      tag: filters.tag,
      status: filters.status,
      page: filters.page ?? 1,
      limit: FEED_PAGE_SIZE,
    },
  });
}

/**
 * What the post-a-request form sends. Matches POST /submissions in api-design.md exactly:
 * title, description, repoUrl, 1 to 10 tags, 1 to 5 criteria labels.
 *
 * No authorId here on purpose. The API takes the author from the verified Clerk token and
 * ignores anything the body sends for it, so there is nothing to put here even if we wanted to.
 */
export type CreateSubmissionInput = {
  title: string;
  description: string;
  repoUrl: string;
  tags: string[];
  criteria: string[];
};

/** The full submission shape the API returns after creating one, same as GET /submissions/:id. */
export type SubmissionDetail = {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  tags: string[];
  createdAt: string;
  author: { username: string; karma: number };
  status: "pending" | "reviewed";
  criteria: Criterion[];
};

/**
 * Posts a new review request.
 *
 * Requires a token: the API answers 401 without one. Every validation rule in
 * api-design.md (INVALID_TITLE, INVALID_DESCRIPTION, INVALID_REPO_URL, INVALID_TAGS,
 * INVALID_CRITERIA) runs server side, so a caught ApiError here carries the real reason,
 * not a guess the form made up.
 */
export function createSubmission(
  input: CreateSubmissionInput,
  token: string
): Promise<SubmissionDetail> {
  return apiFetch<SubmissionDetail>("/submissions", {
    method: "POST",
    token,
    body: input,
  });
}
