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

  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-1">
        {links.map(({ label, href, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href;

          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors",
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
