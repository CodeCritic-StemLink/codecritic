import { clerkMiddleware } from "@clerk/nextjs/server";

// Middleware runs before every request to the site.
//
// clerkMiddleware() reads the session cookie and works out who is asking, then makes
// that available to pages and server code. It does NOT block anything on its own,
// which is what we want: the SRS says the feed must be readable when logged out.
//
// Pages that require a signed in user check for themselves.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on every page except Next.js internals and static files like images and fonts.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
