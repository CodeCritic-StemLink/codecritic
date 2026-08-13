"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The middle set of nav links.
//
// A client component because knowing which link is "active" needs the current path,
// which is not available to the server component that renders the rest of the navbar.

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
};

export function NavLinks({ username }: Props) {
  const pathname = usePathname();

  const links = [
    { label: "Browse", href: "/" },
    ...(username ? [{ label: "My profile", href: `/profile/${username}` }] : []),
  ];

  return (
    <nav className="hidden items-center gap-5 text-[13.5px] text-muted-foreground sm:flex">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname === link.href;

        return (
          <Link
            key={link.label}
            href={link.href}
            className={
              active
                ? "border-b-2 border-primary pb-0.5 font-medium text-foreground"
                : "border-b-2 border-transparent pb-0.5 transition-colors hover:text-foreground"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
