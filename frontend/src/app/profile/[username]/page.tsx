import Link from "next/link";
import { notFound } from "next/navigation";

import { getProfile } from "@/services/user.service";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/ReviewCard";
import { ApiError } from "@/api/api";
import { timeAgo } from "@/lib/utils";

// A public profile. This page is Feature 02.
//
// Server component, same as the feed: nothing here needs a token, since the SRS
// requires that anyone can view anyone's profile without an account.
//
// Layout follows the agreed design preview: an avatar-led header, a three box stat
// row with Karma in the karma colour, requests posted underneath, and two side
// panels for the insights. Reviews by month is not in the preview but the figure is
// still part of the contract in docs/api-design.md, so it gets a third panel in the
// same visual language rather than being dropped.
//
// The container is wider than the feed's max-w-3xl on purpose: a single column of
// short cards reads fine narrow, but this page also has to fit two columns of
// insight panels and, now, full review text. max-w-3xl and even max-w-6xl both left
// hundreds of pixels of dead grey on a real 1600px+ monitor, confirmed by measuring
// the rendered width, not just eyeballing a screenshot. max-w-[1440px] is deliberately
// a pixel value rather than a Tailwind step, chosen to keep the margin reasonable on
// a wide monitor without the two-column grid ever looking stretched.

/** "2026-08" becomes "Aug 2026". */
function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function reviewLabel(count: number): string {
  if (count === 0) return "no reviews yet";
  return count === 1 ? "1 review" : `${count} reviews`;
}

export default async function ProfilePage({ params }: PageProps<"/profile/[username]">) {
  const { username } = await params;

  let profile;
  let failure: string | null = null;

  try {
    profile = await getProfile(username);
  } catch (error) {
    if (error instanceof ApiError && error.code === "USER_NOT_FOUND") {
      notFound();
    }

    failure = error instanceof Error ? error.message : "Could not load this profile.";
  }

  if (failure || !profile) {
    return (
      <main className="mx-auto w-full max-w-[1440px] px-6 py-16">
        <h1 className="text-xl font-semibold">This profile could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{failure}</p>
      </main>
    );
  }

  const maxTagCount = Math.max(0, ...profile.insights.reviewsByTag.map((entry) => entry.count));
  const maxMonthCount = Math.max(
    0,
    ...profile.insights.reviewsByMonth.map((entry) => entry.count)
  );
  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 py-10">
      <Link
        href="/"
        className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        Back to the feed
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div>
          <div className="flex items-center gap-4">
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border bg-accent text-[22px] font-semibold text-primary">
              {initial}
            </div>
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight">@{profile.username}</h1>

              {profile.bio ? (
                <p className="mt-0.5 text-[13.5px] text-muted-foreground">{profile.bio}</p>
              ) : null}

              {profile.techStack.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.techStack.map((tech) => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="font-mono text-[11px] font-normal"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {profile.githubUrl ? (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[12.5px] text-primary hover:underline"
                >
                  {profile.githubUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-[var(--radius)] border bg-card p-3.5 text-center">
              <p className="text-[24px] font-semibold leading-none tracking-tight text-karma">
                {profile.karma}
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Karma
              </p>
            </div>
            <div className="rounded-[var(--radius)] border bg-card p-3.5 text-center">
              <p className="text-[24px] font-semibold leading-none tracking-tight">
                {profile.reviewsGiven}
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Reviews given
              </p>
            </div>
            <div className="rounded-[var(--radius)] border bg-card p-3.5 text-center">
              <p className="text-[24px] font-semibold leading-none tracking-tight">
                {profile.reviewsReceived}
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Reviews received
              </p>
            </div>
          </div>

          <h2 className="mt-7 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Requests posted
          </h2>

          {profile.submissions.length === 0 ? (
            <p className="mt-2.5 text-[13px] text-muted-foreground">Has not posted anything yet.</p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {profile.submissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/submissions/${submission.id}`}
                  className="block rounded-[var(--radius)] border bg-card p-3.5 transition-colors hover:border-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-medium leading-snug">{submission.title}</h3>
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
                  <p className="mt-1.5 font-mono text-[11.5px] text-muted-foreground">
                    {timeAgo(submission.createdAt)} · {reviewLabel(submission.reviewCount)}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/*
            The SRS asks that a user can manage "reviews they have given, and reviews
            they have received", not just see the counts. These two sections are that:
            the full text of every review, not just a number.
          */}
          <h2 className="mt-7 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Reviews written
          </h2>

          {profile.reviewsGivenList.length === 0 ? (
            <p className="mt-2.5 text-[13px] text-muted-foreground">Has not written a review yet.</p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {profile.reviewsGivenList.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}

          <h2 className="mt-7 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Reviews received
          </h2>

          {profile.reviewsReceivedList.length === 0 ? (
            <p className="mt-2.5 text-[13px] text-muted-foreground">Has not received a review yet.</p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {profile.reviewsReceivedList.map((review) => (
                <ReviewCard key={review.id} review={review} showReviewer />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-[var(--radius)] border bg-card p-4">
            <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Reviews most often in
            </h2>

            {profile.insights.reviewsByTag.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">Has not written a review yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {profile.insights.reviewsByTag.map((entry) => (
                  <div key={entry.tag} className="flex items-center gap-2.5">
                    <span className="w-24 shrink-0 truncate text-[13px]">{entry.tag}</span>
                    <div className="h-[5px] flex-1 rounded-full bg-muted">
                      <div
                        className="h-[5px] rounded-full bg-primary"
                        style={{ width: `${(entry.count / maxTagCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right font-mono text-[12.5px]">
                      {entry.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius)] border bg-card p-4">
            <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Average score given
            </h2>

            {profile.insights.averageScoreGiven === null ? (
              <p className="text-[12.5px] text-muted-foreground">No scores given yet.</p>
            ) : (
              <>
                <p className="text-[30px] font-semibold leading-none tracking-tight">
                  {profile.insights.averageScoreGiven}
                  <span className="text-[15px] font-normal text-muted-foreground">/10</span>
                </p>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  Across {profile.reviewsGiven} {profile.reviewsGiven === 1 ? "review" : "reviews"}.
                </p>
              </>
            )}
          </div>

          {profile.insights.reviewsByMonth.length > 0 ? (
            <div className="rounded-[var(--radius)] border bg-card p-4">
              <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Reviews by month
              </h2>
              <div className="flex flex-col gap-2">
                {profile.insights.reviewsByMonth.map((entry) => (
                  <div key={entry.month} className="flex items-center gap-2.5">
                    <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted-foreground">
                      {formatMonth(entry.month)}
                    </span>
                    <div className="h-[5px] flex-1 rounded-full bg-muted">
                      <div
                        className="h-[5px] rounded-full bg-primary"
                        style={{ width: `${(entry.count / maxMonthCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right font-mono text-[12.5px]">
                      {entry.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
