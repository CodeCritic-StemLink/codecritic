import { SignUp } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerkAppearance";

// Creating an account, on our own route rather than Clerk's popup.
//
// The catch all folder name is required for the same reason as sign in: Clerk moves
// through sub paths of its own to verify an email address, and a plain /sign-up folder
// would 404 on the step after the first.
//
// The redirect is the important line here. A brand new account exists in Clerk but not
// in our own database, and nothing can be ranked for somebody whose technologies we do
// not know. So a new person goes straight to /profile/setup rather than to the feed,
// and cannot end up in the half created state where the site knows their email but not
// their username.

export const metadata = {
  title: "Create your CodeCritic account",
};

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-3 sm:py-6">
      <div className="w-full max-w-[400px]">
        <SignUp
          appearance={clerkAppearance}
          signInUrl="/sign-in"
          /*
            forceRedirectUrl, not fallback: a new account must pick a username and a
            tech stack before anything else, so this one is not negotiable.
          */
          forceRedirectUrl="/profile/setup"
        />
      </div>
    </main>
  );
}
