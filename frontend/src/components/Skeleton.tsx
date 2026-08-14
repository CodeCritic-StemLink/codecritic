// A grey block that pulses while real content is on its way.
//
// Why this exists: our pages are server components, so the browser gets nothing at all
// until the server has finished talking to the API. Measured on the profile page that
// is about half a second, and during it the old page just sits there, so a click feels
// like it did nothing.
//
// Next.js fixes that with a file named loading.tsx next to a page. It renders instantly
// while the real page is still being built, so the click is acknowledged immediately.
// This component is the piece those files are made of.
//
// aria-hidden because a screen reader should not announce placeholder boxes. The
// loading.tsx files carry the message for that.

type Props = {
  className?: string;
};

export function Skeleton({ className = "" }: Props) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-muted ${className}`.trim()}
    />
  );
}
