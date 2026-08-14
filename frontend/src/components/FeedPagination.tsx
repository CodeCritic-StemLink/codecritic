import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { feedUrl } from "@/lib/feedUrl";
import type { FeedParams } from "@/lib/feedUrl";

// Previous and next for the feed.
//
// The API has always paged: it takes ?page= and ?limit=, and it ranks the whole
// matching set before cutting the page out. Ranking after slicing would sort the first
// twenty rows by date and hand back a page that was merely shuffled, which would make
// Feature 01 a lie on any feed longer than one page.
//
// The page number is in the address bar like every other filter, so page two is a real
// link and this stays a server component with no client JavaScript.
//
// Links rather than buttons on purpose: they can be opened in a new tab, and they work
// before any JavaScript has loaded.

type Props = {
  page: number;
  limit: number;
  total: number;
  params: FeedParams;
};

export function FeedPagination({ page, limit, total, params }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / limit));

  // One page of results needs no controls, unless the reader has somehow landed past
  // the end. Hiding the pager there would leave them on an empty screen with no way
  // back, which is exactly when they need it most.
  if (lastPage <= 1 && page <= 1) return null;

  const firstOnPage = (page - 1) * limit + 1;
  const lastOnPage = Math.min(page * limit, total);

  const hasPrevious = page > 1;
  const hasNext = page < lastPage;

  // Past the end, "showing 21 to 20" is nonsense, so say what actually happened.
  const pastTheEnd = page > lastPage;

  const stepClasses = [
    "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
    "hover:border-primary hover:text-primary",
  ].join(" ");

  const deadClasses = [
    "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[13px]",
    "cursor-not-allowed border-dashed text-muted-foreground/50",
  ].join(" ");

  return (
    <nav
      aria-label="Feed pages"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
    >
      <p className="font-mono text-[12px] text-muted-foreground">
        {pastTheEnd
          ? `Page ${page} is past the end. There are ${total} in total.`
          : `Showing ${firstOnPage} to ${lastOnPage} of ${total}`}
      </p>

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link href={feedUrl(params, { page: String(page - 1) })} className={stepClasses}>
            <ChevronLeft className="size-3.5" aria-hidden />
            Previous
          </Link>
        ) : (
          /* Shown but inert, so the controls do not jump sideways on the first page. */
          <span className={deadClasses} aria-hidden>
            <ChevronLeft className="size-3.5" />
            Previous
          </span>
        )}

        <span className="px-1 font-mono text-[12px] text-muted-foreground">
          {page} / {lastPage}
        </span>

        {hasNext ? (
          <Link href={feedUrl(params, { page: String(page + 1) })} className={stepClasses}>
            Next
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <span className={deadClasses} aria-hidden>
            Next
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
