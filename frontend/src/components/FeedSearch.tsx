import { Search } from "lucide-react";

// The search box.
//
// A plain HTML form with method="get", not a React component with state. Submitting
// it puts ?search=... in the address bar, the server re-renders the page with that
// filter, and the result is a real URL somebody can bookmark or send to a teammate.
// No client JavaScript is involved at all, which is why this stays a server component.
//
// The hidden inputs carry the other filters through, so searching does not silently
// throw away the status filter or the "Why this order?" view.

type Props = {
  defaultValue?: string;
  status?: string;
  tag?: string;
  why?: string;
};

export function FeedSearch({ defaultValue, status, tag, why }: Props) {
  return (
    <form action="/" method="get" className="relative">
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {tag ? <input type="hidden" name="tag" value={tag} /> : null}
      {why ? <input type="hidden" name="why" value={why} /> : null}

      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />

      <input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder="Search review requests"
        aria-label="Search review requests"
        className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      />
    </form>
  );
}
