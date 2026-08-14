import { apiFetch } from "@/api/api";

// Everything the app does with reviews. Pages call this, never fetch directly.

export type ReviewInput = {
  strengths: string;
  improvements: string;
  resources?: string[];
  ratings: { criterionId: string; score: number }[];
};

export type CreateReviewResult = {
  review: {
    id: string;
    strengths: string;
    improvements: string;
    resources: string[];
    createdAt: string;
    reviewer: { username: string; karma: number };
    ratings: { criterionId: string; score: number }[];
  };
  /** The reviewer's new Karma total, so the nav bar can update without another request. */
  karma: number;
};

/**
 * Writes a review on somebody else's submission. Auth required: the API rejects
 * self reviews and duplicate reviews, and awards exactly +2 Karma on success.
 */
export function createReview(
  submissionId: string,
  input: ReviewInput,
  token: string
): Promise<CreateReviewResult> {
  return apiFetch<CreateReviewResult>(`/submissions/${submissionId}/reviews`, {
    method: "POST",
    token,
    body: input,
  });
}
