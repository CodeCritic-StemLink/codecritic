import type { Request, Response } from "express";
import { z } from "zod";

import { userService } from "../services/user.service";
import { getClerkId, requireUser } from "../middlewares/auth.middleware";
import { profileSchema, updateProfileSchema, profileErrorCodes } from "../models/user.schema";
import { BadRequestError, UnauthorizedError } from "../errors/appError";
import type { ErrorCode } from "../errors/appError";

// Controllers unpack the request, validate it, call a service, and send the response.
// No database calls and no rules live here. See docs/architecture.md.

/** Turns a zod failure into our error shape, with the code matching the field that failed. */
function toBadRequest(error: z.ZodError): BadRequestError {
  const issue = error.issues[0];
  const field = issue?.path[0] as keyof typeof profileErrorCodes;
  const code: ErrorCode = profileErrorCodes[field] ?? "INVALID_USERNAME";

  return new BadRequestError(issue?.message ?? "That profile is not valid.", code);
}

export const userController = {
  /** POST /api/users/sync */
  async sync(req: Request, res: Response) {
    const clerkId = getClerkId(req);

    if (!clerkId) {
      throw new UnauthorizedError();
    }

    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      throw toBadRequest(parsed.error);
    }

    const user = await userService.syncProfile(clerkId, parsed.data);

    res.json({ user });
  },

  /** GET /api/users/me. Your own row, for the navbar's karma chip and avatar. */
  async getMe(req: Request, res: Response) {
    const me = await requireUser(req);

    res.json({ user: me });
  },

  /** PATCH /api/users/me */
  async updateMe(req: Request, res: Response) {
    const me = await requireUser(req);

    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      throw toBadRequest(parsed.error);
    }

    const user = await userService.updateProfile(me, parsed.data);

    res.json({ user });
  },

  /** GET /api/users/:username. Public profile with insights. Feature 02. */
  async getByUsername(req: Request, res: Response) {
    const profile = await userService.getProfile(req.params.username);

    res.json(profile);
  },
};
