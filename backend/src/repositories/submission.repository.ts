import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";

// The only file allowed to talk to the database about submissions.
//
// Nothing here decides anything. It builds queries and returns rows. The rules and the
// ranking live in the service.

/** What the feed needs about each submission, in one shape used everywhere below. */
const feedInclude = {
  author: {
    select: { username: true, karma: true },
  },
  criteria: {
    orderBy: { position: "asc" },
    select: { id: true, label: true, position: true },
  },
  // _count asks the database to count related rows for us. One grouped query for the
  // whole page, not one extra query per submission.
  _count: {
    select: { reviews: true },
  },
} satisfies Prisma.SubmissionInclude;

export type SubmissionForFeed = Prisma.SubmissionGetPayload<{ include: typeof feedInclude }>;

export type FeedFilters = {
  search?: string;
  tag?: string;
  status?: "pending" | "reviewed";
};

/** Turns the query string filters into a Prisma where clause. */
function buildWhere(filters: FeedFilters): Prisma.SubmissionWhereInput {
  const where: Prisma.SubmissionWhereInput = {};

  if (filters.search) {
    // mode insensitive means "REACT" finds "React". Postgres is case sensitive by default.
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.tag) {
    // has checks whether the tags array contains this exact value.
    where.tags = { has: filters.tag };
  }

  if (filters.status === "pending") {
    // Pending is not a stored column. It means no reviews exist, so we ask that instead.
    where.reviews = { none: {} };
  }

  if (filters.status === "reviewed") {
    where.reviews = { some: {} };
  }

  return where;
}

export const submissionRepository = {
  /**
   * Every submission matching the filters, newest first.
   *
   * Note there is no skip or take here. The service ranks the whole matching set before
   * paginating, because ranking after slicing would sort only the first twenty rows and
   * the order would be wrong. See the comment in submission.service.ts.
   */
  findManyForFeed(filters: FeedFilters): Promise<SubmissionForFeed[]> {
    return prisma.submission.findMany({
      where: buildWhere(filters),
      include: feedInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string): Promise<SubmissionForFeed | null> {
    return prisma.submission.findUnique({
      where: { id },
      include: feedInclude,
    });
  },
};
