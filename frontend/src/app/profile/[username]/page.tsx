import Link from "next/link";
import { notFound } from "next/navigation";
// No GitHub icon here on purpose: lucide-react does not ship brand logos, so
// ExternalLink is what an outgoing link gets everywhere on the site.
import { CircleCheck, CircleDashed, ExternalLink, Pencil } from "lucide-react";

import { getProfile } from "@/services/user.service";
import { getViewer } from "@/services/viewer";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/ReviewCard";
import { PageShell } from "@/components/PageShell";
import { BackLink } from "@/components/BackLink";
import { ListPager } from "@/components/ListPager";
import { ApiError } from "@/api/api";
import { paginate } from "@/lib/listPage";
import { timeAgo } from "@/lib/utils";

// A public profile. This page is Feature 02.
//
// Server component, same as the feed: nothing here needs a token to read, since the SRS
// requires that anyone can view anyone's profile without an account.
//
// The layout is four bands, widest thing first:
//
//   1. who they are, with the stats beside the name rather than under it
//   2. the three insights, side by side
//   3. requests posted, as a responsive grid
//   4. reviews written and reviews received, one column each
//
// It used to be one narrow column with a rail, which meant a very tall page where you
// scrolled past everything to reach the reviews, and a stripe of empty background down
// both sides of a wide monitor. Bands fill the width instead of stretching to it: each
// one lays out in as many columns as there is room for and collapses to one on a phone.
//
// Reviews given and reviews received sit side by side deliberately. They are the pair
// the SRS calls out as easy to confuse, and putting them next to each other makes the
// difference visible rather than something you have to remember while scrolling.

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

/** A band heading, so all four are the same thing rather than four similar things. */
function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {count !== undefined ? (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] tabular-nums">
          {count}
        </span>
      ) : null}
    </h2>
  );
}

/** One insight panel, so the three of them cannot drift apart. */
function InsightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border bg-card p-4">
      <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

/** One labelled bar, used by both the tag chart and the month chart. */
function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-24 shrink-0 truncate text-[12.5px]">{label}</span>
      <div className="h-[5px] min-w-0 flex-1 rounded-full bg-muted">
        <div
          className="h-[5px] rounded-full bg-primary"
          style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
        />
      </div>
      <span className="w-4 shrink-0 text-right font-mono text-[12.5px] tabular-nums">{count}</span>
    </div>
  );
}

export default async function ProfilePage({
  params,
  searchParams,
}: PageProps<"/profile/[username]">) {
  const { username } = await params;
  const query = ((await searchParams) ?? {}) as Record<string, string | undefined>;

  /*
   * Both requests start together.
   *
   * They used to run one after the other: the profile, and then, only once it had come
   * back, who is reading it. Neither depends on the other, so that was one round trip
   * to Singapore spent waiting for nothing. On a page already taking over a second,
   * that was a large share of it.
   *
   * allSettled rather than all, because getProfile is allowed to fail loudly here while
   * the viewer never is. See below.
   */
  const [profileResult, viewerResult] = await Promise.allSettled([
    getProfile(username),
    getViewer(),
  ]);

  let profile;
  let failure: string | null = null;

  if (profileResult.status === "fulfilled") {
    profile = profileResult.value;
  } else {
    const error = profileResult.reason;

    if (error instanceof ApiError && error.code === "USER_NOT_FOUND") {
      notFound();
    }

    failure = error instanceof Error ? error.message : "Could not load this profile.";
  }

  if (failure || !profile) {
    return (
      <PageShell>
        <BackLink />
        <h1 className="mt-4 text-xl font-semibold">This profile could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{failure}</p>
      </PageShell>
    );
  }

  /*
   * Is the person reading this the person it is about?
   *
   * Only decides whether an Edit button is drawn. It is not a permission check and does
   * not need to be: PATCH /users/me updates whichever row the caller's own token
   * resolves to, and there is no user id anywhere in its path or body, so there is
   * nothing to forge. Hiding the button is politeness, not security.
   *
   * getViewer never throws, so a rejection here means something truly unexpected. Not
   * knowing who is reading is not a reason to fail somebody else's public profile, so
   * the button simply does not appear.
   */
  const viewer = viewerResult.status === "fulfilled" ? viewerResult.value : null;
  const viewingOwnProfile = viewer?.me?.username === profile.username;

  const maxTagCount = Math.max(0, ...profile.insights.reviewsByTag.map((entry) => entry.count));
  const maxMonthCount = Math.max(0, ...profile.insights.reviewsByMonth.map((e) => e.count));
  const initial = profile.username.charAt(0).toUpperCase();

  const posted = paginate(profile.submissions, query.posted);
  const given = paginate(profile.reviewsGivenList, query.given);
  const received = paginate(profile.reviewsReceivedList, query.received);

  const stats = [
    { label: "Karma", value: profile.karma, karma: true },
    { label: "Reviews given", value: profile.reviewsGiven, karma: false },
    { label: "Reviews received", value: profile.reviewsReceived, karma: false },
  ];

  return (
    <PageShell>
      <BackLink />

      {/* Band one: who they are. The stats sit beside the name from lg up, so the top
          of the page answers "who is this and how much have they done" in one glance
          instead of two scrolls. */}
      <header className="mt-4 rounded-[var(--radius)] border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border bg-accent text-[20px] font-semibold text-primary sm:size-[60px] sm:text-[22px]">
              {initial}
            </div>

            <div className="min-w-0">
              <h1 className="text-[20px] font-semibold tracking-tight sm:text-[22px]">
                @{profile.username}
              </h1>

              {profile.bio ? (
                <p className="mt-1 max-w-[70ch] text-[13.5px] leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              ) : null}

              {profile.techStack.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
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
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {profile.githubUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-3 lg:items-end">
            {/*
              Top right of the header rather than beside the username.
              Beside the name it was one more thing in a line that already had a name,
              a bio and a row of technologies, and it pushed all of them around when it
              appeared. Up here it is where every site puts it and it changes nothing
              about the layout for the people who never see it.
            */}
            {viewingOwnProfile ? (
              <Link
                href="/profile/setup"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-primary hover:text-primary lg:self-end"
              >
                <Pencil className="size-3.5" aria-hidden />
                Edit profile
              </Link>
            ) : null}

            <dl className="grid grid-cols-3 gap-2.5 lg:w-[380px]">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[var(--radius)] border bg-background p-3 text-center"
                >
                  <dd
                    className={[
                      "text-[22px] font-semibold leading-none tracking-tight tabular-nums",
                      stat.karma ? "text-karma" : "",
                    ].join(" ")}
                  >
                    {stat.value}
                  </dd>
                  <dt className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>

      {/* Band two: the three insights, side by side rather than stacked in a rail. */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InsightCard title="Reviews most often in">
          {profile.insights.reviewsByTag.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">Has not written a review yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {profile.insights.reviewsByTag.map((entry) => (
                <Bar key={entry.tag} label={entry.tag} count={entry.count} max={maxTagCount} />
              ))}
            </div>
          )}
          <p className="mt-3 border-t pt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Counted from the tags of the requests they reviewed, not from the technologies
            they listed on their profile.
          </p>
        </InsightCard>

        <InsightCard title="Average score given">
          {profile.insights.averageScoreGiven === null ? (
            <p className="text-[12.5px] text-muted-foreground">No scores given yet.</p>
          ) : (
            <>
              <p className="text-[30px] font-semibold leading-none tracking-tight tabular-nums">
                {profile.insights.averageScoreGiven}
                <span className="text-[15px] font-normal text-muted-foreground">/10</span>
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Across every score in {profile.reviewsGiven}{" "}
                {profile.reviewsGiven === 1 ? "review" : "reviews"}.
              </p>
            </>
          )}
        </InsightCard>

        <InsightCard title="Reviews by month">
          {profile.insights.reviewsByMonth.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">Nothing to chart yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {profile.insights.reviewsByMonth.map((entry) => (
                <Bar
                  key={entry.month}
                  label={formatMonth(entry.month)}
                  count={entry.count}
                  max={maxMonthCount}
                />
              ))}
            </div>
          )}
        </InsightCard>
      </div>

      {/* Band three: what they have asked to have reviewed. */}
      <section className="mt-7">
        <SectionTitle count={profile.submissions.length}>Requests posted</SectionTitle>

        {profile.submissions.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Has not posted anything yet.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {posted.visible.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/submissions/${submission.id}`}
                  className="flex flex-col rounded-[var(--radius)] border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[14px] font-medium leading-snug">{submission.title}</h3>
                    {submission.status === "reviewed" ? (
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <CircleDashed
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {submission.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="font-mono text-[10.5px] font-normal text-muted-foreground"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <p className="mt-auto pt-2.5 font-mono text-[11.5px] text-muted-foreground">
                    {timeAgo(submission.createdAt)} · {reviewLabel(submission.reviewCount)}
                  </p>
                </Link>
              ))}
            </div>

            <ListPager
              param="posted"
              page={posted.page}
              lastPage={posted.lastPage}
              current={query}
              label="requests posted"
            />
          </>
        )}
      </section>

      {/*
        Band four. The SRS asks that a user can manage "reviews they have given, and
        reviews they have received", not just see the counts, so these are the full text
        of every review rather than a number.

        Side by side because they are the pair the SRS warns is easy to get the wrong way
        round. Given is where this person is the reviewer; received is reviews other
        people wrote on their work.
      */}
      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section>
          <SectionTitle count={profile.reviewsGiven}>Reviews written</SectionTitle>

          {profile.reviewsGivenList.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Has not written a review yet.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {given.visible.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              <ListPager
                param="given"
                page={given.page}
                lastPage={given.lastPage}
                current={query}
                label="reviews written"
              />
            </>
          )}
        </section>

        <section>
          <SectionTitle count={profile.reviewsReceived}>Reviews received</SectionTitle>

          {profile.reviewsReceivedList.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Has not received a review yet.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {received.visible.map((review) => (
                  <ReviewCard key={review.id} review={review} showReviewer />
                ))}
              </div>

              <ListPager
                param="received"
                page={received.page}
                lastPage={received.lastPage}
                current={query}
                label="reviews received"
              />
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
