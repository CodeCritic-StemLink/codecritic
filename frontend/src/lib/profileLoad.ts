import { ApiError } from "@/api/api";

// What we know about the profile somebody already has, before we let them save over it.
//
// This one decision is where a data loss bug lived, so it is a function of its own with
// tests rather than a catch block inside a component.
//
// The bug: any failure to read the existing profile was treated as "this person has no
// profile". If the API happened to be restarting when the setup page opened, the form
// showed empty fields under the heading "Finish your profile", and saving them wrote
// those blanks over a real bio and a real tech stack, because POST /users/sync writes
// every column it is given. From the outside it looked exactly like the site had
// forgotten the profile. It had not: the row was fine until the save flattened it.
//
// The distinction that fixes it is small and absolute. The API saying "no such user" is
// an answer. Everything else is the absence of an answer, and the two must not be
// treated the same way.

export type ProfileLoadState = "loading" | "new" | "existing" | "unavailable";

/**
 * Turns a failed `getMe` into what we actually know.
 *
 * @returns "new" only when the API told us there is no profile. "unavailable" for
 *          everything else, which is what stops the form saving.
 */
export function classifyProfileLoadFailure(error: unknown): ProfileLoadState {
  // USER_NOT_FOUND is the normal first time case: the Clerk account exists but
  // POST /users/sync has never run, so there is no row yet. This is the only failure
  // that means "there is nothing here to overwrite".
  if (error instanceof ApiError && error.code === "USER_NOT_FOUND") {
    return "new";
  }

  // Everything else: the server is down or restarting, the token expired, the API
  // answered 500, the machine is offline. In every one of these a profile may well
  // exist, and we must not let a blank form be written over it.
  return "unavailable";
}

/**
 * May the form be saved in this state?
 *
 * Only when we know what is already stored: either there is nothing (so nothing can be
 * lost) or we have it in front of us (so the form is a real edit of it).
 */
export function canSaveProfile(state: ProfileLoadState): boolean {
  return state === "new" || state === "existing";
}
