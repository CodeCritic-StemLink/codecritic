import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { requireUser, getClerkId } from "../lib/auth";
import { ApiError } from "../lib/errors";

export const usersRouter = Router();

// The shape a profile must have, checked on the server before anything is saved.
//
// Note what is NOT in here: karma. If a request body contains it, zod strips it,
// so there is no path where a caller can hand themselves points. Karma only ever
// changes inside the review transaction.
const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be 30 characters or fewer.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores."),
  bio: z.string().trim().max(500, "Bio must be 500 characters or fewer.").optional(),
  techStack: z
    .array(z.string().trim().min(1))
    .max(20, "You can list at most 20 technologies.")
    .default([]),
  githubUrl: z.string().trim().url("That is not a valid URL.").optional().or(z.literal("")),
});

// Turns a zod failure into our standard error shape, picking the code that matches
// whichever field went wrong so the front end can highlight the right input.
function toApiError(error: z.ZodError): ApiError {
  const issue = error.issues[0];
  const field = issue?.path[0];

  const codes = {
    username: "INVALID_USERNAME",
    bio: "INVALID_BIO",
    techStack: "INVALID_TECH_STACK",
    githubUrl: "INVALID_GITHUB_URL",
  } as const;

  const code = codes[field as keyof typeof codes] ?? "INVALID_USERNAME";

  return new ApiError(400, code, issue?.message ?? "That profile is not valid.");
}

/**
 * POST /api/users/sync
 *
 * Called by the front end straight after a Clerk sign in. Creates our User row the
 * first time we see a Clerk identity, updates it after that.
 *
 * This closes the gap the SRS points at: Clerk knows who someone is, but the karma,
 * the tech stack and everything they have posted live in our own database, and the
 * two are joined by clerkId.
 */
usersRouter.post("/sync", async (req, res, next) => {
  try {
    const clerkId = getClerkId(req);

    if (!clerkId) {
      throw new ApiError(401, "UNAUTHENTICATED", "You need to be signed in to do this.");
    }

    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      throw toApiError(parsed.error);
    }

    const { username, bio, techStack, githubUrl } = parsed.data;

    // Usernames are unique. Check whether this one belongs to somebody else before
    // trying to save, so the caller gets a clear message instead of a database error.
    const existing = await prisma.user.findUnique({ where: { username } });

    if (existing && existing.clerkId !== clerkId) {
      throw new ApiError(409, "USERNAME_TAKEN", "Somebody already has that username.");
    }

    const user = await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        username,
        bio: bio || null,
        techStack,
        githubUrl: githubUrl || null,
      },
      update: {
        username,
        bio: bio || null,
        techStack,
        githubUrl: githubUrl || null,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/me
 *
 * Edit your own profile.
 *
 * There is deliberately no id in this path. There is no route in this API that can
 * be aimed at somebody else's row, which is the simplest possible answer to the SRS
 * rule that a user must not be able to edit another user's profile.
 */
usersRouter.patch("/me", async (req, res, next) => {
  try {
    const me = await requireUser(req);

    const parsed = profileSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      throw toApiError(parsed.error);
    }

    const { username, bio, techStack, githubUrl } = parsed.data;

    if (username && username !== me.username) {
      const existing = await prisma.user.findUnique({ where: { username } });

      if (existing) {
        throw new ApiError(409, "USERNAME_TAKEN", "Somebody already has that username.");
      }
    }

    const user = await prisma.user.update({
      where: { id: me.id },
      data: {
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(techStack !== undefined && { techStack }),
        ...(githubUrl !== undefined && { githubUrl: githubUrl || null }),
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:username  belongs to Aqeel. This is Feature 02.
//
// Return bio, techStack, githubUrl, karma, the count of reviews given, the count of
// reviews received, and the insights listed in docs/api-design.md. Every figure must
// be counted from real rows.
//
// The one to be careful with: reviews received is NOT reviews where this person is
// the reviewer. It is reviews written on submissions this person wrote.
//
// Add it below this comment so we do not both edit the same lines.
// ---------------------------------------------------------------------------
