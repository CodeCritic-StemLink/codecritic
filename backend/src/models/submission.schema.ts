import { z } from "zod";

// Validation for anything to do with submissions. The only place these rules are written.

/**
 * The query string on the feed.
 *
 * Everything here is optional, because the feed has to work for a logged out visitor
 * who typed nothing. `coerce` is used on the numbers because a query string is always
 * text, so `?page=2` arrives as the string "2".
 */
export const feedQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),

  tag: z.string().trim().min(1).max(40).optional(),

  status: z.enum(["pending", "reviewed"]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  // Capped at 50 so nobody can ask for the whole database in one request.
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;

/**
 * Posting a review request. The five rules from docs/api-design.md, and nowhere else.
 *
 * Note what is NOT here: authorId. Zod strips fields it does not know about, so a body
 * containing "authorId": "someone-else" loses it before any of our code runs. The author
 * always comes from the verified token, in the service, never from this schema.
 */
export const createSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(120, "Title must be 120 characters or fewer."),

  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(5000, "Description must be 5000 characters or fewer."),

  repoUrl: z.string().trim().url("That is not a valid URL."),

  tags: z
    .array(z.string().trim().min(1))
    .min(1, "At least one tag is required.")
    .max(10, "At most 10 tags are allowed."),

  // Between 1 and 5 criteria, per the SRS. Each becomes its own Criterion row, in the
  // order given, in submission.service.ts.
  criteria: z
    .array(z.string().trim().min(1))
    .min(1, "At least one criterion is required.")
    .max(5, "At most 5 criteria are allowed."),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

/** Maps a failed field to the error code the front end expects. */
export const createSubmissionErrorCodes = {
  title: "INVALID_TITLE",
  description: "INVALID_DESCRIPTION",
  repoUrl: "INVALID_REPO_URL",
  tags: "INVALID_TAGS",
  criteria: "INVALID_CRITERIA",
} as const;