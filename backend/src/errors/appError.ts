// One error hierarchy for the whole API.
//
// Any layer can throw one of these. Nobody writes res.status(...).json(...) by hand
// except the error middleware, which catches these and turns them into a response.
//
// Every error carries two things:
//   status  the HTTP status code
//   code    a short machine readable string the front end can switch on

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SUBMISSION_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "SELF_REVIEW_FORBIDDEN"
  | "DUPLICATE_REVIEW"
  | "INVALID_TITLE"
  | "INVALID_DESCRIPTION"
  | "INVALID_REPO_URL"
  | "INVALID_TAGS"
  | "INVALID_STATUS"
  | "INVALID_PAGE"
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
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

/**
 * The base every other error extends.
 *
 * isOperational marks errors we caused on purpose, meaning we know what went wrong
 * and the message is safe to show a user. An error that is not operational is a bug,
 * and we hide its details behind a generic message so we do not leak our file paths
 * to whoever is poking at the API.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly isOperational = true;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400. The request body did not pass validation. */
export class BadRequestError extends AppError {
  constructor(message: string, code: ErrorCode = "INVALID_TITLE") {
    super(400, code, message);
  }
}

/** 401. No valid Clerk token was sent. */
export class UnauthorizedError extends AppError {
  constructor(message = "You need to be signed in to do this.") {
    super(401, "UNAUTHENTICATED", message);
  }
}

/** 403. Signed in, but not allowed to do this particular thing. */
export class ForbiddenError extends AppError {
  constructor(message: string, code: ErrorCode = "FORBIDDEN") {
    super(403, code, message);
  }
}

/** 404. The thing being asked for does not exist. */
export class NotFoundError extends AppError {
  constructor(message: string, code: ErrorCode = "NOT_FOUND") {
    super(404, code, message);
  }
}

/** 409. The request clashes with something that already exists. */
export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = "DUPLICATE_REVIEW") {
    super(409, code, message);
  }
}
