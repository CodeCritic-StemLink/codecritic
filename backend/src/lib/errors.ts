import type { Response } from "express";

// Every error this API returns uses the same shape, so the front end only has to
// understand one thing:
//
//   { "error": { "code": "SELF_REVIEW_FORBIDDEN", "message": "..." } }
//
// The full list of codes is in docs/api-design.md section 4.

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "SUBMISSION_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "SELF_REVIEW_FORBIDDEN"
  | "DUPLICATE_REVIEW"
  | "INVALID_TITLE"
  | "INVALID_DESCRIPTION"
  | "INVALID_REPO_URL"
  | "INVALID_TAGS"
  | "INVALID_CRITERIA"
  | "INVALID_STRENGTHS"
  | "INVALID_IMPROVEMENTS"
  | "INVALID_RESOURCES"
  | "INCOMPLETE_RATINGS"
  | "INVALID_SCORE"
  | "INVALID_USERNAME"
  | "USERNAME_TAKEN"
  | "INVALID_BIO"
  | "INVALID_TECH_STACK"
  | "INVALID_GITHUB_URL"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR";

// Throw this anywhere in a route and the error handler in index.ts turns it into
// a proper JSON response with the right status code.
export class ApiError extends Error {
  status: number;
  code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sendError(res: Response, status: number, code: ErrorCode, message: string) {
  return res.status(status).json({ error: { code, message } });
}
