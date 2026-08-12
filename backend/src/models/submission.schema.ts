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
