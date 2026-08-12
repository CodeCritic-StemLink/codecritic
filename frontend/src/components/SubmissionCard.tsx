import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { FeedItem } from "@/services/submission.service";

// One review request in a list. Used by the feed, and later by profiles and search.
//
// Built once so all four of us show a submission the same way. If the card changes, it
// changes everywhere at the same time.

/** "2h ago", "3 days ago". Kept simple on purpose, no date library needed. */
function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));

  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

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
    <Link
      href={`/submissions/${submission.id}`}
      className={[
        "block rounded-[var(--radius)] border bg-card p-4 transition-colors",
        "hover:border-primary focus-visible:outline-2 focus-visible:outline-primary",
        // A left edge on anything matching your stack, so relevance is visible before
        // you read a word.
        isMatch ? "border-l-[3px] border-l-primary" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15.5px] font-semibold leading-snug tracking-tight">
          {submission.title}
        </h3>

        <Badge
          variant="outline"
          className={
            submission.status === "reviewed"
              ? "shrink-0 border-success text-success"
              : "shrink-0 text-muted-foreground"
          }
        >
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

      <p className="mt-3 font-mono text-[11.5px] text-muted-foreground">
        <span className="text-foreground">@{submission.author.username}</span>
        {" · "}
        {timeAgo(submission.createdAt)}
        {" · "}
        {reviewLabel(submission.reviewCount)}
      </p>

      {showScore && score ? (
        <p className="mt-3 rounded-md bg-muted px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
          score <span className="font-semibold text-primary">{score.total}</span> = tags{" "}
          {score.tagPoints}
          {score.matchedTags.length > 0 ? ` (${score.matchedTags.join(", ")})` : " (no match)"} +
          fresh {score.recencyPoints} + needs help {score.needsHelpPoints}
        </p>
      ) : null}
    </Link>
  );
}
