import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Calculator, Inbox, UserPlus } from "lucide-react";

import { getFeed } from "@/services/submission.service";
import { SubmissionCard } from "@/components/SubmissionCard";
import { FeedFilters } from "@/components/FeedFilters";
import { FeedSearch } from "@/components/FeedSearch";
import { FeedSidebar } from "@/components/FeedSidebar";
import { feedUrl } from "@/lib/feedUrl";
import type { FeedParams } from "@/lib/feedUrl";

// The feed. This page is Feature 01.
//
// It is a server component, so the ranking happens before any HTML reaches the browser.
// The visitor never receives the scoring code, only the finished order, which is the
// answer to "does this run in the browser or on the server".
//
// Three columns on a wide screen: filters, the feed, and a rail of things worth
// knowing. Everything in both rails is counted from this same response, so the whole
// page is still one API call.
//
// Every filter lives in the URL rather than in React state. A filtered feed is then a
// real link, and the page never needs to become a client component to remember what is
// selected.

export default async function FeedPage({ searchParams }: PageProps<"/">) {
  const params = ((await searchParams) ?? {}) as FeedParams;

  // The token is how the API knows who is asking. Signed out, this is null and the API
  // returns newest first, which the SRS requires the public feed to do.
  const { userId, getToken } = await auth();
  const token = await getToken();

  let feed;
  let failure: string | null = null;

  try {
    feed = await getFeed(
      { search: params.search, tag: params.tag, status: params.status },
      token
    );
  } catch (error) {
    failure = error instanceof Error ? error.message : "Could not load the feed.";
  }

  if (failure || !feed) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-xl font-semibold">The feed could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{failure}</p>
      </main>
    );
  }

  const showScore = params.why === "1" && feed.personalised;

  // Signed in to Clerk, but the API did not personalise, which means there is no row for
  // this person in our own database yet. Nothing can be sorted for someone whose
  // technologies we do not know.
  const needsProfile = Boolean(userId) && !feed.personalised;

  const isFiltered = Boolean(params.search || params.tag || params.status);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 py-8">
      {needsProfile ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-primary bg-accent p-4">
          <div>
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-accent-foreground">
              <UserPlus className="size-4" aria-hidden />
              Finish your profile to get a feed of your own
            </p>
            <p className="mt-0.5 text-[13px] text-accent-foreground/80">
              Pick the technologies you work with and these requests reorder around them.
            </p>
          </div>
          <Link
            href="/profile/setup"
            className="rounded-md bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Set up profile
          </Link>
        </div>
      ) : null}

      {/*
        One column on a phone, feed plus rail on a tablet, all three on a desktop.
        The explicit col-start values only kick in at xl, where the filter rail moves
        from a row of chips at the top into its own column on the left.
      */}
      <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1fr)_290px] xl:grid-cols-[190px_minmax(0,1fr)_300px]">
        <div className="lg:col-span-2 xl:col-span-1 xl:col-start-1 xl:row-start-1">
          <FeedFilters submissions={feed.submissions} params={params} />
        </div>

        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          <FeedSearch
            defaultValue={params.search}
            status={params.status}
            tag={params.tag}
            why={params.why}
          />

          <div className="mt-5 mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[19px] font-semibold tracking-tight">
                {feed.personalised ? "Picked for you" : "Newest first"}
              </h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {feed.personalised
                  ? "The same requests a visitor sees, ordered for the technologies on your profile."
                  : `${feed.total} requests waiting for feedback. Sign in to see them sorted for you.`}
              </p>
            </div>

            {feed.personalised ? (
              <Link
                href={feedUrl(params, { why: showScore ? null : "1" })}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-[12.5px] text-primary transition-colors hover:bg-accent"
              >
                <Calculator className="size-3.5" aria-hidden />
                {showScore ? "Hide the maths" : "Why this order?"}
              </Link>
            ) : null}
          </div>

          {feed.submissions.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed p-10 text-center">
              <Inbox className="mx-auto size-6 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                {isFiltered ? "Nothing matches those filters." : "Nothing here yet."}
              </p>
              {isFiltered ? (
                <Link
                  href="/"
                  className="mt-3 inline-block text-[13px] text-primary hover:underline"
                >
                  Clear the filters
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feed.submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  showScore={showScore}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-start-2 xl:col-start-3 xl:row-start-1">
          <FeedSidebar
            submissions={feed.submissions}
            total={feed.total}
            personalised={feed.personalised}
            signedIn={Boolean(userId)}
          />
        </div>
      </div>
    </main>
  );
}
