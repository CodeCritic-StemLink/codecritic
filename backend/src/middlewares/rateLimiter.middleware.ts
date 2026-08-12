import rateLimit from "express-rate-limit";

// Caps how many requests one IP address can make in a window.
//
// Two reasons this matters for us. It stops a single client exhausting our free tier
// database, and it directly serves the SRS requirement that Karma must not be
// obtainable without a genuine review. Someone scripting the review endpoint runs into
// this before they run into anything else.

const message = {
  error: {
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests. Wait a minute and try again.",
  },
};

/** Applies to every route. Generous, because reading the feed is cheap and public. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

/**
 * For the routes that create things. Much tighter, because these write to the database
 * and one of them hands out points.
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});
