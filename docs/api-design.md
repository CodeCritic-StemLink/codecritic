# API design

Version 1, written 2026-08-11 before implementation. Build state updated 2026-08-12.

The back end is Node.js with Express and TypeScript. It talks to PostgreSQL through Prisma.
The front end never touches the database directly, it only calls the endpoints below.

---

## 1. Conventions

**Base URL**

| Environment | URL |
| --- | --- |
| Local | `http://localhost:4000/api` |
| Deployed | set later, from the back end host |

**Authentication**

Clerk issues a session token in the browser. The front end sends it on every request that needs
a signed in user:

```
Authorization: Bearer <clerk session token>
```

The back end verifies that token with Clerk's middleware, reads the Clerk user id from it, and
looks up the matching `User` row by `clerkId`. A request with no token, an expired token, or a
forged token is treated as a logged out visitor.

**Never trust the body for identity.** The reviewer id and author id always come from the
verified token, never from a field the client sent. Otherwise anyone could post as anyone.

**Response shape**

Success returns the resource directly. Errors always look like this:

```json
{
  "error": {
    "code": "SELF_REVIEW_FORBIDDEN",
    "message": "You cannot review your own submission."
  }
}
```

**Status codes used**

| Code | Meaning |
| --- | --- |
| 200 | Fine |
| 201 | Created |
| 400 | The request body failed validation |
| 401 | No valid Clerk token was sent |
| 403 | Signed in, but not allowed to do this |
| 404 | Not found |
| 409 | Conflict, for example reviewing the same submission twice |
| 500 | Our fault |

---

## 2. Endpoint summary

| Method | Path | Auth | Purpose | State | Owner |
| --- | --- | --- | --- | --- | --- |
| GET | `/submissions` | Optional | The feed. Ranked when signed in, newest first when not. | Plain version works, ranking to come | Osini |
| GET | `/submissions/:id` | Optional | One request in full, with criteria and reviews. | **Built** | Andrew |
| POST | `/submissions` | Required | Post a new review request. | **Built** | Aaysha |
| POST | `/submissions/:id/reviews` | Required | Write a review and earn +2 Karma. | **Built** | Andrew |
| GET | `/users/:username` | Optional | Public profile with insights. | **Built** | Aqeel |
| POST | `/users/sync` | Required | Create or update our User row from the Clerk identity. | **Built** | Osini |
| PATCH | `/users/me` | Required | Edit your own profile only. | **Built** | Osini |

---

## 3. Endpoints in detail

### GET /submissions

The public feed. **This endpoint is Feature 01.**

**Auth:** optional. Behaviour changes depending on whether a valid token is present.

**Query parameters**

| Name | Type | Default | Purpose |
| --- | --- | --- | --- |
| `search` | string | none | Matches title and description, case insensitive |
| `tag` | string | none | Only submissions carrying this tag |
| `status` | `pending` or `reviewed` | none | Filter by derived status |
| `page` | number | 1 | Pagination |
| `limit` | number | 20 | Page size, capped at 50 |

**Ordering**

Logged out: `createdAt` descending. Newest first, nothing else.

Logged in: every submission is scored and the list is sorted by score, highest first. Ties break
on `createdAt` descending.

```
score = 12 * (number of the submission's tags found in the user's techStack)
      + round(10 * 0.5 ^ (hoursOld / 48))
      + 6 if the submission has zero reviews
      - 8 if this user has already reviewed it
```

The four parts, and why each one is there:

| Part | Weight | Reason |
| --- | --- | --- |
| Tag match | 12 per matching tag | The spec's core requirement. Highest weight because relevance beats freshness. A perfect stack match should outrank anything. |
| Recency | up to 10, halving every 48 hours | A month old request is less useful to answer than a fresh one. Decay rather than a cliff, so nothing vanishes suddenly. |
| Zero reviews | flat 6 | Our own ranking improvement. Without it, requests that already have attention keep getting more, and a beginner's first post is never seen. |
| Already reviewed by you | flat -8 | One review per person per submission is a rule, so a request you have answered is one you can do nothing more with. Smaller than a tag match, so relevance still wins and nothing is hidden. |

The scoring runs **on the server**, inside this endpoint. The browser never receives the scoring
code. Two reasons: the client cannot be trusted to sort honestly, and the database already holds
every value the formula needs.

**Ranked before paged.** The endpoint loads every submission matching the filters, scores all of
them, sorts, and only then cuts out the requested page. Paging first would return a page chosen
by date and merely shuffled, so the most relevant request on page three could never reach page
one.

**The tag filter ignores case.** `?tag=Node`, `?tag=node` and `?tag=NODE` return the same rows,
because tags are typed by hand on the post form and both spellings really occur. It goes through
the same comparison the scoring uses, so the filter and the ranking can never disagree about
whether two tags are the same technology. This one filter is applied in the service rather than
in SQL, since Postgres array containment is exact and case sensitive.

**Response 200**

```json
{
  "submissions": [
    {
      "id": "clx123",
      "title": "React dashboard that re-renders too often",
      "description": "Every keystroke redraws the whole table.",
      "repoUrl": "https://github.com/andrew/react-dashboard",
      "tags": ["React", "Next.js"],
      "createdAt": "2026-08-11T09:00:00.000Z",
      "author": { "username": "andrew_builds", "karma": 22 },
      "reviewCount": 0,
      "status": "pending",
      "reviewedByViewer": false,
      "criteria": [{ "id": "c1", "label": "Code Quality", "position": 0 }],
      "score": {
        "total": 40,
        "tagPoints": 24,
        "matchedTags": ["React", "Next.js"],
        "recencyPoints": 10,
        "needsHelpPoints": 6,
        "alreadyReviewedPoints": 0
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 6,
  "personalised": true
}
```

`score` is only present when `personalised` is true. It is what powers the "Why this order?"
toggle in the UI, which turns the demo from a claim into visible proof.

`reviewedByViewer` is always `false` for a logged out visitor, since there is nobody for it to
be about. Signed in it drives both the `-8` in the score and the "you reviewed this" line on the
card, so a request that has quietly dropped down the feed does not look like it moved for no
reason.

---

### GET /submissions/:id

One review request in full.

**Auth:** optional. Signed in users get two extra fields telling the UI whether to show the
review button.

**Response 200**

```json
{
  "id": "clx123",
  "title": "React dashboard that re-renders too often",
  "description": "Every keystroke redraws the whole table.",
  "repoUrl": "https://github.com/andrew/react-dashboard",
  "tags": ["React", "Next.js"],
  "createdAt": "2026-08-11T09:00:00.000Z",
  "author": { "username": "andrew_builds", "karma": 22, "techStack": ["Python"] },
  "status": "reviewed",
  "criteria": [
    { "id": "c1", "label": "Code Quality", "position": 0 },
    { "id": "c2", "label": "Performance", "position": 1 }
  ],
  "reviews": [
    {
      "id": "r1",
      "strengths": "Routes are grouped sensibly.",
      "improvements": "Move validation into middleware.",
      "resources": ["https://expressjs.com/en/guide/using-middleware.html"],
      "createdAt": "2026-08-11T10:00:00.000Z",
      "reviewer": { "username": "aqeel_codes", "karma": 8 },
      "ratings": [
        { "criterionId": "c1", "label": "Code Quality", "score": 8 },
        { "criterionId": "c2", "label": "Performance", "score": 6 }
      ]
    }
  ],
  "viewer": { "isAuthor": false, "hasReviewed": false }
}
```

**404** if no submission has that id.

---

### POST /submissions

Post a new review request.

**Auth:** required.

**Request body**

```json
{
  "title": "React dashboard that re-renders too often",
  "description": "Every keystroke redraws the whole table. Where am I going wrong?",
  "repoUrl": "https://github.com/andrew/react-dashboard",
  "tags": ["React", "Next.js"],
  "criteria": ["Code Quality", "Performance"]
}
```

**Validation, all server side**

| Field | Rule | Error code on failure |
| --- | --- | --- |
| `title` | Present, not empty after trimming, at most 120 characters | `INVALID_TITLE` |
| `description` | Present, not empty after trimming, at most 5000 characters | `INVALID_DESCRIPTION` |
| `repoUrl` | Present and a valid URL | `INVALID_REPO_URL` |
| `tags` | Array of at least 1, at most 10, each non empty after trimming | `INVALID_TAGS` |
| `criteria` | Array of at least 1 and at most 5, each non empty after trimming | `INVALID_CRITERIA` |

The author is taken from the verified token. An `authorId` in the body is ignored.

**Response 201** returns the created submission in the same shape as `GET /submissions/:id`.

---

### POST /submissions/:id/reviews

Write a review. **This is the endpoint that awards Karma, so it is the one most worth attacking
and the one that needs the most care.**

**Auth:** required.

**Request body**

```json
{
  "strengths": "The hashing strategy is smart, cheap check first.",
  "improvements": "You read whole files into memory. Stream them instead.",
  "resources": ["https://nodejs.org/api/stream.html"],
  "ratings": [
    { "criterionId": "c1", "score": 8 },
    { "criterionId": "c2", "score": 6 }
  ]
}
```

**Validation, all server side, in this order**

| Check | Failure | Code |
| --- | --- | --- |
| Submission exists | 404 | `SUBMISSION_NOT_FOUND` |
| Reviewer is not the author | 403 | `SELF_REVIEW_FORBIDDEN` |
| Reviewer has not already reviewed this submission | 409 | `DUPLICATE_REVIEW` |
| `strengths` present, not empty, at most 5000 characters | 400 | `INVALID_STRENGTHS` |
| `improvements` present, not empty, at most 5000 characters | 400 | `INVALID_IMPROVEMENTS` |
| `resources`, if present, is an array of valid URLs, at most 5 | 400 | `INVALID_RESOURCES` |
| `ratings` covers every criterion on the submission, no extras, no duplicates | 400 | `INCOMPLETE_RATINGS` |
| Every `score` is an integer from 1 to 10 | 400 | `INVALID_SCORE` |

The duplicate check is enforced twice on purpose: once in the application for a clear error
message, and once by the unique constraint on (`submissionId`, `reviewerId`) in the database, so
two requests arriving at the same instant cannot both succeed.

**The write, as one transaction**

```
prisma.$transaction([
  create the Review,
  create every Rating,
  increment the reviewer's karma by 2
])
```

All three succeed or all three roll back. This is what makes the Karma total trustworthy: there
is no path that produces Karma without a stored review, and no path that stores a review without
the Karma.

**Response 201** returns the created review, plus the reviewer's new Karma total so the UI can
update the number in the navigation bar without another request.

---

### GET /users/:username

Public profile. **This is Feature 02.**

**Auth:** optional.

**Response 200**

```json
{
  "username": "aqeel_codes",
  "bio": "Back end and databases.",
  "techStack": ["Node", "Express", "Prisma"],
  "githubUrl": "https://github.com/aqeel",
  "karma": 8,
  "reviewsGiven": 4,
  "reviewsReceived": 3,
  "insights": {
    "reviewsByTag": [
      { "tag": "Node", "count": 3 },
      { "tag": "React", "count": 1 }
    ],
    "reviewsByMonth": [
      { "month": "2026-07", "count": 1 },
      { "month": "2026-08", "count": 3 }
    ],
    "averageScoreGiven": 6.8
  },
  "submissions": []
}
```

How each figure is calculated, so any member can answer when asked:

| Figure | Calculation |
| --- | --- |
| `karma` | Read straight off the `User` row. Equals `reviewsGiven * 2`. |
| `reviewsGiven` | Count of `Review` rows where `reviewerId` is this user |
| `reviewsReceived` | Count of `Review` rows whose submission's `authorId` is this user |
| `reviewsByTag` | For every review this user wrote, take the tags of the submission it was written on, then count each tag |
| `reviewsByMonth` | Group this user's reviews by the year and month of `createdAt` |
| `averageScoreGiven` | Mean of the `score` on every `Rating` belonging to this user's reviews |

**404** if no user has that username.

---

### POST /users/sync

Called by the front end right after a Clerk sign in. Creates the local `User` row if this Clerk
identity has never been seen, updates it if it has.

**Auth:** required.

**Request body**

```json
{
  "username": "osini_dev",
  "bio": "Learning full stack.",
  "techStack": ["Next.js", "Prisma"],
  "githubUrl": "https://github.com/osini"
}
```

**Validation**

| Field | Rule | Code |
| --- | --- | --- |
| `username` | 3 to 30 characters, letters, numbers, underscore only, unique | `INVALID_USERNAME` or `USERNAME_TAKEN` |
| `bio` | Optional, at most 500 characters | `INVALID_BIO` |
| `techStack` | Array, at most 20 entries | `INVALID_TECH_STACK` |
| `githubUrl` | Optional, valid URL if present | `INVALID_GITHUB_URL` |

`karma` is never accepted from the client. If the body contains it, it is ignored.

**Response 200** returns the user.

---

### PATCH /users/me

Edit your own profile. Same fields and same validation as `/users/sync`, with one difference that
matters more than it looks:

| | `POST /users/sync` | `PATCH /users/me` |
| --- | --- | --- |
| Creates the row if missing | Yes | No |
| Fields left out of the body | **Set to null** | **Left alone** |
| Used by | The very first save | Every edit after it |

**The front end picks between them deliberately.** Sync writing every column is correct when there
is no row yet and nothing to lose. Once a profile exists, a save that could not first read what was
there must not be able to flatten it, so an edit is a partial update.

This was a real bug, not a hypothetical. The setup form used sync for edits and treated any failure
to read the existing profile as "this person has no profile", so if the API was restarting when the
page opened, the form appeared blank and saving it wrote blanks over a real bio and tech stack. The
form now refuses to save anything it could not first read. See `docs/feature-02-profiles.md`.

**Three states, not two.** For each field:

| What the body carries | What happens |
| --- | --- |
| The key is absent | Whatever is stored is left alone |
| The key is `null`, or `""` for text | The field is cleared |
| The key has a value | The field is set to it |

Both halves of that were broken and both are fixed:

- `techStack` carried a `.default([])`, and `.partial()` makes a key optional **without removing its
  default**. So `PATCH {"bio":"hi"}` parsed to `{bio:"hi", techStack:[]}` and the update wrote the
  empty array, erasing the caller's whole tech stack. The edit schema is now built from the field
  rules directly, so no default can leak into it. Creating a profile still defaults the stack, where
  there is nothing to lose.
- Nothing could be **cleared**. A blank box became `undefined`, `JSON.stringify` drops undefined
  keys, so the field never arrived and the old value stayed. `bio` and `githubUrl` accept `null` now,
  and the form sends `null` rather than `undefined`.

Both are covered by tests in `backend/tests/models/user.schema.test.ts`, and were verified against
the real database before and after.

There is deliberately no `PATCH /users/:id`. The route has no id in it at all, so there is no way
to aim it at somebody else's row. That is the simplest possible answer to the spec's requirement
that a user must not be able to edit another user's profile.

---

## 4. Error codes in one list

| Code | Status | Meaning |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | No valid Clerk token |
| `SUBMISSION_NOT_FOUND` | 404 | No submission with that id |
| `USER_NOT_FOUND` | 404 | No user with that username |
| `SELF_REVIEW_FORBIDDEN` | 403 | You wrote this submission |
| `DUPLICATE_REVIEW` | 409 | You have already reviewed this submission |
| `INVALID_TITLE` | 400 | Missing or empty or too long |
| `INVALID_DESCRIPTION` | 400 | Missing or empty or too long |
| `INVALID_REPO_URL` | 400 | Missing or not a URL |
| `INVALID_TAGS` | 400 | Fewer than 1 or more than 10 |
| `INVALID_CRITERIA` | 400 | Fewer than 1 or more than 5 |
| `INVALID_STRENGTHS` | 400 | Missing or empty or too long |
| `INVALID_IMPROVEMENTS` | 400 | Missing or empty or too long |
| `INVALID_RESOURCES` | 400 | Not an array of valid URLs, or more than 5 |
| `INCOMPLETE_RATINGS` | 400 | Does not cover exactly the submission's criteria |
| `INVALID_SCORE` | 400 | Not an integer from 1 to 10 |
| `INVALID_USERNAME` | 400 | Wrong shape |
| `USERNAME_TAKEN` | 409 | Someone already has it |
| `INTERNAL_ERROR` | 500 | Our fault |

---

## 5. How we will prove the validation works

Mentors will call these endpoints directly, outside the front end. Before final assessment we
run each of these by hand and keep the results:

1. `POST /submissions` with no token, expect 401
2. `POST /submissions` with an empty title, expect 400 `INVALID_TITLE`
3. `POST /submissions` with 6 criteria, expect 400 `INVALID_CRITERIA`
4. `POST /submissions/:id/reviews` on your own submission, expect 403 `SELF_REVIEW_FORBIDDEN`
5. The same review twice, expect 409 `DUPLICATE_REVIEW` on the second
6. A review with a score of 11, expect 400 `INVALID_SCORE`
7. A review missing one criterion, expect 400 `INCOMPLETE_RATINGS`
8. A review with `"karma": 9999` in the body, expect it to be ignored
9. `PATCH /users/me` while signed in as someone else, confirm only your own row changes
10. After every failed attempt above, confirm the reviewer's Karma has not moved
