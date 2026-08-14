# Aaysha: posting a review request

Everything you need to build `POST /submissions` and the form that uses it, in one
place. Written 2026-08-13.

**Why this is the most important piece left.** CodeCritic is three things: post a
request, review someone else's, earn Karma. Nobody can do the first one yet, so nobody
can demonstrate the other two on anything they made themselves. Andrew's reviewing work
and Osini's ranking both sit on top of submissions existing. Until this ships, the
demo has no beginning.

You are building **three separate things**. Do them in this order, because each one is
testable before the next exists.

| # | What | Where | Done when |
| --- | --- | --- | --- |
| 1 | The back end endpoint | `backend/src` | Postman or curl creates a real row |
| 2 | The unit tests | `backend/tests` | `npm test` count goes up and passes |
| 3 | The form | `frontend/src` | You can post a request in a browser |

Do not start the form until the endpoint works. A form built against an endpoint that
does not exist cannot be tested, and you will not know which half is wrong.

---

## Part 1: the back end

### The contract, already agreed

`POST /api/submissions`, auth required.

Request body:

```json
{
  "title": "React dashboard that re-renders too often",
  "description": "Every keystroke redraws the whole table. Where am I going wrong?",
  "repoUrl": "https://github.com/andrew/react-dashboard",
  "tags": ["React", "Next.js"],
  "criteria": ["Code Quality", "Performance"]
}
```

Responds **201** with the created submission.

### The rules, every one of them server side

Mentors will hit the API directly with Postman, outside your form. A check that only
exists in a React form is worth nothing.

| Field | Rule | Error code |
| --- | --- | --- |
| `title` | present, not empty after trimming, at most 120 characters | `INVALID_TITLE` |
| `description` | present, not empty after trimming, at most 5000 characters | `INVALID_DESCRIPTION` |
| `repoUrl` | present and a valid URL | `INVALID_REPO_URL` |
| `tags` | at least 1, at most 10, each not empty after trimming | `INVALID_TAGS` |
| `criteria` | **at least 1 and at most 5**, each not empty after trimming | `INVALID_CRITERIA` |

**The 1 to 5 criteria rule is in the SRS by name.** It is the one a mentor is most
likely to test, so make sure 0 criteria and 6 criteria both fail.

**The author comes from the token, never from the body.** If somebody posts
`"authorId": "someone-else"`, ignore it completely. Do not read that field at all.

### The files to write

Follow the layering in `architecture.md`. Four files, each with one job.

```
backend/src/
  models/submission.schema.ts       <- ADD to this file, do not create a new one
  services/submission.service.ts    <- ADD a create function
  repositories/submission.repository.ts  <- ADD a create function
  routes/submission.routes.ts       <- ADD one line
  controllers/submission.controller.ts   <- ADD a create handler
```

**1. `models/submission.schema.ts`** already exists and holds `feedQuerySchema`. Add
`createSubmissionSchema` beside it, using zod. This is the only place the rules above
are written down.

Zod strips fields it does not know about, which is what makes `authorId` in the body
harmless.

**2. `repositories/submission.repository.ts`** gets a `create` function. This is the
only file allowed to touch `prisma`. The submission and its criteria are created
together with a nested `create`, the same shape Andrew used for a review and its
ratings, so a submission can never exist without its criteria.

Criteria need a `position` so they always come back in the order the poster typed them.

**3. `services/submission.service.ts`** gets a `create` function. It takes the signed
in user and the already validated body, and calls the repository. No `req`, no `res`,
no `prisma`.

**4. `controllers/submission.controller.ts`** gets a `create` handler. It calls
`requireUser(req)`, parses the body with your schema, calls the service, and responds
`201`. Copy the shape of `userController.sync`, which does exactly this.

**5. `routes/submission.routes.ts`**: one line, and **use `writeLimiter`**, because
this route writes.

```ts
submissionRoutes.post("/", writeLimiter, catchAsync(submissionController.create));
```

There is a comment block in that file with your name on it. Delete it when you are
done.

### Prove it works before moving on

Start the server, then from a terminal:

```bash
curl -i -X POST http://localhost:4000/api/submissions -H "Content-Type: application/json" -d "{}"
```

Expect **401**, because there is no token. If you get 400 instead, your auth check is
running after your validation and it should be before.

Then get a real token from the browser (sign in, open the console, `await
window.Clerk.session.getToken()`) and try the five failure cases: empty title, bad
repo URL, no tags, zero criteria, six criteria. Then one that succeeds.

**Write every one of those into `docs/test-plan.md` under your section**, with the
command, the expected result and the real result. Aqeel's section is the example to
copy. That document is graded evidence, not a formality.

---

## Part 2: the unit tests

We use **Jest**. From `backend`:

```bash
npm test
```

Tests live in `backend/tests/`, mirroring `src/`. The test for
`src/services/x.service.ts` goes in `tests/services/x.service.test.ts`. That is the
whole rule.

### The thing that will trip you up

**A test file must not import anything that imports `prisma`.** The Prisma client
throws at load time when `DATABASE_URL` is missing, so one such import makes the test
fail before your code runs. Andrew hit this and lost time to it.

That is why `ranking.service.ts` and `insights.service.ts` are separate files with no
repository import. Do the same: put the part worth testing somewhere pure.

For you the pure part is **the validation**. If you write it as a zod schema in
`models/submission.schema.ts`, that file imports only zod, so it is directly testable:

```
backend/tests/models/submission.schema.test.ts
```

### What to test, at least

- A fully valid body passes
- Empty title fails, title of 121 characters fails
- Empty description fails
- `"not a url"` as `repoUrl` fails
- An empty tags array fails
- **Zero criteria fails, and six criteria fails, and five passes**
- Whitespace-only strings fail, because the rule says "after trimming"
- An `authorId` in the body is stripped out and does not appear in the parsed result

That last one is worth writing because it is the security rule, and a test is how you
prove it holds rather than just believing it.

Check your work: `npm test` should report **more than 34 tests** when you are done.

---

## Part 3: the form

`/submissions/new`, a new page.

```
frontend/src/
  app/submissions/new/page.tsx        <- the route
  components/SubmissionForm.tsx       <- the form itself, a client component
  services/submission.service.ts      <- ADD a createSubmission function
```

### How it talks to the API

Never call `fetch` directly. `src/api/api.ts` is the only place that does. Add a
function to `services/submission.service.ts` next to `getFeed`, following the shape of
`createReview` in `services/review.service.ts`.

### The part that is actually yours to design

**Criteria are added by the poster, 1 to 5 of them.** So the form needs an "add
criterion" control, a remove control, and it has to stop at five. This is the only
genuinely interesting piece of the form and the bit you will be asked about.

The rest is four ordinary inputs: title, description, repo URL, tags.

### Rules for the form

- It is a **client component**, `"use client"`, because it holds what the user typed
- Get the token with `useAuth()` from Clerk, exactly as `ReviewForm.tsx` does
- On success, send the person to the submission that was just created
- Show the API's error message when it fails. Do not swallow it and show your own
  wording, because then nobody can tell which rule was broken
- **Do not rely on the browser for validation.** `required` on an input is a
  convenience for the user, not a rule. The rule lives on the server

### Responsive

Phone, tablet and desktop, because the SRS asks for it. Check at phone width before you
open the pull request. In Chrome: F12, then Ctrl+Shift+M.

---

## Before you open the pull request

```bash
cd backend  && npm test && npm run typecheck
cd frontend && npm test && npm run typecheck && npm run lint
```

All five must pass.

Then check `git status`. **If `package-lock.json` changed and `package.json` did not,
undo the lockfile change.** It is npm version noise and it has been reverted twice on
this project already:

```bash
git checkout backend/package-lock.json
```

Open the pull request into **`develop`**, never into `main`. `main` is production and
merging there puts code on the public site within two minutes.

## Where to look when you are stuck

| You need an example of | Read |
| --- | --- |
| A zod schema with rules | `backend/src/models/user.schema.ts` |
| A controller that requires a token | `backend/src/controllers/user.controller.ts`, the `sync` function |
| A repository creating parent and children together | `backend/src/repositories/review.repository.ts` |
| A pure unit test with no database | `backend/tests/services/insights.service.test.ts` |
| A client form that posts with a token | `frontend/src/components/ReviewForm.tsx` |
| Written up test evidence | `docs/test-plan.md`, Aqeel's section |

Ask in the group chat before inventing anything. Every decision on this project is
written down somewhere, and if it is not, it is a decision worth making together.
