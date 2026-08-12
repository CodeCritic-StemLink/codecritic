import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler so a thrown error reaches the error middleware.
 *
 * Why this exists. Express 4 does not understand promises. If an async handler throws,
 * Express never finds out, so the error middleware never runs, and the request simply
 * hangs until the browser gives up. The client sees nothing at all, which is the worst
 * possible failure because it looks like a network problem rather than a bug.
 *
 * This catches the rejected promise and hands the error to next(), which is the signal
 * Express does understand.
 *
 * Use it on every async controller:
 *
 *   router.post("/", catchAsync(userController.sync));
 */
export function catchAsync(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
