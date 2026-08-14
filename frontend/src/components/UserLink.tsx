import Link from "next/link";

// A username, anywhere it appears, always going to that person's profile.
//
// One component so the rule holds without anybody having to remember it. Usernames were
// a link on a feed card and plain text everywhere else: on a submission's author line,
// on a review somebody wrote you, in the "needs a reviewer" rail. Clicking a name and
// nothing happening reads as broken, and the profile is Feature 02, so every name that
// does not link is a door to it that nobody opens.
//
// `relative z-10` is not decoration. Several of these sit inside a card whose title
// stretches an invisible overlay across the whole card to make it clickable. Without
// lifting this above that overlay, the click lands on the card instead and the name
// looks like a link that goes to the wrong place.

type Props = {
  username: string;
  /** Set when this sits inside a card with a stretched click overlay. */
  overlay?: boolean;
  className?: string;
};

export function UserLink({ username, overlay = false, className = "" }: Props) {
  return (
    <Link
      href={`/profile/${username}`}
      className={[
        "font-medium transition-colors hover:text-primary hover:underline",
        overlay ? "relative z-10" : "",
        className,
      ].join(" ")}
    >
      @{username}
    </Link>
  );
}
