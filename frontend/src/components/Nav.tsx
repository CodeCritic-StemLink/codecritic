import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "@/components/NavLinks";
import { getMe } from "@/services/user.service";

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

    // The karma chip is not worth breaking a page over. If there is no token, the
    // API is unreachable, the token has expired, or the row does not exist yet
    // because POST /users/sync has never run, render the nav without it rather than
    // taking the whole site down. Nav runs on every route from the root layout, so a
    // rethrown error here is a crashed site, not a missing chip.
    if (token) {
      try {
        const { user } = await getMe(token);
        me = { username: user.username, karma: user.karma };
      } catch {
        // Swallowed on purpose. See above.
      }
    }
  }

  return (
    <header className="border-b bg-card">
      {/*
        Matches the page containers below it. If the header is narrower than the page,
        the brand mark stops lining up with the content, which is the kind of thing
        that looks broken without anybody being able to say why.
      */}
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          {/* The same mark as the browser tab icon, so the two agree. */}
          <BrandMark />
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
