import { prisma } from "../config/prisma";
import type { Prisma, User } from "../generated/prisma/client";

// The only file allowed to talk to the database about users.
//
// Nothing in here decides anything. No permission checks, no rules, no error messages
// for humans. It reads and writes rows, and that is all. The rules live in the service.
//
// Keeping every query in one file means that when a query is wrong, there is exactly
// one place to look.

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
