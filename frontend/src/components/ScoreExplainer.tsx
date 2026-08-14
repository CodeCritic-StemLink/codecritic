import type { ScoreBreakdown } from "@/services/submission.service";

// Why one request sits where it does in the feed.
//
// Shown under a card when "Why this order?" is on, which is off by default. This is the
// visible proof for Feature 01: the ranking is not a claim, it is arithmetic a reader
// can check on the screen in front of them.
//
// It has been through two versions before this one and both were wrong in opposite
// directions. The first printed the formula, `score 27 = tags 24 (Python, Django) +
// fresh 3 + needs help 0`, which nobody outside the group could read. The second spelled
// every part out on its own line with a heading and a total, which was readable and
// four times the height of the thing it was explaining.
//
// This is one line. The score is the headline, the reasons are the small print, and a
// part worth zero is left out entirely rather than given a row saying nothing happened.
//
// Nothing is calculated here. This only puts words to numbers the server sent. See
// backend/src/services/ranking.service.ts.

type Props = {
  score: ScoreBreakdown;
};

export function ScoreExplainer({ score }: Props) {
  const reasons: string[] = [];

  if (score.tagPoints > 0) {
    reasons.push(`+${score.tagPoints} ${score.matchedTags.join(", ")}`);
  }

  if (score.recencyPoints > 0) {
    reasons.push(`+${score.recencyPoints} recent`);
  }

  if (score.needsHelpPoints > 0) {
    reasons.push(`+${score.needsHelpPoints} unanswered`);
  }

  if (score.alreadyReviewedPoints !== 0) {
    reasons.push(`${score.alreadyReviewedPoints} you reviewed it`);
  }

  // Everything scored zero, which happens to an old, answered post in a technology you
  // do not work with. Saying so beats an empty line.
  if (reasons.length === 0) {
    reasons.push("nothing matched");
  }

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2.5 text-[12px] text-muted-foreground">
      <span className="rounded-md bg-accent px-1.5 py-0.5 font-mono font-semibold text-primary">
        {score.total}
      </span>
      <span className="font-mono">{reasons.join("  ·  ")}</span>
    </p>
  );
}
