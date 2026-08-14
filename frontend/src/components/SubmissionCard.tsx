import Link from "next/link";
import { CircleCheck, CircleDashed, Clock, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import type { FeedItem } from "@/services/submission.service";

// One review request in a list. Used by the feed, and later by profiles and search.
//
// Built once so all four of us show a submission the same way. If the card changes, it
// changes everywhere at the same time.
//
// This is NOT one big link, on purpose. A card with the whole thing wrapped in a Link
// cannot contain another link, because a link inside a link is invalid HTML and the
// browser silently ignores the inner one. That is why @username used to do nothing.
// Instead the title links to the submission and the username links to the profile,
// and a stretched overlay makes the rest of the card clickable without nesting.

function reviewLabel(count: number): string {
  if (count === 0) return "no reviews yet";
  return count === 1 ? "1 review" : `${count} reviews`;
}

type Props = {
  submission: FeedItem;
  /** Show the score breakdown under the card. Driven by the "Why this order?" link. */
  showScore?: boolean;
};

export function SubmissionCard({ submission, showScore = false }: Props) {
  const { score } = submission;
  const matched = new Set(score?.matchedTags ?? []);
  const isMatch = matched.size > 0;

  return (
    <article
      className={[
        "group relative rounded-[var(--radius)] border bg-card p-4 transition-colors",
        "hover:border-primary focus-within:border-primary",
        // A left edge on anything matching your stack, so relevance is visible before
        // you read a word.
        isMatch ? "border-l-[3px] border-l-primary" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15.5px] font-semibold leading-snug tracking-tight">
          {/*
            The card's main link. `absolute inset-0` on the ::after makes the whole
            card clickable while the anchor itself stays small, so the real links
            inside the card are still reachable by mouse and keyboard.
          */}
          <Link
            href={`/submissions/${submission.id}`}
            className="after:absolute after:inset-0 after:content-[''] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            {submission.title}
          </Link>
        </h3>

        <Badge
          variant="outline"
          className={
            submission.status === "reviewed"
              ? "shrink-0 gap-1 border-success text-success"
              : "shrink-0 gap-1 text-muted-foreground"
          }
        >
          {submission.status === "reviewed" ? (
            <CircleCheck className="size-3" aria-hidden />
          ) : (
            <CircleDashed className="size-3" aria-hidden />
          )}
          {submission.status === "reviewed" ? "Reviewed" : "Pending"}
        </Badge>
      </div>

      <p className="mt-2 line-clamp-2 text-[13.5px] text-muted-foreground">
        {submission.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {submission.tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className={
              matched.has(tag)
                ? "border border-primary bg-accent font-mono text-[11px] font-normal text-primary"
                : "font-mono text-[11px] font-normal text-muted-foreground"
            }
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-muted-foreground">
        {/*
          relative + z-10 lifts this above the title's stretched overlay, so clicking
          the name goes to the profile rather than to the submission.
        */}
        <Link
          href={`/profile/${submission.author.username}`}
          className="relative z-10 text-foreground hover:text-primary hover:underline"
        >
          @{submission.author.username}
        </Link>

        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden />
          {timeAgo(submission.createdAt)}
        </span>

        <span className="flex items-center gap-1">
          <MessageSquare className="size-3" aria-hidden />
          {reviewLabel(submission.reviewCount)}
        </span>
      </div>

      {showScore && score ? (
        <p className="mt-3 rounded-md bg-muted px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
          score <span className="font-semibold text-primary">{score.total}</span> = tags{" "}
          {score.tagPoints}
          {score.matchedTags.length > 0 ? ` (${score.matchedTags.join(", ")})` : " (no match)"} +
          fresh {score.recencyPoints} + needs help {score.needsHelpPoints}
        </p>
      ) : null}
    </article>
  );
}
