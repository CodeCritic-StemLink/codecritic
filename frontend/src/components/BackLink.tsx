import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// The way back, on every page that is not the feed.
//
// It was three different things before: "Back to the feed" as plain grey text on the
// profile, the same words with a "←" character typed into the JSX on the detail page,
// and a third version with its own arrow on profile setup. Same job, three sizes, three
// colours.
//
// A real icon rather than the "←" character, so it matches the weight of every other
// icon on the site instead of being whatever the font decides. The label is still there
// for anybody who does not read an arrow as "back", and it is what a screen reader
// announces.

type Props = {
  /** Where back is. Almost always the feed. */
  href?: string;
  children?: string;
};

export function BackLink({ href = "/", children = "Back to the feed" }: Props) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="flex size-6 items-center justify-center rounded-full border transition-colors group-hover:border-primary">
        <ArrowLeft className="size-3.5" aria-hidden />
      </span>
      {children}
    </Link>
  );
}
