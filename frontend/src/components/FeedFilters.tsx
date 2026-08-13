import Link from "next/link";
import { CircleCheck, CircleDashed, Layers, Tag, X } from "lucide-react";

import { feedUrl } from "@/lib/feedUrl";
import { popularTags } from "@/lib/tags";
import type { FeedParams } from "@/lib/feedUrl";
import type { FeedItem } from "@/services/submission.service";

// The left rail: filter by state, and filter by technology.
//
// The tag list is counted from the submissions already on the page. No new endpoint
// and no second request: the feed response has every tag on it, so counting them here
// costs nothing.
//
// It is headed "In these results" rather than "Technologies" because that is exactly
// what it is. It counts the current page of the current filter, so picking a tag
// narrows the list to that tag's neighbours, and a long feed shows the tags of page
// one. Calling it "Technologies" would imply totals across the whole site, which
// would need a counting endpoint the SRS never asked for.
//
// On phones and tablets this same component renders as a row of chips that scrolls
// sideways, which is why the markup is a flat list of links rather than a sidebar
// shape. One component, two layouts, decided entirely by CSS.
//
// The counting itself lives in lib/tags.ts, so it can be unit tested without
// rendering this component. See tests/lib/tags.test.ts.

const MAX_TAGS = 8;

type Props = {
  submissions: FeedItem[];
  params: FeedParams;
};

export function FeedFilters({ submissions, params }: Props) {
  const tags = popularTags(submissions, MAX_TAGS);

  const states = [
    { label: "All requests", value: undefined, Icon: Layers },
    { label: "Needs a review", value: "pending" as const, Icon: CircleDashed },
    { label: "Reviewed", value: "reviewed" as const, Icon: CircleCheck },
  ];

  return (
    <nav aria-label="Filter the feed" className="xl:sticky xl:top-6">
      <p className="mb-2 hidden font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground xl:block">
        Filter by
      </p>

      {/*
        Horizontally scrollable chips below xl, a stacked list at xl and up.
        -mx-6 px-6 lets the scrolling row bleed to the screen edges on a phone so the
        last chip is not clipped by the page padding.
      */}
      <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 xl:mx-0 xl:flex-col xl:gap-0.5 xl:overflow-visible xl:px-0 xl:pb-0">
        {states.map(({ label, value, Icon }) => {
          const active = params.status === value;

          return (
            <li key={label} className="shrink-0">
              <Link
                href={feedUrl(params, { status: value ?? null })}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                  "border xl:border-transparent",
                  active
                    ? "border-primary bg-accent font-medium text-primary xl:border-transparent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {tags.length > 0 ? (
        <div className="mt-5 hidden xl:block">
          <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            In these results
          </p>

          <ul className="flex flex-col gap-0.5">
            {tags.map(({ tag, count }) => {
              const active = params.tag === tag;

              return (
                <li key={tag}>
                  <Link
                    href={feedUrl(params, { tag: active ? null : tag })}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-accent font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    {active ? (
                      <X className="size-3.5 shrink-0" aria-hidden />
                    ) : (
                      <Tag className="size-3.5 shrink-0" aria-hidden />
                    )}
                    <span className="flex-1 truncate font-mono text-[12px]">{tag}</span>
                    <span className="font-mono text-[11px] tabular-nums">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
