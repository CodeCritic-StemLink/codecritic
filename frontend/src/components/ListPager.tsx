import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { listPageUrl } from "@/lib/listPage";

// Paging for a list inside a page, where the page itself is not what is being paged.
//
// The profile has three of these: requests posted, reviews written, reviews received.
// Somebody with thirty reviews rendered all thirty and buried everything below them, so
// each list now shows a few at a time.
//
// Which page each list is on lives in the query string, one key per list, so the profile
// stays a server component and a particular view of it is still a real address. That is
// the same decision as the feed's filters, for the same reason.
//
// It is a different component from FeedPagination on purpose. That one owns the whole
// page: it says "showing 1 to 20 of 25" and sits under the feed as the main control.
// This is a small footer for one card among several, and merging them would mean one
// component with a flag deciding which of two layouts to draw.

type Props = {
  /** The query string key this list uses, for example "given". */
  param: string;
  page: number;
  lastPage: number;
  /** Every search param currently on the page, so the other lists keep their place. */
  current: Record<string, string | undefined>;
  label: string;
};

export function ListPager({ param, page, lastPage, current, label }: Props) {
  if (lastPage <= 1) return null;

  const step = "flex size-7 items-center justify-center rounded-md border transition-colors";
  const live = `${step} hover:border-primary hover:text-primary`;
  const dead = `${step} cursor-not-allowed border-dashed text-muted-foreground/40`;

  return (
    <nav
      aria-label={`${label} pages`}
      className="mt-3 flex items-center justify-between gap-2 border-t pt-3"
    >
      <span className="font-mono text-[11.5px] text-muted-foreground">
        {page} / {lastPage}
      </span>

      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={listPageUrl(current, param, page - 1)}
            scroll={false}
            aria-label={`Previous page of ${label}`}
            className={live}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <span className={dead} aria-hidden>
            <ChevronLeft className="size-3.5" />
          </span>
        )}

        {page < lastPage ? (
          <Link
            href={listPageUrl(current, param, page + 1)}
            scroll={false}
            aria-label={`Next page of ${label}`}
            className={live}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <span className={dead} aria-hidden>
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
