import { userRepository } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "../errors/appError";
import type { ProfileInput, UpdateProfileInput } from "../models/user.schema";
import type { User } from "../generated/prisma/client";
import { buildInsights } from "./insights.service";
import type { ProfileInsights } from "./insights.service";
import { toReviewGivenItem, toReviewReceivedItem } from "./reviewList.service";
import type { ReviewGivenItem, ReviewReceivedItem } from "./reviewList.service";

// The rules about users. No req, no res, no prisma.
//
// This file can be called from a controller, from a script, or from a test, because it
// takes plain values and gives plain values back.
//
// The insight counting lives in insights.service.ts and the review list mapping in
// reviewList.service.ts, kept separate because both are pure, with no Prisma import,
// so they can be tested with no database.

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
  /**
   * The SRS asks that a user can "manage their own activity: requests they have
   * posted, reviews they have given, and reviews they have received." The counts
   * alone do not satisfy that, hence these two full lists alongside them.
   */
  reviewsGivenList: ReviewGivenItem[];
  reviewsReceivedList: ReviewReceivedItem[];
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

    /*
     * A field is only written when the request actually carried it.
     *
     * undefined means the key was absent, so whatever is stored stays. null and the
     * empty string both mean "clear it", and both become null in the database, because
     * an empty bio and no bio are the same thing to a reader.
     *
     * The `!== undefined` guards are what make this a partial update rather than a
     * whole-row overwrite, and they are the reason the edit form uses this instead of
     * /users/sync. See the note on updateProfileSchema for the default that used to
     * sneak an empty techStack past them.
     */
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

    const [reviewsGiven, reviewsReceived, submissions] = await Promise.all([
      userRepository.findReviewsGivenForInsights(user.id),
      userRepository.findReviewsReceived(user.id),
      userRepository.findSubmissionsByAuthor(user.id),
    ]);

    return {
      username: user.username,
      bio: user.bio,
      techStack: user.techStack,
      githubUrl: user.githubUrl,
      karma: user.karma,
      reviewsGiven: reviewsGiven.length,
      reviewsReceived: reviewsReceived.length,
      insights: buildInsights(reviewsGiven),
      submissions: submissions.map((submission) => ({
        id: submission.id,
        title: submission.title,
        tags: submission.tags,
        createdAt: submission.createdAt,
        reviewCount: submission._count.reviews,
        status: submission._count.reviews === 0 ? "pending" : "reviewed",
      })),
      reviewsGivenList: reviewsGiven.map(toReviewGivenItem),
      reviewsReceivedList: reviewsReceived.map(toReviewReceivedItem),
    };
  },
};
