import { prisma } from "../config/prisma";
import type { Prisma, User } from "../generated/prisma/client";

// The only file allowed to talk to the database about users.
//
// Nothing in here decides anything. No permission checks, no rules, no error messages
// for humans. It reads and writes rows, and that is all. The rules live in the service.
//
// Keeping every query in one file means that when a query is wrong, there is exactly
// one place to look.

/**
 * Every review this person wrote, in full. Feeds two things: the profile insights,
 * which only read `submission.tags`, `createdAt` and `ratings[].score`, and the
 * "reviews I have written" list, which reads all of it. One query, two uses, rather
 * than fetching the same rows twice.
 */
const reviewGivenSelect = {
  id: true,
  strengths: true,
  improvements: true,
  resources: true,
  createdAt: true,
  submission: { select: { id: true, title: true, tags: true } },
  ratings: { select: { score: true, criterion: { select: { id: true, label: true } } } },
} satisfies Prisma.ReviewSelect;

export type ReviewGivenForInsights = Prisma.ReviewGetPayload<{ select: typeof reviewGivenSelect }>;

/** Every review written on a submission this person authored, with who wrote it. */
const reviewReceivedSelect = {
  id: true,
  strengths: true,
  improvements: true,
  resources: true,
  createdAt: true,
  submission: { select: { id: true, title: true } },
  reviewer: { select: { username: true } },
  ratings: { select: { score: true, criterion: { select: { id: true, label: true } } } },
} satisfies Prisma.ReviewSelect;

export type ReviewReceived = Prisma.ReviewGetPayload<{ select: typeof reviewReceivedSelect }>;

/** What the profile's submission list needs, one row per submission this person posted. */
const authoredSubmissionSelect = {
  id: true,
  title: true,
  tags: true,
  createdAt: true,
  _count: { select: { reviews: true } },
} satisfies Prisma.SubmissionSelect;

export type AuthoredSubmission = Prisma.SubmissionGetPayload<{
  select: typeof authoredSubmissionSelect;
}>;

export const userRepository = {
  findByClerkId(clerkId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { clerkId } });
  },

  findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Every review this person wrote, newest first. Powers both the profile insights
   * and the "reviews I have written" list. Feature 02.
   */
  findReviewsGivenForInsights(userId: string): Promise<ReviewGivenForInsights[]> {
    return prisma.review.findMany({
      where: { reviewerId: userId },
      orderBy: { createdAt: "desc" },
      select: reviewGivenSelect,
    });
  },

  /**
   * Every review written on a submission this person authored, newest first. This is
   * "reviews received": not reviews where this person is the reviewer, reviews on
   * their own submissions written by somebody else. Feature 02.
   */
  findReviewsReceived(userId: string): Promise<ReviewReceived[]> {
    return prisma.review.findMany({
      where: { submission: { authorId: userId } },
      orderBy: { createdAt: "desc" },
      select: reviewReceivedSelect,
    });
  },

  /** Every submission this person posted, newest first. Feature 02. */
  findSubmissionsByAuthor(userId: string): Promise<AuthoredSubmission[]> {
    return prisma.submission.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      select: authoredSubmissionSelect,
    });
  },

  /** Creates the row the first time we see a Clerk identity, updates it after that. */
  upsertByClerkId(clerkId: string, data: Prisma.UserCreateWithoutSubmissionsInput): Promise<User> {
    const { username, bio, techStack, githubUrl } = data;

    return prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, username, bio, techStack, githubUrl },
      update: { username, bio, techStack, githubUrl },
    });
  },

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },
};
