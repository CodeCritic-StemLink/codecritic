import { SignIn } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerkAppearance";

// Signing in, on our own route rather than Clerk's popup.
//
// The folder name [[...sign-in]] is a catch all, and it is required rather than
// decorative. Signing in is not one screen: Clerk navigates to sub paths of its own
// for a second factor, a reset link, or a code from an email. A plain /sign-in folder
// would answer the first screen and 404 on every step after it.
//
// Clerk still renders the form and still owns passwords, verification and reset. All
// we changed is how it looks. See lib/clerkAppearance.ts.
//
// flex-1 rather than a hand written min-h-[calc(100vh-57px)]. The body is already a
// flex column, so this fills whatever is left below the navigation bar and stays
// right if that bar's height ever changes. The old calculation was already wrong by
// two pixels, and with GitHub added the form grew by a whole button and the page
// started scrolling.

export const metadata = {
  title: "Sign in to CodeCritic",
};

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-3 sm:py-6">
      <div className="w-full max-w-[400px]">
        <SignIn
          appearance={clerkAppearance}
          signUpUrl="/sign-up"
          /*
            fallbackRedirectUrl rather than forceRedirectUrl, so somebody sent here
            from a page they actually wanted goes back to that page rather than always
            landing on the feed.
          */
          fallbackRedirectUrl="/"
        />
      </div>
    </main>
  );
}
