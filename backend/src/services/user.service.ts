import { userRepository } from "../repositories/user.repository";
import { ConflictError } from "../errors/appError";
import type { ProfileInput, UpdateProfileInput } from "../models/user.schema";
import type { User } from "../generated/prisma/client";

// The rules about users. No req, no res, no prisma.
//
// This file can be called from a controller, from a script, or from a test, because it
// takes plain values and gives plain values back.

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
};
