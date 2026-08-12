# Architecture

How the code is laid out, why, and the rules everyone follows. Read this before writing any file
in `backend/src` or `frontend/src`.

Written 2026-08-12. This layout follows the structure taught in the programme's back end classes,
so that our code reads the way our mentors expect it to read.

---

## 1. Decisions we have locked

These came up because the class notes and the SRS said different things. The SRS is the graded
document, so the SRS wins. Written here so nobody reopens them.

| Question | Decision | Why |
| --- | --- | --- |
| Does posting a submission earn Karma? | **No.** Only writing a review does, and it is always exactly +2. | The SRS says "Karma is fixed at +2 per review, static, with no weighting". Our whole profile calculation depends on karma equalling reviews times two. |
| Do we build comments with threaded replies? | **No.** | The SRS has no comment entity, no comment workflow and no notification system. A review already carries written feedback. Adding a conversation layer is a second feature wearing the first one's clothes. |
| Are scores out of 5 or out of 10? | **Out of 10.** | The SRS says "a numeric rating (out of 10)". Some example designs show 5. The spec wins. |
| Do we upload files to object storage? | **No.** | Nothing in the SRS needs a stored file. Submissions link to a GitHub repository. |

If a mentor asks for any of these later, all three are additive and none of them break what we
have built.

---

## 2. Why the back end has layers

Right now a small API can be one file. By Thursday it will not be, and four people will be
editing it.

The layers exist so that **each file has exactly one reason to change**. A request passes through
four hands on its way in:

```
HTTP request
    |
routes/         says which controller handles this path
    |
controllers/    unpacks the request, validates the body, calls a service, sends the response
    |
services/       the actual thinking: rules, permissions, transactions
    |
repositories/   the only code in the project that talks to Prisma
    |
PostgreSQL
```

**What this buys us, in plain terms.** When something is broken you know which file to open before
you start looking. A wrong database query is a repository problem. A wrong rule is a service
problem. A wrong status code is a controller problem.

It also makes services testable. A service takes values and returns values, so a test can call it
directly without pretending to be a web browser. That is how `ranking.service.ts` already has 19
tests with no database involved.

---

## 3. Back end structure

```
backend/
  prisma/
    schema.prisma            the five tables
    migrations/              the history of how they were built
    seed.ts                  demo data

  src/
    app.ts                   builds the express app: cors, json, morgan, clerk, routes, errors
    server.ts                starts listening. Separate from app.ts so tests can import the app.

    config/
      prisma.ts              the one shared PrismaClient
      logger.ts              winston setup

    routes/
      user.routes.ts         paths mapped to controllers
      submission.routes.ts

    controllers/
      user.controller.ts     request in, response out. No database calls, no rules.
      submission.controller.ts
      review.controller.ts

    services/
      user.service.ts        the rules, permissions and transactions
      submission.service.ts
      review.service.ts
      ranking.service.ts     Feature 01 scoring, pure maths, no database
      ranking.service.test.ts

    repositories/
      user.repository.ts     the only files allowed to call prisma
      submission.repository.ts
      review.repository.ts

    models/
      user.schema.ts         zod schemas. The only place a validation rule is written.
      submission.schema.ts
      review.schema.ts

    middlewares/
      auth.middleware.ts     works out who is calling, from the Clerk token
      error.middleware.ts    turns any thrown error into a JSON response
      morgan.middleware.ts   logs every request
      rateLimiter.middleware.ts

    errors/
      appError.ts            AppError and its children

    utils/
      catchAsync.ts          wraps an async handler so thrown errors reach the error middleware
```

### The import rules

Layers only ever call downwards. Break these and the point of the layering is lost.

| A file in | May import from | May never import |
| --- | --- | --- |
| `routes/` | `controllers/`, `middlewares/` | services, repositories, prisma |
| `controllers/` | `services/`, `models/`, `errors/`, `utils/` | repositories, prisma |
| `services/` | `repositories/`, `errors/`, other services | prisma directly, express types, `req`, `res` |
| `repositories/` | `config/prisma.ts` | services, controllers, express |
| `models/` | nothing but zod | everything else |

**The single rule to remember: `req` and `res` never leave the controller, and `prisma` never
leaves the repository.**

---

## 4. One request, all the way through

The clearest example is writing a review, because it touches every layer and every rule.

**`POST /api/submissions/:id/reviews`**

1. **`routes/submission.routes.ts`** sees the path and hands it to the review controller, after
   the auth middleware has worked out who is calling.

2. **`middlewares/auth.middleware.ts`** reads the Clerk token, finds our own `User` row by
   `clerkId`, and attaches it to the request. No token means 401 and the journey stops here.

3. **`controllers/review.controller.ts`** takes the body, runs it through
   `models/review.schema.ts`, and if it does not fit, throws `BadRequestError`. It then calls
   `reviewService.createReview(...)` with plain values. It does not know what a database is.

4. **`services/review.service.ts`** does the thinking, in this order:
   - Does the submission exist? If not, `NotFoundError`.
   - Is the caller the author? If so, `ForbiddenError`. You cannot review your own work.
   - Has the caller already reviewed it? If so, `ConflictError`.
   - Do the ratings cover exactly this submission's criteria, no more, no fewer?
   - Is every score a whole number from 1 to 10?
   - Then it calls the repository to write everything inside one transaction.

5. **`repositories/review.repository.ts`** runs the one Prisma transaction that creates the
   review, creates one rating per criterion, and adds 2 to the reviewer's karma. All three
   succeed or none of them do.

6. Back up the chain. The controller sends `201` with the created review and the new karma total.

7. If anything threw along the way, `middlewares/error.middleware.ts` catches it and turns it
   into `{ "error": { "code", "message" } }` with the right status.

**Why the rules live in the service and not the controller.** Because "you cannot review your own
submission" is a rule about our platform, not a rule about HTTP. If we ever added a second way to
create a review, the rule would still apply, and it would still be in one place.

---

## 5. Errors

One hierarchy, thrown from anywhere, caught in one place.

```
AppError                 base. Has a status code and a machine readable code.
  BadRequestError        400, the body failed validation
  UnauthorizedError      401, no valid token
  ForbiddenError         403, signed in but not allowed
  NotFoundError          404
  ConflictError          409, for example a duplicate review
```

Any layer may `throw new ForbiddenError(...)`. Nobody writes `res.status(403).json(...)` by hand
except the error middleware.

Async route handlers are wrapped in `catchAsync`, because an error thrown inside an async function
does not reach Express on its own. Without the wrapper the request hangs forever and the client
sees nothing.

---

## 6. Front end structure

Follows the same structure taught in the front end integration class.

```
frontend/src/
  app/
    layout.tsx                   ClerkProvider, header, fonts
    page.tsx                     the feed
    submissions/new/page.tsx     post a request
    submissions/[id]/page.tsx    one request, its reviews, the review form
    profile/[username]/page.tsx  public profile
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx

  components/
    ui/                          shadcn components. Do not hand edit without a reason.
    SubmissionCard.tsx           our own components
    ReviewCard.tsx

  constants/
    constants.ts                 API_URL and anything else configured once

  api/
    api.ts                       one fetch wrapper. Adds the base URL and the Clerk token,
                                 handles try and catch, unwraps our error shape.

  services/
    submission.service.ts        getAllSubmissions, getSubmission, createSubmission
    review.service.ts            createReview
    user.service.ts              getProfile, syncUser, updateMe

  store/
    userStore.ts                 zustand: who is signed in, their karma
    submissionStore.ts           zustand: the feed and its filters

  proxy.ts                       route protection with createRouteMatcher
```

**The same idea as the back end.** A page never calls `fetch` directly. It calls a service. The
service calls `api.ts`. If the API address changes, one file changes.

`api.ts` uses the native `fetch`, not Axios. Nothing here needs a library.

### Colours and fonts

`frontend/src/app/globals.css` and nowhere else. Shadcn wrote the whole theme there as CSS
variables. Change `--primary` once and every button changes.

**Never write a hex code inside a component.** If a colour is missing, add a variable.

---

## 7. Naming

| Thing | Style | Example |
| --- | --- | --- |
| Back end files | `name.layer.ts` | `review.service.ts`, `auth.middleware.ts` |
| Front end services | `name.service.ts` | `submission.service.ts` |
| Components | PascalCase | `SubmissionCard.tsx` |
| Prisma models | Singular | `Review`, not `Reviews` |
| API paths | Plural | `/submissions`, `/users` |
| Booleans | Read as a question | `isAuthor`, `hasReviewed` |
| Zustand stores | camelCase ending in Store | `userStore.ts` |

---

## 8. What we deliberately do not build

Worth knowing so nobody adds them by accident, and so we can answer if asked why.

| Not building | Why |
| --- | --- |
| Comments and threaded replies | Not in the SRS. A review already carries written feedback. |
| File uploads to object storage | Nothing in the SRS needs a stored file. Submissions link to GitHub. |
| Upvotes, likes, trending | Not in the SRS. Karma is the only score and it comes from reviewing. |
| Karma for posting | The SRS says +2 per review, full stop. |
| Admin, moderation, deleting, editing others' content | The SRS explicitly has none of these. |
| Notifications | The SRS explicitly excludes real time notifications. |
