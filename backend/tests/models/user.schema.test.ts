// Tests for the profile rules behind POST /users/sync and PATCH /users/me.
//
// Run with:  npm test
//
// user.schema.ts imports zod and nothing else, so this needs no database. That is the
// same reason ranking.service.ts and the other schemas stand alone: a rule you can
// call directly is a rule you can prove.
//
// The one worth reading first is the karma test near the bottom. It is the reason the
// SRS says Karma must not be obtainable without a genuine review, and the mechanism
// that enforces it is not a check anywhere in our code, it is zod dropping a field it
// was never told about.

import {
  profileSchema,
  updateProfileSchema,
  profileErrorCodes,
} from "../../src/models/user.schema";

/** A profile that satisfies every rule, so each test can break exactly one thing. */
function validProfile(overrides: Record<string, unknown> = {}) {
  return {
    username: "osini_dev",
    bio: "Full stack, one week deep.",
    techStack: ["React", "Next.js"],
    githubUrl: "https://github.com/osini",
    ...overrides,
  };
}

/** The field zod blamed, which is what the controller turns into an error code. */
function failedField(body: unknown): string | undefined {
  const result = profileSchema.safeParse(body);
  if (result.success) return undefined;
  return String(result.error.issues[0]?.path[0]);
}

// --------------------------------------------------------------------------
// The happy path
// --------------------------------------------------------------------------

test("a profile that follows every rule is accepted", () => {
  expect(profileSchema.safeParse(validProfile()).success).toBe(true);
});

test("surrounding whitespace is trimmed, so it is never stored", () => {
  const result = profileSchema.parse(
    validProfile({ username: "  osini_dev  ", bio: "  hello  ", techStack: ["  React  "] })
  );

  expect(result.username).toBe("osini_dev");
  expect(result.bio).toBe("hello");
  expect(result.techStack).toEqual(["React"]);
});

// --------------------------------------------------------------------------
// The rule the SRS names: Karma cannot be handed to yourself
// --------------------------------------------------------------------------

// The SRS says Karma must not be obtainable without a genuine review, and warns that
// somebody will try to farm it. This is what stops the simplest attempt: putting it in
// the body of a profile save. The schema never declares karma, so zod removes it before
// a single line of our code sees the request.
test("karma in the body is stripped and never reaches our code", () => {
  const result = profileSchema.parse(validProfile({ karma: 9999 }));

  expect("karma" in result).toBe(false);
});

test("clerkId in the body is stripped too, so nobody can claim another identity", () => {
  const result = profileSchema.parse(validProfile({ clerkId: "user_somebody_else" }));

  expect("clerkId" in result).toBe(false);
});

test("only the four profile fields survive parsing", () => {
  const result = profileSchema.parse(
    validProfile({ karma: 500, id: "abc", createdAt: "1999-01-01" })
  );

  expect(Object.keys(result).sort()).toEqual(["bio", "githubUrl", "techStack", "username"]);
});

// --------------------------------------------------------------------------
// Username
// --------------------------------------------------------------------------

test("a username under 3 characters is rejected", () => {
  expect(failedField(validProfile({ username: "ab" }))).toBe("username");
});

test("exactly 3 characters is accepted, and 30 is too, since both limits are inclusive", () => {
  expect(profileSchema.safeParse(validProfile({ username: "abc" })).success).toBe(true);
  expect(profileSchema.safeParse(validProfile({ username: "a".repeat(30) })).success).toBe(true);
});

test("31 characters is rejected", () => {
  expect(failedField(validProfile({ username: "a".repeat(31) }))).toBe("username");
});

test("a username with a space is rejected", () => {
  expect(failedField(validProfile({ username: "osini dev" }))).toBe("username");
});

// Usernames end up in a URL at /profile/:username, so anything needing encoding would
// make a link that is awkward at best and broken at worst.
test("a username with a slash or a dot is rejected, because it goes in a URL", () => {
  expect(failedField(validProfile({ username: "osini/dev" }))).toBe("username");
  expect(failedField(validProfile({ username: "osini.dev" }))).toBe("username");
});

test("underscores and digits are allowed", () => {
  expect(profileSchema.safeParse(validProfile({ username: "osini_dev_99" })).success).toBe(true);
});

test("a missing username is rejected, because everything else can be empty but this cannot", () => {
  const body = validProfile();
  delete (body as Record<string, unknown>).username;

  expect(failedField(body)).toBe("username");
});

// --------------------------------------------------------------------------
// Bio
// --------------------------------------------------------------------------

test("no bio at all is fine, it is optional", () => {
  const body = validProfile();
  delete (body as Record<string, unknown>).bio;

  expect(profileSchema.safeParse(body).success).toBe(true);
});

test("a bio of exactly 500 characters is accepted, and 501 is not", () => {
  expect(profileSchema.safeParse(validProfile({ bio: "a".repeat(500) })).success).toBe(true);
  expect(failedField(validProfile({ bio: "a".repeat(501) }))).toBe("bio");
});

// --------------------------------------------------------------------------
// Tech stack, which is what Feature 01 ranks against
// --------------------------------------------------------------------------

test("an empty tech stack is allowed, and defaults to an empty array when missing", () => {
  const body = validProfile();
  delete (body as Record<string, unknown>).techStack;

  const result = profileSchema.parse(body);
  expect(result.techStack).toEqual([]);
});

test("twenty technologies are allowed, twenty one are not", () => {
  const twenty = Array.from({ length: 20 }, (_, i) => `tech${i}`);

  expect(profileSchema.safeParse(validProfile({ techStack: twenty })).success).toBe(true);
  expect(failedField(validProfile({ techStack: [...twenty, "tech20"] }))).toBe("techStack");
});

test("a blank technology is rejected rather than quietly stored as an empty string", () => {
  expect(failedField(validProfile({ techStack: ["React", "   "] }))).toBe("techStack");
});

// --------------------------------------------------------------------------
// GitHub URL
// --------------------------------------------------------------------------

test("no GitHub link is fine", () => {
  const body = validProfile();
  delete (body as Record<string, unknown>).githubUrl;

  expect(profileSchema.safeParse(body).success).toBe(true);
});

// The profile form submits every field, so clearing the box sends "" rather than
// leaving the key out. Without the empty string being allowed, clearing a GitHub link
// would fail validation and there would be no way to remove one.
test("an empty string is accepted, which is how somebody clears their link", () => {
  expect(profileSchema.safeParse(validProfile({ githubUrl: "" })).success).toBe(true);
});

test("something that is not a URL is rejected", () => {
  expect(failedField(validProfile({ githubUrl: "github.com/osini" }))).toBe("githubUrl");
});

// --------------------------------------------------------------------------
// Editing, where only the changed fields are sent
// --------------------------------------------------------------------------

test("an edit may carry one field on its own", () => {
  expect(updateProfileSchema.safeParse({ bio: "New bio." }).success).toBe(true);
});

test("an empty edit is accepted, since changing nothing is not an error", () => {
  expect(updateProfileSchema.safeParse({}).success).toBe(true);
});

test("an edit still enforces the rules on whatever it does carry", () => {
  expect(updateProfileSchema.safeParse({ username: "ab" }).success).toBe(false);
});

test("an edit cannot smuggle karma in either", () => {
  const result = updateProfileSchema.parse({ bio: "New bio.", karma: 9999 });

  expect("karma" in result).toBe(false);
});

// --------------------------------------------------------------------------
// The field to error code mapping
// --------------------------------------------------------------------------

// The controller reads the failed field from zod and looks the code up here. A field
// missing from this map would fall back to INVALID_USERNAME and blame the wrong thing,
// which is a bug the feed query already had once.
test("every field in the schema has an error code", () => {
  for (const field of ["username", "bio", "techStack", "githubUrl"] as const) {
    expect(profileErrorCodes[field]).toBeDefined();
  }
});

test("each field maps to the code docs/api-design.md promises", () => {
  expect(profileErrorCodes).toEqual({
    username: "INVALID_USERNAME",
    bio: "INVALID_BIO",
    techStack: "INVALID_TECH_STACK",
    githubUrl: "INVALID_GITHUB_URL",
  });
});
