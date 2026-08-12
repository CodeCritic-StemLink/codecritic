import type { Request } from "express";
import { getAuth } from "@clerk/express";

import { userRepository } from "../repositories/user.repository";
import { UnauthorizedError, NotFoundError } from "../errors/appError";
import type { User } from "../generated/prisma/client";

// Who is making this request?
//
// The answer always comes from the verified Clerk token, never from anything in the
// request body. If a body contained a userId we ignore it, otherwise anyone could
// claim to be anyone.

/**
 * The Clerk id of the caller, or null when nobody is signed in.
 *
 * Use this where signing in is optional, like the public feed, which the SRS requires
 * to work while logged out.
 */
export function getClerkId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

/**
 * Our own User row for the caller.
 *
 * Throws 401 when there is no valid token, and 404 when the token is valid but no row
 * exists yet. That second case means somebody signed in through Clerk but the front end
 * has not called POST /users/sync, so they exist to Clerk and not to us.
 */
export async function requireUser(req: Request): Promise<User> {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    throw new UnauthorizedError();
  }

  const user = await userRepository.findByClerkId(clerkId);

  if (!user) {
    throw new NotFoundError(
      "You are signed in but have not finished setting up your profile.",
      "USER_NOT_FOUND"
    );
  }

  return user;
}

/** Our own User row for the caller, or null when they are not signed in or not synced. */
export async function getOptionalUser(req: Request): Promise<User | null> {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    return null;
  }

  return userRepository.findByClerkId(clerkId);
}
