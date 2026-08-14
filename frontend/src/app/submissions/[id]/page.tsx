import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { GitBranch } from "lucide-react";

import { getSubmission } from "@/services/submission.service";
import { SubmissionReviewCard } from "@/components/SubmissionReviewCard";
import { Badge } from "@/components/ui/badge";
import { ReviewForm } from "@/components/ReviewForm";
import { PageShell } from "@/components/PageShell";
import { BackLink } from "@/components/BackLink";
import { UserLink } from "@/components/UserLink";
import { ApiError } from "@/api/api";

// One review request in full. This page is Andrew's feature: reviewing.
//
// Server component, same reasoning as the feed page: the viewer flags (isAuthor,
// hasReviewed) come back from the API already computed, so this page only decides
// what to show. It never decides what somebody is allowed to do: that check happens
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

  const notice = !token
    ? "Sign in to review this request."
    : submission.viewer.isAuthor
      ? "This is your own submission. You cannot review your own work."
      : submission.viewer.hasReviewed
        ? "You have already reviewed this submission."
        : null;

  return (
    <PageShell>
      <BackLink />

      {/*
        The request on the left, everything about how to review it on the right. It was
        one narrow column, so on a wide screen the criteria and the review form sat a
        long way below the description that explains them.
      */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[21px] font-semibold tracking-tight sm:text-[24px]">
              {submission.title}
            </h1>
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

          <p className="mt-1.5 font-mono text-[12px] text-muted-foreground">
            <UserLink username={submission.author.username} className="font-normal" /> ·{" "}
            {submission.author.karma} Karma
          </p>

          <p className="mt-4 max-w-[85ch] whitespace-pre-wrap text-[14px] leading-relaxed">
            {submission.description}
          </p>

          <a
            href={submission.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors hover:border-primary hover:text-primary"
          >
            <GitBranch className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{submission.repoUrl.replace(/^https?:\/\//, "")}</span>
          </a>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {submission.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-mono text-[11px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>

          <h2 className="mt-9 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {submission.reviews.length === 0
              ? "No reviews yet"
              : submission.reviews.length === 1
                ? "1 review"
                : `${submission.reviews.length} reviews`}
          </h2>

          <div className="mt-3 flex flex-col gap-3">
            {submission.reviews.map((review) => (
              <SubmissionReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="rounded-[var(--radius)] border bg-card p-4">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Scored on
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Chosen by whoever posted this. Every one needs a score out of 10.
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
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
            <div className="rounded-[var(--radius)] border bg-card p-4">
              <h2 className="text-[14px] font-semibold tracking-tight">Write a review</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Earns you 2 Karma when it saves.
              </p>
              <ReviewForm submissionId={submission.id} criteria={submission.criteria} />
            </div>
          ) : null}

          {/* One notice, not three separate blocks that could never appear together
              anyway. */}
          {notice ? (
            <p className="rounded-[var(--radius)] border border-dashed p-4 text-center text-[13px] text-muted-foreground">
              {notice}
            </p>
          ) : null}
        </aside>
      </div>
    </PageShell>
  );
}
