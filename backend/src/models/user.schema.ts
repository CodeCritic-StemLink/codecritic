import { z } from "zod";

// The shape a profile must have. This is the only place these rules are written.
//
// Note what is NOT here: karma. Zod strips fields it does not know about, so a request
// body containing "karma": 9999 loses it before any of our code runs. There is no path
// in this API where a caller can hand themselves points. Karma only ever changes inside
// the review transaction.

export const profileSchema = z.object({
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

/** Editing a profile, where sending only the changed fields is allowed. */
export const updateProfileSchema = profileSchema.partial();

export type ProfileInput = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Maps a failed field to the error code the front end expects. */
export const profileErrorCodes = {
  username: "INVALID_USERNAME",
  bio: "INVALID_BIO",
  techStack: "INVALID_TECH_STACK",
  githubUrl: "INVALID_GITHUB_URL",
} as const;
