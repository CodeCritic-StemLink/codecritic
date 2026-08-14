// Tests for the review validation rules. This is the endpoint that awards Karma, so
// it is the one most worth attacking — see docs/test-plan.md, Andrew's section.
//
// This file needs no database and no server, because validateReviewFields is pure.
// See the comment at the top of models/review.schema.ts for why.

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateReviewFields } from "../../src/models/review.schema";
import { BadRequestError } from "../../src/errors/appError";

const CRITERIA = [{ id: "c1" }, { id: "c2" }];

/** Runs fn, asserts it threw a BadRequestError, and asserts it carries this code. */
function assertRejects(fn: () => unknown, code: string) {
  try {
    fn();
    assert.fail(`expected validation to throw ${code}, but it did not throw`);
  } catch (error) {
    assert.ok(error instanceof BadRequestError, "expected a BadRequestError");
    assert.equal((error as BadRequestError).code, code);
  }
}

test("accepts a fully valid review", () => {
  const result = validateReviewFields(
    {
      strengths: "Clear structure, easy to follow.",
      improvements: "Add a few tests around the edge cases.",
      resources: ["https://example.com/guide"],
      ratings: [
        { criterionId: "c1", score: 8 },
        { criterionId: "c2", score: 6 },
      ],
    },
    CRITERIA
  );

  assert.equal(result.strengths, "Clear structure, easy to follow.");
  assert.equal(result.resources.length, 1);
  assert.deepEqual(
    result.ratings.map((r) => r.criterionId).sort(),
    ["c1", "c2"]
  );
});

test("accepts a review with no resources at all", () => {
  const result = validateReviewFields(
    {
      strengths: "Fine.",
      improvements: "Fine.",
      ratings: [
        { criterionId: "c1", score: 5 },
        { criterionId: "c2", score: 5 },
      ],
    },
    CRITERIA
  );

  assert.deepEqual(result.resources, []);
});

test("rejects empty strengths", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "   ",
          improvements: "fine",
          ratings: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_STRENGTHS"
  );
});

test("rejects missing strengths entirely", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          improvements: "fine",
          ratings: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_STRENGTHS"
  );
});

test("rejects empty improvements", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "",
          ratings: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_IMPROVEMENTS"
  );
});

test("rejects a resource that is not a valid URL", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          resources: ["definitely not a url"],
          ratings: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_RESOURCES"
  );
});

test("rejects more than 5 resources", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          resources: Array(6).fill("https://example.com"),
          ratings: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_RESOURCES"
  );
});

test("rejects ratings missing one criterion", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          ratings: [{ criterionId: "c1", score: 5 }],
        },
        CRITERIA
      ),
    "INCOMPLETE_RATINGS"
  );
});

test("rejects a rating for a criterion that does not belong to this submission", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          ratings: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c2", score: 5 },
            { criterionId: "belongs-to-a-different-submission", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INCOMPLETE_RATINGS"
  );
});

test("rejects a duplicate rating on the same criterion", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          ratings: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c1", score: 6 },
          ],
        },
        CRITERIA
      ),
    "INCOMPLETE_RATINGS"
  );
});

test("rejects a score of 11", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          ratings: [
            { criterionId: "c1", score: 11 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_SCORE"
  );
});

test("rejects a score of 0", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          ratings: [
            { criterionId: "c1", score: 0 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_SCORE"
  );
});

test("rejects a non-integer score", () => {
  assertRejects(
    () =>
      validateReviewFields(
        {
          strengths: "fine",
          improvements: "fine",
          ratings: [
            { criterionId: "c1", score: 5.5 },
            { criterionId: "c2", score: 5 },
          ],
        },
        CRITERIA
      ),
    "INVALID_SCORE"
  );
});