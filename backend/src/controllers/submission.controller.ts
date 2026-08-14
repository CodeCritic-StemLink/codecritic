import type { Request, Response } from "express";
import { z } from "zod";

import { submissionService } from "../services/submission.service";
import { getOptionalUser, requireUser } from "../middlewares/auth.middleware";
import {
  feedQuerySchema,
  feedErrorCodes,
  createSubmissionSchema,
  createSubmissionErrorCodes,
} from "../models/submission.schema";
import { BadRequestError, NotFoundError } from "../errors/appError";
import type { ErrorCode } from "../errors/appError";

// Controllers unpack the request, validate it, call a service, send the response.
// No database calls and no rules here. See docs/architecture.md.

/** Turns a zod failure into our error shape, with the code matching the field that failed. */
function toBadRequest(error: z.ZodError): BadRequestError {
  const issue = error.issues[0];
  const field = issue?.path[0] as keyof typeof createSubmissionErrorCodes;
  const code: ErrorCode = createSubmissionErrorCodes[field] ?? "INVALID_TITLE";

  return new BadRequestError(issue?.message ?? "That request is not valid.", code);
}

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

  /**
   * POST /api/submissions
   *
   * requireUser throws 401 with no token, and 404 USER_NOT_FOUND if the caller is known
   * to Clerk but has never called POST /users/sync — either way, execution stops before
   * validation runs, so an anonymous caller cannot even discover what the field rules are.
   */
  async create(req: Request, res: Response) {
    const author = await requireUser(req);

    const parsed = createSubmissionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw toBadRequest(parsed.error);
    }

    const submission = await submissionService.createSubmission(author, parsed.data);

    res.status(201).json(submission);
  },
};