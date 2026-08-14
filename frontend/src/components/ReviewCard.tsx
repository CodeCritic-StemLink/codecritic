import Link from "next/link";

import { timeAgo } from "@/lib/utils";
import type { ReviewGivenItem, ReviewReceivedItem } from "@/services/user.service";

// One review, shown in full: what was said, what it was scored, which submission it
// was on. Used by the "reviews I have written" and "reviews I have received" sections
// of a profile.
//
// showReviewer is what tells the two apart. A review someone wrote themselves does
// not need to say who wrote it; a review they received does.

type Props = {
  review: ReviewGivenItem | ReviewReceivedItem;
  showReviewer?: boolean;
};

function hasReviewer(
  review: ReviewGivenItem | ReviewReceivedItem
): review is ReviewReceivedItem {
  return "reviewer" in review;
}

export function ReviewCard({ review, showReviewer = false }: Props) {
  return (
    <div className="rounded-[var(--radius)] border border-l-[3px] border-l-primary bg-card p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/submissions/${review.submission.id}`}
          className="text-[13.5px] font-semibold hover:text-primary"
        >
          {review.submission.title}
        </Link>

        <span className="font-mono text-[11px] text-muted-foreground">
          {showReviewer && hasReviewer(review) ? `@${review.reviewer.username} · ` : ""}
          {timeAgo(review.createdAt)}
        </span>
      </div>

      <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        What worked
      </p>
      <p className="mt-0.5 mb-2.5 text-[13px] text-foreground">{review.strengths}</p>

      <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        What to improve
      </p>
      <p className="mt-0.5 text-[13px] text-foreground">{review.improvements}</p>

      {review.resources.length > 0 ? (
        <div className="mt-2.5 flex flex-col gap-1">
          {review.resources.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-[12px] text-primary hover:underline"
            >
              {url}
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {review.ratings.map((rating) => (
          <span
            key={rating.criterionId}
            className="rounded-md bg-muted px-2 py-1 font-mono text-[11.5px] text-muted-foreground"
          >
            {rating.label} <span className="font-semibold text-primary">{rating.score}</span>
          </span>
        ))}
      </div>
    </div>
  );
}