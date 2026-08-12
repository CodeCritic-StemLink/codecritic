import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "@/components/NavLinks";
import { getMe } from "@/services/user.service";
import { ApiError } from "@/api/api";

// The navbar. Matches the agreed design preview: brand mark, Browse (always), My
// requests / My reviews once we know who somebody is, a karma chip, a Post a request
// button, and the account menu.
//
// A server component, async, so the karma chip is correct on first paint rather than
// flashing in after a client fetch. `auth()` gives us the Clerk identity; our own
// karma and username still have to come from our database, through GET /users/me.

export async function Nav() {
  const { userId, getToken } = await auth();

  let me: { username: string; karma: number } | null = null;

  if (userId) {
    const token = await getToken();

    try {
      const { user } = await getMe(token ?? "");
      me = { username: user.username, karma: user.karma };
    } catch (error) {
      // Signed in to Clerk but POST /users/sync has never run for this identity.
      // Nothing to show beyond the account menu until they finish that.
      if (!(error instanceof ApiError && error.code === "USER_NOT_FOUND")) {
        throw error;
      }
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-primary font-mono text-[12px] text-primary-foreground">
            C
          </span>
          CodeCritic
        </Link>

        <NavLinks username={me?.username} />

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {!userId ? (
            <>
              <SignInButton mode="modal">
                <button className="rounded-lg border px-3 py-1.5 text-[13.5px] font-medium transition-colors hover:border-primary">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-primary px-3 py-1.5 text-[13.5px] font-semibold text-primary-foreground">
                  Sign up
                </button>
              </SignUpButton>
            </>
          ) : null}

          {me ? (
            <>
              <span className="whitespace-nowrap rounded-full border border-karma bg-karma-foreground px-2.5 py-0.5 font-mono text-[12px] text-karma">
                {me.karma} Karma
              </span>
              <Link
                href="/submissions/new"
                className="whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-[13.5px] font-semibold text-primary-foreground"
              >
                Post a request
              </Link>
            </>
          ) : null}

          {userId ? (
            <UserButton appearance={{ elements: { userButtonAvatarBox: "size-[30px]" } }} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
