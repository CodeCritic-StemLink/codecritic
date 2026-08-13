import type { SubmissionReview } from "@/services/submission.service";

// One review, shown on the submission detail page: strengths, improvements, optional
// resources, and a score per criterion.

function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));

  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

type Props = {
  review: SubmissionReview;
};

export function ReviewCard({ review }: Props) {
  return (
    <article className="rounded-[var(--radius)] border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[12px]">
          <span className="text-foreground">@{review.reviewer.username}</span>
          <span className="text-muted-foreground"> · {review.reviewer.karma} Karma</span>
        </p>
        <p className="font-mono text-[11.5px] text-muted-foreground">
          {timeAgo(review.createdAt)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {review.ratings.map((rating) => (
          <span
            key={rating.criterionId}
            className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground"
          >
            {rating.label} <span className="font-semibold text-primary">{rating.score}/10</span>
          </span>
        ))}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed">
        <span className="font-semibold">Strengths. </span>
        {review.strengths}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed">
        <span className="font-semibold">Improvements. </span>
        {review.improvements}
      </p>

      {review.resources.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1">
          {review.resources.map((url) => 
          (
            <a>
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[12.5px] text-primary underline-offset-4 hover:underline"
                {url}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}