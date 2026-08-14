import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "@/components/NavLinks";
import { getMe } from "@/services/user.service";

// The navbar: brand mark, the navigation links, a karma chip, a Post a request button,
// and the account menu.
//
// A server component, async, so the karma chip is correct on first paint rather than
// flashing in after a client fetch. `auth()` gives us the Clerk identity; our own
// karma and username still have to come from our database, through GET /users/me.
//
// The layout is one row from sm up and two rows on a phone, done with flex-wrap and
// `order` rather than by rendering the links twice or hiding them. See the comment on
// the container below, and NavLinks.tsx for why they moved out of the centre.

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
        The same width and padding as PageShell. If the header is narrower than the page
        under it, the brand mark stops lining up with the content, which is the kind of
        thing that looks broken without anybody being able to say why.

        gap-2 on a phone rather than gap-4. Everything in the right hand group has to
        fit beside the brand at 320px, and the old spacing pushed the avatar off the
        edge: the karma chip and "Post a request" are both whitespace-nowrap, so
        instead of wrapping they simply overflowed the header.
      */}
      {/*
        flex-wrap plus `order`, so one set of links can sit in two different places
        without being rendered twice.

        On a phone the brand and the actions share the first line and the links wrap
        onto a second row of their own, because everything does not fit on one line at
        375px and hiding half the navigation was the wrong way to solve that.

        From sm up the order changes and all three sit on one line: brand, links, then
        actions pushed right by ml-auto. The bar used justify-between on three children,
        which is what stranded the links in the dead centre of a wide screen with a gulf
        on either side.
      */}
      <div className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 sm:flex-nowrap sm:gap-x-4 sm:px-6 sm:py-3 lg:px-8 2xl:px-12">
        <Link
          href="/"
          className="order-1 flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          {/* The same mark as the browser tab icon, so the two agree. */}
          <BrandMark />
          {/* The word goes below sm; the mark alone is still recognisable and buys
              back about 90px, which is the difference between fitting and not. */}
          <span className="hidden sm:inline">CodeCritic</span>
        </Link>

        <NavLinks
          username={me?.username}
          className="order-3 -mx-1 w-full overflow-x-auto border-t pt-1.5 sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible sm:border-t-0 sm:pt-0"
        />

        <div className="order-2 ml-auto flex min-w-0 items-center gap-2 sm:order-3 sm:gap-3">
          <ThemeToggle />

          {!userId ? (
            <>
              {/*
                Plain links to our own pages, not Clerk's modal. A real URL can be
                bookmarked, opened in a new tab, and linked to from an email, and it
                is what lets sign up redirect to profile setup afterwards.

                Sign in is hidden on the smallest screens rather than shrunk. Sign up
                leads to the same place for somebody who already has an account, and
                two buttons of equal weight in a 320px bar is what made this look
                cramped in the first place.
              */}
              <Link
                href="/sign-in"
                className="rounded-lg border px-3 py-1.5 text-[13.5px] font-medium transition-colors hover:border-primary max-[420px]:hidden"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          ) : null}

          {me ? (
            <>
              {/* The number is the point of the chip, so the word "Karma" is what
                  goes when there is no room for both. */}
              <span className="whitespace-nowrap rounded-full border border-karma bg-karma-foreground px-2.5 py-0.5 font-mono text-[12px] text-karma">
                {me.karma}
                <span className="hidden sm:inline"> Karma</span>
              </span>

              {/*
                A labelled button on a tablet and up, a plus on a phone. Same link,
                same destination; aria-label keeps it announced properly for anyone
                who cannot see the icon.
              */}
              <Link
                href="/submissions/new"
                aria-label="Post a request"
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-2.5 py-1.5 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-3"
              >
                <Plus className="size-4 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">Post a request</span>
              </Link>
            </>
          ) : null}

          {userId ? <UserMenu /> : null}
        </div>
      </div>
    </header>
  );
}
