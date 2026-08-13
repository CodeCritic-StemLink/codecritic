import { submissionRepository } from "../repositories/submission.repository";
import type { SubmissionForFeed } from "../repositories/submission.repository";
import { rankSubmissions } from "./ranking.service";
import type { ScoreBreakdown } from "./ranking.service";
import type { FeedQuery, CreateSubmissionInput } from "../models/submission.schema";
import type { User } from "../generated/prisma/client";

// The rules about submissions. No req, no res, no prisma.

/** One submission as the front end receives it. */
export type FeedItem = {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  tags: string[];
  createdAt: Date;
  author: { username: string; karma: number };
  criteria: Array<{ id: string; label: string; position: number }>;
  reviewCount: number;
  status: "pending" | "reviewed";
  score?: ScoreBreakdown;
};

export type FeedResult = {
  submissions: FeedItem[];
  page: number;
  limit: number;
  total: number;
  personalised: boolean;
};

/**
 * Turns a database row into what the API returns.
 *
 * This is where "status" is worked out. We do not store Pending or Reviewed anywhere,
 * because a stored status is a second copy of a fact the Review table already holds, and
 * two copies can disagree. Counting cannot disagree with itself.
 */
function toFeedItem(row: SubmissionForFeed): FeedItem {
  const reviewCount = row._count.reviews;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    repoUrl: row.repoUrl,
    tags: row.tags,
    createdAt: row.createdAt,
    author: row.author,
    criteria: row.criteria,
    reviewCount,
    status: reviewCount === 0 ? "pending" : "reviewed",
  };
}

export const submissionService = {
  /**
   * The feed. This is Feature 01.
   *
   * A logged out visitor gets newest first, which is what the SRS specifies. A logged in
   * user gets the same submissions reordered by relevance to their tech stack, plus the
   * score breakdown so the interface can show why.
   *
   * On the order of operations: we fetch everything that matches the filters, rank it,
   * and only then cut the page out of it. Ranking after slicing would sort the first
   * twenty rows and hand back a page that was chosen by date and merely shuffled, which
   * is not the same thing at all. The cost is that we load every matching row into
   * memory. With a marking exercise's worth of data that is nothing, and the honest
   * answer if asked how we would scale it is to move the scoring into SQL so the
   * database can sort and page in one query.
   */
  async getFeed(viewer: User | null, query: FeedQuery): Promise<FeedResult> {
    const rows = await submissionRepository.findManyForFeed({
      search: query.search,
      tag: query.tag,
      status: query.status,
    });

    const items = rows.map(toFeedItem);
    const total = items.length;
    const start = (query.page - 1) * query.limit;

    // Nobody signed in: newest first and nothing else. The repository already sorted by
    // createdAt descending, so there is nothing to do.
    if (!viewer) {
      return {
        submissions: items.slice(start, start + query.limit),
        page: query.page,
        limit: query.limit,
        total,
        personalised: false,
      };
    }

    const ranked = rankSubmissions(items, viewer.techStack).map((item) => ({
      ...item,
      score: item.score,
    }));

    return {
      submissions: ranked.slice(start, start + query.limit),
      page: query.page,
      limit: query.limit,
      total,
      personalised: true,
    };
  },

  /**
   * Posts a review request.
   *
   * The author is whichever User row the caller's own token resolved to. There is no
   * parameter here for a different author id, so there is no way to call this on
   * somebody else's behalf even by mistake — the same shape of guarantee PATCH /users/me
   * gives by having no id in its route.
   *
   * Returns the same shape a feed row does: a fresh submission always has zero reviews,
   * so it is always "pending" and never carries a score, same as any other unranked row
   * would look before the viewer is known.
   */
  async createSubmission(author: User, input: CreateSubmissionInput): Promise<FeedItem> {
    const row = await submissionRepository.create(author.id, input);

    return toFeedItem(row);
  },
};