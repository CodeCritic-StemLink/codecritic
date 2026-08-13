import type { Request, Response } from "express";

import { submissionService } from "../services/submission.service";
import { getOptionalUser } from "../middlewares/auth.middleware";
import { feedQuerySchema } from "../models/submission.schema";
import { BadRequestError, NotFoundError } from "../errors/appError";

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
      throw new BadRequestError(
        issue?.message ?? "Those filters are not valid.",
        "INVALID_TAGS"
      );
    }

    const viewer = await getOptionalUser(req);
    const result = await submissionService.getFeed(viewer, parsed.data);

    res.json(result);
  },

  /**
   * GET /api/submissions/:id
   *
   * One request in full, with criteria, reviews and ratings. Optional auth: signed in
   * users get the two viewer flags the review form uses to decide whether to show
   * itself at all.
   */
  async getById(req: Request, res: Response) {
    const viewer = await getOptionalUser(req);
    const submission = await submissionService.getById(viewer, req.params.id);

    if (!submission) {
      throw new NotFoundError("No submission has that id.", "SUBMISSION_NOT_FOUND");
    }

    res.json(submission);
  },
};