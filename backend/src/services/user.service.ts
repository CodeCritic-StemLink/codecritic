import { userRepository } from "../repositories/user.repository";
import type { ReviewGivenForInsights } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "../errors/appError";
import type { ProfileInput, UpdateProfileInput } from "../models/user.schema";
import type { User } from "../generated/prisma/client";

// The rules about users. No req, no res, no prisma.
//
// This file can be called from a controller, from a script, or from a test, because it
// takes plain values and gives plain values back.

/** One entry in "which technologies does this person review in". */
export type TagCount = { tag: string; count: number };

/** One entry in "how many reviews did this person write in a given month". */
export type MonthCount = { month: string; count: number };

export type ProfileInsights = {
  reviewsByTag: TagCount[];
  reviewsByMonth: MonthCount[];
  /** Null when this person has never rated anything, rather than a misleading 0. */
  averageScoreGiven: number | null;
};

export type ProfileSubmission = {
  id: string;
  title: string;
  tags: string[];
  createdAt: Date;
  reviewCount: number;
  status: "pending" | "reviewed";
};

/**
 * The public profile. Feature 02.
 *
 * Deliberately excludes id and clerkId: nothing here identifies the row internally,
 * only what a visitor is allowed to see about the person.
 */
export type PublicProfile = {
  username: string;
  bio: string | null;
  techStack: string[];
  githubUrl: string | null;
  karma: number;
  reviewsGiven: number;
  reviewsReceived: number;
  insights: ProfileInsights;
  submissions: ProfileSubmission[];
};

export const userService = {
  /**
   * Creates our User row the first time a Clerk identity appears, updates it after that.
   *
   * This closes the gap the SRS names: Clerk knows who somebody is, but their karma,
   * their tech stack and everything they have posted live in our own database. The two
   * are joined by clerkId, which comes from the verified token and never from the body.
   */
  async syncProfile(clerkId: string, input: ProfileInput): Promise<User> {
    await this.assertUsernameIsFree(input.username, clerkId);

    return userRepository.upsertByClerkId(clerkId, {
      clerkId,
      username: input.username,
      bio: input.bio || null,
      techStack: input.techStack,
      githubUrl: input.githubUrl || null,
    });
  },

  /**
   * Edits a profile.
   *
   * Takes the user whose profile it is, not an id from the request, so there is no way
   * to aim this at somebody else's row. That is our answer to the SRS rule that a user
   * must not be able to edit another user's profile.
   */
  async updateProfile(me: User, input: UpdateProfileInput): Promise<User> {
    if (input.username && input.username !== me.username) {
      await this.assertUsernameIsFree(input.username, me.clerkId);
    }

    return userRepository.update(me.id, {
      ...(input.username !== undefined && { username: input.username }),
      ...(input.bio !== undefined && { bio: input.bio || null }),
      ...(input.techStack !== undefined && { techStack: input.techStack }),
      ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl || null }),
    });
  },

  /**
   * Usernames are unique in the database, so a clash would throw a raw Prisma error.
   * Checking first lets us return a clear message instead.
   */
  async assertUsernameIsFree(username: string, forClerkId: string): Promise<void> {
    const existing = await userRepository.findByUsername(username);

    if (existing && existing.clerkId !== forClerkId) {
      throw new ConflictError("Somebody already has that username.", "USERNAME_TAKEN");
    }
  },

  /**
   * The public profile. Feature 02.
   *
   * The one rule worth stating twice, because it is the trap the SRS itself calls out:
   * reviews received is NOT reviews where this person is the reviewer. It is reviews
   * written on submissions this person authored. Those are two different relations,
   * queried two different ways in the repository.
   */
  async getProfile(username: string): Promise<PublicProfile> {
    const user = await userRepository.findByUsername(username);

    if (!user) {
      throw new NotFoundError("No user with that username.", "USER_NOT_FOUND");
    }

    const [reviewsReceived, reviewsGiven, submissions] = await Promise.all([
      userRepository.countReviewsReceived(user.id),
      userRepository.findReviewsGivenForInsights(user.id),
      userRepository.findSubmissionsByAuthor(user.id),
    ]);

    return {
      username: user.username,
      bio: user.bio,
      techStack: user.techStack,
      githubUrl: user.githubUrl,
      karma: user.karma,
      reviewsGiven: reviewsGiven.length,
      reviewsReceived,
      insights: buildInsights(reviewsGiven),
      submissions: submissions.map((submission) => ({
        id: submission.id,
        title: submission.title,
        tags: submission.tags,
        createdAt: submission.createdAt,
        reviewCount: submission._count.reviews,
        status: submission._count.reviews === 0 ? "pending" : "reviewed",
      })),
    };
  },
};

/**
 * Turns the raw reviews this person wrote into the three insight figures.
 *
 * Pure function, no database, no request: takes what the repository already fetched
 * and does the counting. Kept separate from the service method so it can be read, and
 * tested, on its own.
 */
function buildInsights(reviews: ReviewGivenForInsights[]): ProfileInsights {
  const tagCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  let scoreTotal = 0;
  let scoreCount = 0;

  for (const review of reviews) {
    for (const tag of review.submission.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    // "2026-08", grouping by calendar month regardless of which day it happened.
    const month = review.createdAt.toISOString().slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);

    for (const rating of review.ratings) {
      scoreTotal += rating.score;
      scoreCount += 1;
    }
  }

  const reviewsByTag = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const reviewsByMonth = [...monthCounts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    reviewsByTag,
    reviewsByMonth,
    // Rounded to one decimal place so the UI never shows a long float. Null, not 0,
    // when nobody has ever been scored, so "no data" cannot be misread as "scored zero".
    averageScoreGiven: scoreCount === 0 ? null : Math.round((scoreTotal / scoreCount) * 10) / 10,
  };
}
