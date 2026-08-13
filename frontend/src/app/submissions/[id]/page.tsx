import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { getSubmission } from "@/services/submission.service";
import type { ReviewRating } from "@/services/submission.service";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewForm } from "@/components/ReviewForm";
import { ApiError } from "@/api/api";

// One review request in full. This page is Andrew's feature: reviewing.
//
// Server component, same reasoning as the feed page: the viewer flags (isAuthor,
// hasReviewed) come back from the API already computed, so this page only decides
// what to show. It never decides what somebody is allowed to do — that check happens
// again, for real, on the server when the review form submits.

export default async function SubmissionDetailPage({ params }: PageProps<"/submissions/[id]">) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  let submission;

  try {
    submission = await getSubmission(id, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const canReview =
    Boolean(token) && !submission.viewer.isAuthor && !submission.viewer.hasReviewed;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/" className="text-[13px] text-muted-foreground hover:text-foreground">
        ← Back to the feed
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="text-[21px] font-semibold tracking-tight">{submission.title}</h1>
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

      <p className="mt-1 font-mono text-[12px] text-muted-foreground">
        @{submission.author.username} · {submission.author.karma} Karma
      </p>

      <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed">
        {submission.description}
      </p>

      <a>
        href={submission.repoUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-[13.5px] text-primary underline-offset-4 hover:underline"
        {submission.repoUrl}
      </a>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {submission.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="font-mono text-[11px] font-normal">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-6 rounded-[var(--radius)] border bg-card p-4">
        <p className="text-[12.5px] font-semibold">What reviewers are asked to score</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {submission.criteria.map((criterion) => (
            <li key={criterion.id}>
              <Badge variant="outline" className="text-muted-foreground">
                {criterion.label}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {canReview ? (
        <div className="mt-8">
          <h2 className="text-[15.5px] font-semibold tracking-tight">Write a review</h2>
          <ReviewForm submissionId={submission.id} criteria={submission.criteria} />
        </div>
      ) : null}

      {!token ? (
        <p className="mt-8 rounded-[var(--radius)] border border-dashed p-4 text-center text-[13px] text-muted-foreground">
          Sign in to review this request.
        </p>
      ) : null}

      {token && submission.viewer.isAuthor ? (
        <p className="mt-8 rounded-[var(--radius)] border border-dashed p-4 text-center text-[13px] text-muted-foreground">
          This is your own submission. You cannot review your own work.
        </p>
      ) : null}

      {token && !submission.viewer.isAuthor && submission.viewer.hasReviewed ? (
        <p className="mt-8 rounded-[var(--radius)] border border-dashed p-4 text-center text-[13px] text-muted-foreground">
          You have already reviewed this submission.
        </p>
      ) : null}

      <div className="mt-10">
        <h2 className="text-[15.5px] font-semibold tracking-tight">
          {submission.reviews.length === 0
            ? "No reviews yet"
            : submission.reviews.length === 1
              ? "1 review"
              : `${submission.reviews.length} reviews`}
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          {submission.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </main>
  );
}