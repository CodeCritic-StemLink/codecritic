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

/** One score on the detail page: the criterion's own label, so the front end never
 * has to join it back against a separate criteria list. */
export type ReviewRating = {
  criterionId: string;
  label: string;
  score: number;
};

export type SubmissionReview = {
  id: string;
  strengths: string;
  improvements: string;
  resources: string[];
  createdAt: string;
  reviewer: { username: string; karma: number };
  ratings: ReviewRating[];
};

export type SubmissionDetail = {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  tags: string[];
  createdAt: string;
  author: { username: string; karma: number; techStack: string[] };
  status: "pending" | "reviewed";
  criteria: Criterion[];
  reviews: SubmissionReview[];
  /** Whether this signed in viewer wrote the submission, and whether they already reviewed it. */
  viewer: { isAuthor: boolean; hasReviewed: boolean };
};

/**
 * One review request in full: criteria, every review, every rating. Optional auth,
 * same as the feed — a visitor can read a request without an account, and a signed in
 * viewer additionally gets the two flags that decide whether to show the review form.
 */
export function getSubmission(id: string, token?: string | null): Promise<SubmissionDetail> {
  return apiFetch<SubmissionDetail>(`/submissions/${id}`, { token });
}

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
