import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/appError";
import { logger } from "../config/logger";

/**
 * The last middleware in the chain. Every error in the API ends up here.
 *
 * Without this, an unexpected error sends back an HTML stack trace. That tells whoever
 * is poking at our API about our file paths and package versions, and tells the front
 * end nothing it can act on.
 *
 * Everything leaves here in the same shape:
 *
 *   { "error": { "code": "SELF_REVIEW_FORBIDDEN", "message": "..." } }
 */
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // An error we threw on purpose. We know what happened and the message is safe to show.
  if (err instanceof AppError) {
    logger.warn(`${req.method} ${req.originalUrl} ${err.status} ${err.code}: ${err.message}`);

    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Anything else is a bug. Log the whole thing for us, tell the caller nothing.
  logger.error(`${req.method} ${req.originalUrl} unhandled error`, err);

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side.",
    },
  });
}

/** Runs when no route matched. Sits just before the error middleware. */
export function notFoundMiddleware(req: Request, res: Response) {
  return res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `No endpoint at ${req.method} ${req.originalUrl}.`,
    },
  });
}
