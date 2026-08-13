import { Skeleton } from "@/components/Skeleton";

// Shown the instant somebody navigates to the feed, while the server is still fetching.
//
// Next.js renders this automatically because of its name and where it sits: a
// loading.tsx beside a page.tsx is that page's loading state. Nothing imports it.
//
// The shapes deliberately match the real layout, so the page does not jump around when
// the content arrives.

export default function FeedLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 py-8">
      {/* Announced to screen readers, which cannot see a pulsing grey box. */}
      <p className="sr-only" role="status">
        Loading the feed
      </p>

      <div className="grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1fr)_290px] xl:grid-cols-[190px_minmax(0,1fr)_300px]">
        <div className="lg:col-span-2 xl:col-span-1 xl:col-start-1 xl:row-start-1">
          <div className="flex gap-2 xl:flex-col xl:gap-1.5">
            <Skeleton className="h-8 w-32 shrink-0" />
            <Skeleton className="h-8 w-36 shrink-0" />
            <Skeleton className="h-8 w-28 shrink-0" />
          </div>
        </div>

        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          <Skeleton className="h-[38px] w-full" />

          <div className="mt-5 mb-4">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          </div>

          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="rounded-[var(--radius)] border bg-card p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2.5 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-4/5" />
                <div className="mt-3 flex gap-1.5">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="mt-3 h-3.5 w-56 max-w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:col-start-2 lg:block xl:col-start-3 xl:row-start-1">
          <Skeleton className="h-[132px] w-full" />
          <Skeleton className="mt-3.5 h-[180px] w-full" />
        </div>
      </div>
    </main>
  );
}
