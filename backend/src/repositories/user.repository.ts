import { prisma } from "../config/prisma";
import type { Prisma, User } from "../generated/prisma/client";

// The only file allowed to talk to the database about users.
//
// Nothing in here decides anything. No permission checks, no rules, no error messages
// for humans. It reads and writes rows, and that is all. The rules live in the service.
//
// Keeping every query in one file means that when a query is wrong, there is exactly
// one place to look.

/** What the profile insights need from each review this person wrote. */
const reviewGivenSelect = {
  createdAt: true,
  submission: { select: { tags: true } },
  ratings: { select: { score: true } },
} satisfies Prisma.ReviewSelect;

export type ReviewGivenForInsights = Prisma.ReviewGetPayload<{ select: typeof reviewGivenSelect }>;

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

  /** How many reviews were written on submissions this person authored. Feature 02. */
  countReviewsReceived(userId: string): Promise<number> {
    return prisma.review.count({ where: { submission: { authorId: userId } } });
  },

  /**
   * Every review this person wrote, with just enough about the submission and the
   * ratings to build the profile insights. Feature 02.
   */
  findReviewsGivenForInsights(userId: string): Promise<ReviewGivenForInsights[]> {
    return prisma.review.findMany({
      where: { reviewerId: userId },
      select: reviewGivenSelect,
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
