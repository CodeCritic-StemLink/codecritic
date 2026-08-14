// Tests for the validation rules behind POST /submissions.
//
// Run with:  npm test    (from backend)
//
// This imports only models/submission.schema.ts, which imports only zod. No prisma,
// no express, no database. That matters: the Prisma client throws at load time when
// DATABASE_URL is missing, so any test file that drags in something which imports
// prisma fails before the test itself even runs. Andrew lost time to exactly this.
// Keeping the schema pure is what makes it testable on its own like this.

import { createSubmissionSchema } from "../../src/models/submission.schema";

const validBody = {
  title: "React dashboard that re-renders too often",
  description: "Every keystroke redraws the whole table. Where am I going wrong?",
  repoUrl: "https://github.com/andrew/react-dashboard",
  tags: ["React", "Next.js"],
  criteria: ["Code Quality", "Performance"],
};

test("a fully valid body passes", () => {
  const parsed = createSubmissionSchema.safeParse(validBody);

  expect(parsed.success).toBe(true);
});

// --------------------------------------------------------------------------
// title
// --------------------------------------------------------------------------

test("an empty title fails", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, title: "" });

  expect(parsed.success).toBe(false);
});

test("a title over 120 characters fails", () => {
  const parsed = createSubmissionSchema.safeParse({
    ...validBody,
    title: "a".repeat(121),
  });

  expect(parsed.success).toBe(false);
});

test("a title of exactly 120 characters passes, since the limit is inclusive", () => {
  const parsed = createSubmissionSchema.safeParse({
    ...validBody,
    title: "a".repeat(120),
  });

  expect(parsed.success).toBe(true);
});

test("a title that is only whitespace fails, because the rule is 'after trimming'", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, title: "   " });

  expect(parsed.success).toBe(false);
});

// --------------------------------------------------------------------------
// description
// --------------------------------------------------------------------------

test("an empty description fails", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, description: "" });

  expect(parsed.success).toBe(false);
});

test("a description over 5000 characters fails", () => {
  const parsed = createSubmissionSchema.safeParse({
    ...validBody,
    description: "a".repeat(5001),
  });

  expect(parsed.success).toBe(false);
});

// --------------------------------------------------------------------------
// repoUrl
// --------------------------------------------------------------------------

test("'not a url' as the repo URL fails", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, repoUrl: "not a url" });

  expect(parsed.success).toBe(false);
});

test("an empty repo URL fails", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, repoUrl: "" });

  expect(parsed.success).toBe(false);
});

// --------------------------------------------------------------------------
// tags
// --------------------------------------------------------------------------

test("an empty tags array fails, since at least one tag is required", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, tags: [] });

  expect(parsed.success).toBe(false);
});

test("more than 10 tags fails", () => {
  const tags = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
  const parsed = createSubmissionSchema.safeParse({ ...validBody, tags });

  expect(parsed.success).toBe(false);
});

test("exactly 10 tags passes", () => {
  const tags = Array.from({ length: 10 }, (_, i) => `tag-${i}`);
  const parsed = createSubmissionSchema.safeParse({ ...validBody, tags });

  expect(parsed.success).toBe(true);
});

test("a whitespace-only tag fails, even inside an otherwise valid array", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, tags: ["React", "   "] });

  expect(parsed.success).toBe(false);
});

// --------------------------------------------------------------------------
// criteria — the rule named in the SRS by number, so this is the one a mentor is
// most likely to test directly.
// --------------------------------------------------------------------------

test("zero criteria fails", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, criteria: [] });

  expect(parsed.success).toBe(false);
});

test("six criteria fails", () => {
  const parsed = createSubmissionSchema.safeParse({
    ...validBody,
    criteria: ["A", "B", "C", "D", "E", "F"],
  });

  expect(parsed.success).toBe(false);
});

test("five criteria passes, at the top of the allowed range", () => {
  const parsed = createSubmissionSchema.safeParse({
    ...validBody,
    criteria: ["A", "B", "C", "D", "E"],
  });

  expect(parsed.success).toBe(true);
});

test("one criterion passes, at the bottom of the allowed range", () => {
  const parsed = createSubmissionSchema.safeParse({ ...validBody, criteria: ["A"] });

  expect(parsed.success).toBe(true);
});

test("a whitespace-only criterion fails", () => {
  const parsed = createSubmissionSchema.safeParse({
    ...validBody,
    criteria: ["Code Quality", "  "],
  });

  expect(parsed.success).toBe(false);
});

// --------------------------------------------------------------------------
// authorId — the security rule. Worth proving rather than just believing, because
// this is the field a mentor is most likely to attack directly.
// --------------------------------------------------------------------------

test("an authorId in the body is stripped out and never reaches the parsed result", () => {
  const parsed = createSubmissionSchema.safeParse({
    ...validBody,
    authorId: "someone-elses-id",
  });

  expect(parsed.success).toBe(true);

  // Not just "ignored" in the sense of not mattering — actually absent, so no later
  // code could accidentally read it even by mistake.
  if (parsed.success) {
    expect(parsed.data).not.toHaveProperty("authorId");
  }
});