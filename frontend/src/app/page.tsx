import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { getFeed } from "@/services/submission.service";
import { SubmissionCard } from "@/components/SubmissionCard";
import { Badge } from "@/components/ui/badge";

// The feed. This page is Feature 01.
//
// It is a server component, so the ranking happens before any HTML reaches the browser.
// The visitor never receives the scoring code, only the finished order, which is the
// answer to "does this run in the browser or on the server".

type Search = {
  search?: string;
  tag?: string;
  status?: "pending" | "reviewed";
  why?: string;
};

export default async function FeedPage({ searchParams }: PageProps<"/">) {
  const params = ((await searchParams) ?? {}) as Search;

  // The token is how the API knows who is asking. Signed out, this is null and the API
  // returns newest first, which the SRS requires the public feed to do.
  const { getToken } = await auth();
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

  // Keeps the current filters when toggling the explanation on or off.
  const withWhy = (on: boolean) => {
    const next = new URLSearchParams();
    if (params.search) next.set("search", params.search);
    if (params.tag) next.set("tag", params.tag);
    if (params.status) next.set("status", params.status);
    if (on) next.set("why", "1");
    const qs = next.toString();
    return qs ? `/?${qs}` : "/";
  };

  const statusLink = (value?: "pending" | "reviewed") => {
    const next = new URLSearchParams();
    if (params.search) next.set("search", params.search);
    if (params.tag) next.set("tag", params.tag);
    if (value) next.set("status", value);
    if (params.why) next.set("why", params.why);
    const qs = next.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">
            {feed.personalised ? "Picked for you" : "Newest first"}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {feed.personalised
              ? "The same requests a visitor sees, ordered for the technologies on your profile."
              : `${feed.total} requests waiting for feedback. Sign in to see them sorted for you.`}
          </p>
        </div>

        {feed.personalised ? (
          <Link
            href={withWhy(!showScore)}
            className="rounded-md border border-primary px-3 py-1.5 text-[12.5px] text-primary transition-colors hover:bg-accent"
          >
            {showScore ? "Hide the maths" : "Why this order?"}
          </Link>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[
          { label: "All", value: undefined },
          { label: "Pending", value: "pending" as const },
          { label: "Reviewed", value: "reviewed" as const },
        ].map((option) => {
          const active = params.status === option.value;

          return (
            <Link key={option.label} href={statusLink(option.value)}>
              <Badge
                variant={active ? "default" : "outline"}
                className={active ? "" : "text-muted-foreground"}
              >
                {option.label}
              </Badge>
            </Link>
          );
        })}
      </div>

      {feed.submissions.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </p>
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
    </main>
  );
}
