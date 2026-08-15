"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { feedUrl } from "@/lib/feedUrl";
import type { FeedParams } from "@/lib/feedUrl";

// The search box, searching as you type.
//
// It used to be a plain form you had to submit, which meant nothing happened until you
// pressed Enter and most people did not know they had to.
//
// It is now a client component, and it is the only one on this page. Everything else,
// including the ranking and the results, still runs on the server. What this holds is
// the text in the box and a timer, nothing more.
//
// The results still come from the URL. Typing rewrites the address and the server
// re-renders the feed for it, so a search is still a real link you can bookmark or send
// to somebody, and the back button still works. The alternative, fetching results into
// client state, would have meant a second copy of the ranking logic in the browser and
// no shareable address.
//
// router.replace rather than push, so twelve keystrokes do not become twelve entries in
// your history that you have to press back through one at a time.
//
// The navigation runs inside startTransition, which is what makes this feel fast rather
// than merely be fast. Without it, every keystroke replaced the whole feed with the
// loading skeleton from app/loading.tsx while the server worked, so the results flashed
// away and came back on each pause in typing. Inside a transition React keeps the
// results you are already reading on screen and swaps them only when the new ones are
// ready. The round trip to the database is the same length; you just are not staring at
// an empty page for it.
//
// isPending is that transition still running, which is a better signal than comparing
// text to the URL: it stays true until the new HTML has actually arrived.

/** How long to wait after the last keystroke before searching. */
const DEBOUNCE_MS = 300;

type Props = {
  params: FeedParams;
};

export function FeedSearch({ params }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // What the address bar currently holds. The results on screen were rendered for this.
  const applied = params.search ?? "";

  const [value, setValue] = useState(applied);
  const [lastApplied, setLastApplied] = useState(applied);

  /*
   * The address bar is the source of truth, not this input.
   *
   * Without this, pressing back after a search leaves the URL on the old query while the
   * box still shows the new text, and the two disagree until you type again.
   *
   * Adjusted during render rather than in an effect, which is React's own advice for
   * resetting state when a prop changes. An effect would render once with the stale
   * text, then again with the right text, and eslint refuses it for exactly that reason.
   */
  if (applied !== lastApplied) {
    setLastApplied(applied);
    setValue(applied);
  }

  // Either the timer has not fired yet, or it has and the server is still answering.
  const searching = value.trim() !== applied || isPending;

  useEffect(() => {
    const trimmed = value.trim();

    // Also what stops the first render rewriting the address for no reason: on arrival
    // the box holds exactly what the URL holds, so there is nothing to do.
    if (trimmed === applied) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        // null rather than "" for an empty box: feedUrl drops null keys, so clearing the
        // search removes ?search= from the address instead of leaving ?search= behind.
        router.replace(feedUrl(params, { search: trimmed || null }), { scroll: false });
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // params is rebuilt on every render, so depending on it would restart the timer
    // forever. The value being typed and the value already applied are what matter.
  }, [value, applied]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />

      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search review requests"
        aria-label="Search review requests"
        className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-10 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      />

      {/* One slot on the right: a spinner while the server catches up, a clear button
          once it has, and nothing at all when the box is empty. */}
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
        {searching ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear the search"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
