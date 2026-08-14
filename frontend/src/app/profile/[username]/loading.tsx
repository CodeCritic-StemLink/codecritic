import { Skeleton } from "@/components/Skeleton";

// Shown the instant somebody opens a profile, while the server fetches it.
//
// This is the page that needed it most. Measured warm, the profile takes about nine
// tenths of a second, roughly half of which is the real round trip to the database in
// Singapore. Without this file the browser shows the previous page for that whole
// time, so clicking a username feels like nothing happened.
//
// Next.js picks this up from its name and position: a loading.tsx beside a page.tsx is
// that page's loading state. Nothing imports it.

export default function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 py-10">
      <p className="sr-only" role="status">
        Loading this profile
      </p>

      <Skeleton className="h-4 w-28" />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div>
          <div className="flex items-center gap-4">
            <Skeleton className="size-[60px] shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
              <div className="mt-2.5 flex gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </div>
          </div>

          {/* The three stat boxes: karma, reviews given, reviews received. */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((box) => (
              <Skeleton key={box} className="h-[76px]" />
            ))}
          </div>

          <Skeleton className="mt-7 h-3.5 w-32" />

          <div className="mt-2.5 flex flex-col gap-2.5">
            {[0, 1].map((row) => (
              <Skeleton key={row} className="h-[74px]" />
            ))}
          </div>

          <Skeleton className="mt-7 h-3.5 w-32" />

          <div className="mt-2.5 flex flex-col gap-2.5">
            {[0, 1].map((row) => (
              <Skeleton key={row} className="h-[150px]" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[110px]" />
        </div>
      </div>
    </main>
  );
}
