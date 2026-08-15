import { z } from "zod";

// The shape a profile must have. This is the only place these rules are written.
//
// Note what is NOT here: karma. Zod strips fields it does not know about, so a request
// body containing "karma": 9999 loses it before any of our code runs. There is no path
// in this API where a caller can hand themselves points. Karma only ever changes inside
// the review transaction.

/** The rules for each field, written once and used by both schemas below. */
const fields = {
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be 30 characters or fewer.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores."),

  /*
   * Nullable as well as optional, on both schemas, and the difference between the two
   * is the whole point.
   *
   *   absent  ->  undefined  ->  leave whatever is stored alone
   *   null    ->  null       ->  clear it
   *
   * Without null there was no way to empty a bio at all. The form turns a blank box
   * into undefined, JSON drops undefined keys, and the update skipped the field, so
   * you could change a bio but never remove one.
   */
  bio: z.string().trim().max(500, "Bio must be 500 characters or fewer.").nullable().optional(),

  techStack: z
    .array(z.string().trim().min(1))
    .max(20, "You can list at most 20 technologies."),

  githubUrl: z
    .string()
    .trim()
    .url("That is not a valid URL.")
    .nullable()
    .optional()
    .or(z.literal("")),
};

/**
 * Creating a profile, through POST /users/sync.
 *
 * techStack defaults here, and only here, because a first save with no technologies
 * listed is a real thing: it means an empty stack, not "do not touch it".
 */
export const profileSchema = z.object({
  ...fields,
  techStack: fields.techStack.default([]),
});

/**
 * Editing a profile, through PATCH /users/me, where sending only the changed fields
 * is allowed.
 *
 * Built from `fields` rather than `profileSchema.partial()`, and that is a bug fix
 * rather than a tidy up.
 *
 * `.partial()` makes every key optional but does NOT remove a `.default()`, so
 * `parse({ bio: "x" })` came back as `{ bio: "x", techStack: [] }`. The update then
 * wrote that empty array, because [] is not undefined, and a PATCH carrying nothing
 * but a bio silently erased the caller's entire tech stack.
 *
 * The front end never hit it, because the edit form always sends all four fields. The
 * SRS says mentors will call the API directly, and there it was one request away.
 */
export const updateProfileSchema = z.object(fields).partial();

export type ProfileInput = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Maps a failed field to the error code the front end expects. */
export const profileErrorCodes = {
  username: "INVALID_USERNAME",
  bio: "INVALID_BIO",
  techStack: "INVALID_TECH_STACK",
  githubUrl: "INVALID_GITHUB_URL",
} as const;
