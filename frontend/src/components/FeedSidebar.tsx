import Link from "next/link";
import { HandHelping, Inbox, Sparkles } from "lucide-react";

import { timeAgo } from "@/lib/utils";
import type { FeedItem } from "@/services/submission.service";

// The right rail.
//
// Everything here is counted from the feed response that the page already has. No new
// endpoint, no second request, no invented feature. The design reference we worked
// from also had a "suggested reviewers" panel with follow buttons, which is not in our
// SRS: there is no following in this product, so it is not here either.
//
// "Needs a reviewer" is the panel worth explaining at assessment. It is the same idea
// as the +6 needs-help bonus in the ranking: a submission nobody has answered is the
// one where a review is worth the most, so it gets its own place on the page rather
// than being buried further down the list.

const MAX_NEEDS_HELP = 4;

type Props = {
  submissions: FeedItem[];
  total: number;
  personalised: boolean;
  signedIn: boolean;
};

export function FeedSidebar({ submissions, total, personalised, signedIn }: Props) {
  const needsHelp = submissions.filter((submission) => submission.reviewCount === 0);
  const pendingCount = needsHelp.length;

  return (
    <aside className="flex flex-col gap-3.5 lg:sticky lg:top-6">
      {/*
        Only shown to visitors. Telling somebody who is already signed in that signing
        in would help them is noise.
      */}
      {!signedIn ? (
        <div className="rounded-[var(--radius)] border border-primary bg-accent p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-foreground">
            <Sparkles className="size-3.5" aria-hidden />
            Get a feed of your own
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-accent-foreground/80">
            Sign in and add the technologies you work with. The same requests reorder so
            the ones you can actually help with come first.
          </p>
        </div>
      ) : null}

      <div className="rounded-[var(--radius)] border bg-card p-4">
        <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          This feed
        </p>

        <dl className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Inbox className="size-3.5" aria-hidden />
              Requests
            </dt>
            <dd className="font-mono text-[15px] font-semibold tabular-nums">{total}</dd>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <HandHelping className="size-3.5" aria-hidden />
              Still unanswered
            </dt>
            <dd className="font-mono text-[15px] font-semibold tabular-nums text-primary">
              {pendingCount}
            </dd>
          </div>
        </dl>

        {personalised ? (
          <p className="mt-3 border-t pt-3 text-[12px] leading-relaxed text-muted-foreground">
            Ordered for the technologies on your profile.
          </p>
        ) : null}
      </div>

      {needsHelp.length > 0 ? (
        <div className="rounded-[var(--radius)] border bg-card p-4">
          <p className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Needs a reviewer
          </p>
          <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
            Nobody has answered these yet.
          </p>

          <ul className="flex flex-col gap-2.5">
            {needsHelp.slice(0, MAX_NEEDS_HELP).map((submission) => (
              <li key={submission.id}>
                <Link
                  href={`/submissions/${submission.id}`}
                  className="block rounded-md border-l-2 border-l-primary bg-muted/50 px-2.5 py-2 transition-colors hover:bg-muted"
                >
                  <p className="line-clamp-2 text-[12.5px] font-medium leading-snug">
                    {submission.title}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    @{submission.author.username} · {timeAgo(submission.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
