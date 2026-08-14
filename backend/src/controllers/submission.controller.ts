import type { Request, Response } from "express";

import { submissionService } from "../services/submission.service";
import { getOptionalUser } from "../middlewares/auth.middleware";
import { feedQuerySchema, feedErrorCodes } from "../models/submission.schema";
import { BadRequestError } from "../errors/appError";

// Controllers unpack the request, validate it, call a service, send the response.
// No database calls and no rules here. See docs/architecture.md.

export const submissionController = {
  /**
   * GET /api/submissions
   *
   * Works signed in or signed out. The SRS requires the public feed to be readable
   * without an account, so this asks who is calling rather than demanding it.
   */
  async getFeed(req: Request, res: Response) {
    const parsed = feedQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0] as keyof typeof feedErrorCodes;

      throw new BadRequestError(
        issue?.message ?? "Those filters are not valid.",
        feedErrorCodes[field] ?? "INVALID_TAGS"
      );
    }

    const viewer = await getOptionalUser(req);
    const result = await submissionService.getFeed(viewer, parsed.data);

    res.json(result);
  },
};
