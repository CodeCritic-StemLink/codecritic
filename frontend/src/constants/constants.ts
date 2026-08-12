// Anything configured once and read everywhere.
//
// Nothing else in the app should ever write out an address. If the API moves, this file
// changes and nothing else does.

/**
 * Where the Express API lives.
 *
 * NEXT_PUBLIC_ means the value is sent to the browser, which is correct here because the
 * browser is what calls the API. It is set in frontend/.env.local for development and in
 * the Vercel dashboard for the deployed site.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** How many submissions the feed asks for at a time. */
export const FEED_PAGE_SIZE = 20;
