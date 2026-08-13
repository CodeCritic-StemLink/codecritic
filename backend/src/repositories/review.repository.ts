import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";

// The only file allowed to talk to the database about reviews.
//
// Nothing here decides anything. The rules live in review.service.ts.

const reviewInclude = {
  reviewer: { select: { username: true, karma: true } },
  ratings: { select: { criterionId: true, score: true } },
} satisfies Prisma.ReviewInclude;

export type ReviewWithRatings = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

export const reviewRepository = {
  /**
   * Has this person already reviewed this submission?
   *
   * This is the "clear error message" half of the duplicate check. The real guarantee
   * is the unique constraint on (submissionId, reviewerId) in the database, which is
   * what stops two requests arriving at the same instant from both succeeding — a check
   * like this one has a gap that only the database can close.
   */
  async existsForReviewer(submissionId: string, reviewerId: string): Promise<boolean> {
    const count = await prisma.review.count({ where: { submissionId, reviewerId } });
    return count > 0;
  },

  /**
   * Creates the review, one rating per criterion, and adds 2 Karma to the reviewer —
   * all inside one transaction. Either all three happen or none of them do. This is
   * what makes the Karma total trustworthy: there is no path that produces Karma
   * without a stored review, and no path that stores a review without the Karma.
   */
  async createWithRatingsAndKarma(params: {
    submissionId: string;
    reviewerId: string;
    strengths: string;
    improvements: string;
    resources: string[];
    ratings: { criterionId: string; score: number }[];
  }): Promise<{ review: ReviewWithRatings; karma: number }> {
    const [review, reviewer] = await prisma.$transaction([
      prisma.review.create({
        data: {
          submissionId: params.submissionId,
          reviewerId: params.reviewerId,
          strengths: params.strengths,
          improvements: params.improvements,
          resources: params.resources,
          ratings: {
            create: params.ratings.map((rating) => ({
              criterionId: rating.criterionId,
              score: rating.score,
            })),
          },
        },
        include: reviewInclude,
      }),
      prisma.user.update({
        where: { id: params.reviewerId },
        data: { karma: { increment: 2 } },
      }),
    ]);

    return { review, karma: reviewer.karma };
  },
};