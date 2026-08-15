import type { ReactNode } from "react";

// The outer container every page sits in.
//
// One component rather than a container class copied into eight files, because they had
// already drifted: the feed was max-w-[1440px], the detail page max-w-4xl, profile setup
// max-w-5xl. Three different widths meant the content jumped left and right as you moved
// between pages, and the narrow ones left a stripe of empty background down each side of
// a real monitor.
//
// max-w-[1800px] rather than a Tailwind step. On a 1920px screen that is the full width
// with a normal margin, and it is a ceiling rather than a target: nothing is stretched to
// reach it, the pages fill it with columns instead. Padding grows with the screen so the
// content never touches the edge on a phone or floats in the middle on a desktop.

type Props = {
  /** Optional, so a page still loading has something to render at the right width. */
  children?: ReactNode;
  /** Extra classes, for the rare page that wants different vertical spacing. */
  className?: string;
};

export function PageShell({ children, className = "" }: Props) {
  return (
    <main
      className={[
        "mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-12",
        className,
      ].join(" ")}
    >
      {children}
    </main>
  );
}
