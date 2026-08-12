import type { Request } from "express";
import { getAuth } from "@clerk/express";

import { prisma } from "./prisma";
import { ApiError } from "./errors";

// Who is making this request?
//
// The answer always comes from the Clerk token, never from anything in the body.
// If a request body contained a userId we would ignore it, otherwise anyone could
// claim to be anyone.

/**
 * Returns the Clerk id of the caller, or null if they are not signed in.
 * Use this where being signed in is optional, like the public feed.
 */
export function getClerkId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

/**
 * Returns our own User row for the caller.
 *
 * Throws 401 if there is no valid token, and 404 if the token is valid but no row
 * exists yet. That second case means they signed in with Clerk but the front end
 * has not called POST /users/sync, so they exist to Clerk and not to us.
 */
export async function requireUser(req: Request) {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    throw new ApiError(401, "UNAUTHENTICATED", "You need to be signed in to do this.");
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    throw new ApiError(
      404,
      "USER_NOT_FOUND",
      "You are signed in but have not finished setting up your profile."
    );
  }

  return user;
}
