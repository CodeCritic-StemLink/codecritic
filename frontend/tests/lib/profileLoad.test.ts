// Tests for the decision that stops a profile being overwritten with blanks.
//
// Run with:  npm test    (from frontend)
//
// The bug these exist for: the profile setup form treated every failure to read the
// existing profile as "this person has no profile". If the API was restarting when the
// page opened, the form showed empty fields, and saving them wrote those blanks over a
// real bio and tech stack. It looked exactly like the site had forgotten the profile.
//
// The whole fix is that "the API said there is no user" and "the API did not answer"
// are different things. These tests are what keep them different.

import { classifyProfileLoadFailure, canSaveProfile } from "@/lib/profileLoad";
import { ApiError } from "@/api/api";

// --------------------------------------------------------------------------
// The one failure that means "there is genuinely nothing stored"
// --------------------------------------------------------------------------

test("the API saying there is no such user means this is a first time setup", () => {
  const error = new ApiError(404, "USER_NOT_FOUND", "No user with that username.");

  expect(classifyProfileLoadFailure(error)).toBe("new");
});

// --------------------------------------------------------------------------
// Everything else, each of which used to be misread as "no profile"
// --------------------------------------------------------------------------

// This is the exact failure in the bug report: the backend was restarting.
test("the server being unreachable does not mean the profile is gone", () => {
  const error = new Error("Could not reach the server. Is the API running on port 4000?");

  expect(classifyProfileLoadFailure(error)).toBe("unavailable");
});

test("a 500 does not mean the profile is gone", () => {
  const error = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.");

  expect(classifyProfileLoadFailure(error)).toBe("unavailable");
});

test("an expired token does not mean the profile is gone", () => {
  const error = new ApiError(401, "UNAUTHENTICATED", "You need to be signed in to do this.");

  expect(classifyProfileLoadFailure(error)).toBe("unavailable");
});

// A 404 that is not ours. Checking the code rather than the status matters: some other
// 404 is still not proof that this person has no profile.
test("a 404 with a different code is not read as a missing profile", () => {
  const error = new ApiError(404, "SUBMISSION_NOT_FOUND", "No submission with that id.");

  expect(classifyProfileLoadFailure(error)).toBe("unavailable");
});

test("something thrown that is not an error at all is still not a missing profile", () => {
  expect(classifyProfileLoadFailure("boom")).toBe("unavailable");
  expect(classifyProfileLoadFailure(null)).toBe("unavailable");
  expect(classifyProfileLoadFailure(undefined)).toBe("unavailable");
});

// --------------------------------------------------------------------------
// canSaveProfile, which is what the guard on the submit handler asks
// --------------------------------------------------------------------------

test("saving is allowed only once we know what is already stored", () => {
  expect(canSaveProfile("new")).toBe(true);
  expect(canSaveProfile("existing")).toBe(true);
});

// The two that would have caused the bug. Neither may ever save.
test("saving is refused while the profile is still loading", () => {
  expect(canSaveProfile("loading")).toBe(false);
});

test("saving is refused when the profile could not be read", () => {
  expect(canSaveProfile("unavailable")).toBe(false);
});
