// Tests for the rules on posting a review request.
//
// Run with:  npm test
//
// createSubmissionSchema is the only place those rules are written, and it imports zod
// and nothing else. No repository, so no prisma, so these run with no database. That
// is the whole reason the validation lives in models/ rather than inside the
// controller: a rule you can test on its own is a rule you can prove.
//
// Mentors will call POST /submissions directly with Postman, outside our form. Every
// case below is one of those calls.

import {
  createSubmissionSchema,
  createSubmissionErrorCodes,
} from "../../src/models/submission.schema";

/** A body that satisfies every rule, so each test can break exactly one thing. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "React dashboard that re-renders too often",
    description: "Every keystroke redraws the whole table. Where am I going wrong?",
    repoUrl: "https://github.com/osini/react-dashboard",
    tags: ["React", "Next.js"],
    criteria: ["Code Quality", "Performance"],
    ...overrides,
  };
}

/** The field zod blamed, which is what the controller turns into an error code. */
function failedField(body: unknown): string | undefined {
  const result = createSubmissionSchema.safeParse(body);
  if (result.success) return undefined;
  return String(result.error.issues[0]?.path[0]);
}

// --------------------------------------------------------------------------
// The happy path
// --------------------------------------------------------------------------

test("a body that follows every rule is accepted", () => {
  expect(createSubmissionSchema.safeParse(validBody()).success).toBe(true);
});

test("surrounding whitespace is trimmed off, so it is never stored", () => {
  const result = createSubmissionSchema.parse(
    validBody({ title: "  Spaced out  ", tags: ["  React  "] })
  );

  expect(result.title).toBe("Spaced out");
  expect(result.tags).toEqual(["React"]);
});

// --------------------------------------------------------------------------
// The security rule
// --------------------------------------------------------------------------

// This is the rule the SRS calls out: a user must not be able to post as somebody
// else. It holds because zod drops keys the schema does not declare, so authorId is
// gone before any of our code sees the body. The author comes from the verified token.
test("an authorId in the body is stripped and never reaches our code", () => {
  const result = createSubmissionSchema.parse(
    validBody({ authorId: "somebody-elses-id" })
  );

  expect("authorId" in result).toBe(false);
});

test("any other unexpected field is dropped the same way", () => {
  const result = createSubmissionSchema.parse(
    validBody({ karma: 9999, createdAt: "1999-01-01" })
  );

  expect(Object.keys(result).sort()).toEqual([
    "criteria",
    "description",
    "repoUrl",
    "tags",
    "title",
  ]);
});

// --------------------------------------------------------------------------
// Title
// --------------------------------------------------------------------------

test("an empty title is rejected", () => {
  expect(failedField(validBody({ title: "" }))).toBe("title");
});

test("a title of only spaces is rejected, because the rule is about the trimmed value", () => {
  expect(failedField(validBody({ title: "     " }))).toBe("title");
});

test("a missing title is rejected", () => {
  const body = validBody();
  delete (body as Record<string, unknown>).title;

  expect(failedField(body)).toBe("title");
});

test("a title of exactly 120 characters is accepted, and 121 is not", () => {
  expect(createSubmissionSchema.safeParse(validBody({ title: "a".repeat(120) })).success).toBe(
    true
  );
  expect(failedField(validBody({ title: "a".repeat(121) }))).toBe("title");
});

// --------------------------------------------------------------------------
// Description
// --------------------------------------------------------------------------

test("an empty description is rejected", () => {
  expect(failedField(validBody({ description: "" }))).toBe("description");
});

test("a description of exactly 5000 characters is accepted, and 5001 is not", () => {
  expect(
    createSubmissionSchema.safeParse(validBody({ description: "a".repeat(5000) })).success
  ).toBe(true);
  expect(failedField(validBody({ description: "a".repeat(5001) }))).toBe("description");
});

// --------------------------------------------------------------------------
// Repository URL
// --------------------------------------------------------------------------

test("something that is not a URL is rejected", () => {
  expect(failedField(validBody({ repoUrl: "not-a-url" }))).toBe("repoUrl");
});

test("an empty repository URL is rejected", () => {
  expect(failedField(validBody({ repoUrl: "" }))).toBe("repoUrl");
});

test("a repository URL is not required to be GitHub, because the SRS never says so", () => {
  expect(
    createSubmissionSchema.safeParse(validBody({ repoUrl: "https://gitlab.com/me/thing" }))
      .success
  ).toBe(true);
});

// --------------------------------------------------------------------------
// Tags
// --------------------------------------------------------------------------

test("no tags at all is rejected, because the feed matches on them", () => {
  expect(failedField(validBody({ tags: [] }))).toBe("tags");
});

test("one tag is enough", () => {
  expect(createSubmissionSchema.safeParse(validBody({ tags: ["Rust"] })).success).toBe(true);
});

test("ten tags are allowed, eleven are not", () => {
  const ten = Array.from({ length: 10 }, (_, i) => `tag${i}`);

  expect(createSubmissionSchema.safeParse(validBody({ tags: ten })).success).toBe(true);
  expect(failedField(validBody({ tags: [...ten, "tag10"] }))).toBe("tags");
});

test("a blank tag is rejected rather than quietly stored as an empty string", () => {
  expect(failedField(validBody({ tags: ["React", "   "] }))).toBe("tags");
});

// --------------------------------------------------------------------------
// Criteria, the rule the SRS names by number
// --------------------------------------------------------------------------

test("zero criteria is rejected, because a reviewer would have nothing to score", () => {
  expect(failedField(validBody({ criteria: [] }))).toBe("criteria");
});

test("one criterion is enough", () => {
  expect(
    createSubmissionSchema.safeParse(validBody({ criteria: ["Code Quality"] })).success
  ).toBe(true);
});

test("five criteria are allowed and six are not, which is the SRS rule exactly", () => {
  const five = ["A", "B", "C", "D", "E"];

  expect(createSubmissionSchema.safeParse(validBody({ criteria: five })).success).toBe(true);
  expect(failedField(validBody({ criteria: [...five, "F"] }))).toBe("criteria");
});

test("a blank criterion is rejected", () => {
  expect(failedField(validBody({ criteria: ["Code Quality", ""] }))).toBe("criteria");
});

test("the order the poster typed is kept, because reviewers score them in that order", () => {
  const result = createSubmissionSchema.parse(
    validBody({ criteria: ["Readability", "Performance", "Tests"] })
  );

  expect(result.criteria).toEqual(["Readability", "Performance", "Tests"]);
});

// --------------------------------------------------------------------------
// The field to error code mapping
// --------------------------------------------------------------------------

// The controller reads the failed field from zod and looks the code up here. If a
// field were missing from the map, that failure would fall back to INVALID_TITLE and
// blame the wrong thing, which is a bug we already had once on the feed query.
test("every field in the schema has an error code, so no failure blames the wrong field", () => {
  const fields = ["title", "description", "repoUrl", "tags", "criteria"] as const;

  for (const field of fields) {
    expect(createSubmissionErrorCodes[field]).toBeDefined();
  }
});

test("each field maps to the code docs/api-design.md promises", () => {
  expect(createSubmissionErrorCodes).toEqual({
    title: "INVALID_TITLE",
    description: "INVALID_DESCRIPTION",
    repoUrl: "INVALID_REPO_URL",
    tags: "INVALID_TAGS",
    criteria: "INVALID_CRITERIA",
  });
});
