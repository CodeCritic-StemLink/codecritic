import Link from "next/link";

// Shown for any address that does not exist.
//
// Without this, Next.js shows its own bare 404, which looks like the site is broken
// rather than like the page is simply missing.

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-20 text-center">
      <p className="font-mono text-[12px] uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="mt-2 text-[21px] font-semibold tracking-tight">This page does not exist</h1>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted-foreground">
        The address may be wrong, or the page may not be built yet.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground"
      >
        Back to the feed
      </Link>
    </main>
  );
}
