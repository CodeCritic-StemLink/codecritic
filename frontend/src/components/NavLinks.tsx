"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, UserRound } from "lucide-react";

// The navigation links: Browse, and My profile once we know who somebody is.
//
// A client component because knowing which link is "active" needs the current path,
// which is not available to the server component that renders the rest of the navbar.
//
// Two things were wrong with the old version, and both came from where it sat rather
// than from the links themselves.
//
// It was hidden below sm, so on a phone there was no way to reach your own profile at
// all except through the account menu. Half the navigation vanished on the screen size
// most people would open the site on.
//
// And on a wide screen it floated in the dead centre of the bar, a long way from
// anything, because the bar used justify-between on three children: brand, links,
// actions. Nothing was wrong with the links; they were being pushed there by the
// layout. They now sit beside the brand, and Nav.tsx wraps them onto their own row on
// a phone rather than hiding them.
//
// The chips match the feed's filter chips on purpose. Same shape, same active
// treatment, so the two kinds of "where am I" control on the site look related instead
// of like two people built them.

type Props = {
  /**
   * Where "My profile" points. Undefined when nobody is signed in (or not synced
   * yet), in which case only Browse shows, same as the logged out feed in the design
   * preview.
   *
   * The design preview shows separate "My requests" and "My reviews" links, but both
   * would point at the same page today: the profile page already lists what someone
   * has posted and their review counts, and there is no dedicated requests-only or
   * reviews-only page yet. Two links to one destination is worse than one, so this
   * is a single "My profile" link until those pages exist.
   */
  username?: string;
  /** Positioning, decided by Nav.tsx rather than in here. */
  className?: string;
};

export function NavLinks({ username, className = "" }: Props) {
  const pathname = usePathname();

  const links = [
    { label: "Browse", href: "/", Icon: Layers },
    ...(username
      ? [{ label: "My profile", href: `/profile/${username}`, Icon: UserRound }]
      : []),
  ];

  /*
   * Share the row only when there is something to share it with.
   *
   * Signed in there are two links, and splitting the row between them fills it and
   * reads as a tab bar. Signed out there is only "Browse", and stretching one chip
   * across the whole width of a phone makes it look like a button somebody pressed by
   * accident, so it keeps its natural size.
   */
  const shareTheRow = links.length > 1;

  return (
    <nav aria-label="Main" className={className}>
      {/*
        On a phone the links have a row to themselves, so they share it equally and each
        one fills its share. They used to be their natural width and left aligned, which
        left the right half of that row as blank white and made the whole bar look like
        something had failed to load.

        Sharing the width rather than hard coding one is what makes this fit any phone:
        two links at 320px get 144px each, at 430px they get 199px each, and a signed
        out visitor with only "Browse" gets the whole row. Nothing has to be measured.

        From sm up they sit beside the brand at their natural width, where stretching
        them across a desktop would be absurd.
      */}
      <ul className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-1">
        {links.map(({ label, href, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href;

          return (
            <li
              key={label}
              className={shareTheRow ? "min-w-0 flex-1 sm:flex-none" : "min-w-0"}
            >
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg py-1.5 text-[13.5px] transition-colors",
                  shareTheRow ? "justify-center px-2 sm:justify-start sm:px-2.5" : "px-2.5",
                  active
                    ? "bg-accent font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
