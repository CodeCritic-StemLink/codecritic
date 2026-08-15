"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { createReview } from "@/services/review.service";
import { ApiError } from "@/api/api";
import { isSafeUrl } from "@/lib/url";
import type { Criterion } from "@/services/submission.service";

// The review form. One score control per criterion, defined by whoever posted the
// submission, and this component has no idea what the criteria will be ahead of time,
// same as the SRS asks for.

/** The same ceiling the API enforces in models/review.schema.ts. */
const MAX_RESOURCES = 5;

type Props = {
  submissionId: string;
  criteria: Criterion[];
};

export function ReviewForm({ submissionId, criteria }: Props) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [resourcesText, setResourcesText] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((criterion) => [criterion.id, 5]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setScore(criterionId: string, score: number) {
    setScores((current) => ({ ...current, [criterionId]: score }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const token = await getToken();

      if (!token) {
        setError("You are not signed in. Sign in and try again.");
        return;
      }

      await createReview(
        submissionId,
        {
          strengths: strengths.trim(),
          improvements: improvements.trim(),
          resources: resourceLines,
          ratings: criteria.map((criterion) => ({
            criterionId: criterion.id,
            score: scores[criterion.id],
          })),
        },
        token
      );

      // refresh() re-renders the server page with the new review already showing and
      // the form hidden, because the API now reports hasReviewed as true.
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not submit your review. Is the API running?"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * Resources are one link per line, so any of them can be wrong on its own. The bad
   * ones are named rather than the whole box turning red, because "one of these five is
   * wrong" is not useful when you are looking at five of them.
   *
   * The API enforces the same rule and answers INVALID_RESOURCES, but only after you
   * have written the whole review and pressed the button. See lib/url.ts.
   */
  const resourceLines = resourcesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const badResources = resourceLines.filter((line) => !isSafeUrl(line));

  const canSubmit =
    strengths.trim().length > 0 &&
    improvements.trim().length > 0 &&
    badResources.length === 0 &&
    resourceLines.length <= MAX_RESOURCES &&
    !submitting;

  return (
    <form onSubmit={handleSubmit} className="mt-4 w-full rounded-[var(--radius)] border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <label htmlFor="strengths" className="mb-1.5 block text-[12.5px] font-semibold">
          What was done well
        </label>
        <textarea
          id="strengths"
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          maxLength={5000}
          rows={3}
          required
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-[13.5px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="improvements" className="mb-1.5 block text-[12.5px] font-semibold">
          What needs improving
        </label>
        <textarea
          id="improvements"
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          maxLength={5000}
          rows={3}
          required
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-[13.5px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="resources" className="mb-1.5 block text-[12.5px] font-semibold">
          Resources{" "}
          <span className="font-normal text-muted-foreground">optional, one link per line</span>
        </label>
        <textarea
          id="resources"
          value={resourcesText}
          onChange={(e) => setResourcesText(e.target.value)}
          rows={2}
          placeholder="https://example.com/guide"
          aria-invalid={badResources.length > 0 ? true : undefined}
          aria-describedby="resources-hint"
          className={[
            "w-full rounded-lg border bg-transparent px-2.5 py-2 text-[13.5px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            badResources.length > 0
              ? "border-destructive focus-visible:border-destructive"
              : "border-input focus-visible:border-ring",
          ].join(" ")}
        />
        {badResources.length > 0 ? (
          <p id="resources-hint" className="mt-1 text-[12px] text-destructive">
            Not a link: {badResources.join(", ")}. Each line must start with https://
          </p>
        ) : resourceLines.length > MAX_RESOURCES ? (
          <p id="resources-hint" className="mt-1 text-[12px] text-destructive">
            At most {MAX_RESOURCES} links. Remove {resourceLines.length - MAX_RESOURCES}.
          </p>
        ) : null}
      </div>

      <div className="mb-5 flex flex-col gap-3">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <span className="text-[13px]">{criterion.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={10}
                value={scores[criterion.id]}
                onChange={(e) => setScore(criterion.id, Number(e.target.value))}
                className="w-full accent-primary sm:w-32"
              />
              <span className="w-10 shrink-0 text-right font-mono text-[12.5px] text-primary">
                {scores[criterion.id]}/10
              </span>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {submitting ? "Submitting" : "Submit review, earn +2 Karma"}
      </Button>
    </form>
  );
}
