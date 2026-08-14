# CodeCritic team guide

Everything the four of us need, in one file. Read it once end to end before you touch anything.

Last updated 2026-08-12, after the first build session.

---

## Contents

1. [What we are building](#1-what-we-are-building)
2. [Are we following the SRS](#2-are-we-following-the-srs)
3. [What already exists](#3-what-already-exists)
4. [The database, and every decision behind it](#4-the-database-and-every-decision-behind-it)
5. [The API contract](#5-the-api-contract)
6. [What actually happens when someone clicks a button](#6-what-actually-happens-when-someone-clicks-a-button)
7. [Getting set up, from nothing](#7-getting-set-up-from-nothing)
8. [How we work on GitHub](#8-how-we-work-on-github)
9. [How we all write code the same way](#9-how-we-all-write-code-the-same-way)
10. [Who does what](#10-who-does-what)
11. [The plan to finish](#11-the-plan-to-finish)
12. [How this gets onto the internet](#12-how-this-gets-onto-the-internet)
13. [What every one of us must be able to explain](#13-what-every-one-of-us-must-be-able-to-explain)

---

## 1. What we are building

A website where developers post their code and ask other developers to critique it.

The plain version: imagine a noticeboard where people pin up their drawings and write underneath
"please tell me if the colours work and if the dog looks like a dog". Other people pin notes
back. Every note you write earns you a gold star.

Our drawings are GitHub repositories. Our gold stars are called **Karma**.

**The four things a person can do:**

1. Sign up, and fill in a profile: username, tech stack, bio, GitHub link
2. Post a review request: title, description, repo link, tags, and 1 to 5 things they want scored
3. Review someone else's request: what was done well, what needs improving, optional links, and a
   score out of 10 for each thing that person asked about
4. Browse the feed and read anyone's profile, without needing an account

Writing a review earns exactly **+2 Karma**. Nothing else changes it and it never goes down.

**What does not exist, and must not be built:** no admin, no moderator, no deleting, no editing
other people's things, no reporting, no notifications, no messaging. If you find yourself
building one of those, stop.

---

## 2. Are we following the SRS

Yes, with three places where we made a decision the SRS deliberately left to us. Those three are
the ones we will be questioned on.

| SRS requirement | What we are doing |
| --- | --- |
| Front end: Next.js, Tailwind, Shadcn/UI, Zustand | All four installed and running |
| Auth: Clerk | Installed on both halves, sign in works |
| Back end: Node + Express | Running |
| ORM: Prisma | Running |
| Database: SQL relational | PostgreSQL on Neon |
| Deployment: Vercel plus hosted back end and database | Vercel, Render, Neon. Section 12. |
| One shared repository | This one, front end and back end together |
| Public feed readable logged out | Our auth middleware identifies people without blocking anyone |
| Posting and reviewing require login | Enforced in the API, not just the UI |
| Karma fixed at +2 per review | Hard coded, no weighting |
| A user cannot edit another user's content | There is no route that can even be aimed at someone else. Section 5. |
| All input validated on the back end | Every rule listed in `docs/api-design.md`, enforced in Express |
| Karma cannot be obtained without a genuine review | Database constraint plus a single transaction. Section 4. |
| Responsive on mobile, tablet, desktop | Tailwind, and we test all three before submitting |
| All members contribute visibly | Branch per person, pull requests, reviews. Section 8. |
| Design documents produced before implementation | `docs/database-design.md` and `docs/api-design.md`, written and committed before the code |

### The three decisions the SRS left to us

**1. The SRS lists Karma as an entity. We made it a column, not a table.**

The SRS's own description of Karma is "a point total attached to each user". A total attached to
a user is a column. A separate table would hold one row per award, and since Karma is always +2
and never removed, every row would duplicate a `Review` row that already exists. If anyone ever
wants the history, counting a user's reviews and multiplying by two rebuilds it exactly.

**2. The SRS lists Pending and Reviewed as statuses. We do not store them.**

A submission with zero reviews is Pending. One with any reviews is Reviewed. We work it out by
counting. A stored status is a second copy of a fact the `Review` table already holds, and two
copies can disagree. A derived value cannot disagree with itself.

The SRS explicitly says the group decides how these are surfaced and must justify it. This is our
justification.

**3. We added a table the SRS does not name: Rating.**

The SRS requires "a rating for each criterion". That number has to live somewhere. It cannot be
columns on `Review`, because the criteria are invented per submission so the column names are not
known in advance. `Rating` holds one score, linked to one review and one criterion.

---

## 3. What already exists

State as of 2026-08-12. Everything here is built, tested and on `main`.

**Database.** PostgreSQL 17 on Neon, hosted in Singapore. All five tables, created by a migration
file that lives in the repo so anyone can rebuild the identical database.

**Demo data.** `backend/prisma/seed.ts`, run with `npm run seed`. Five users with deliberately
different tech stacks, **twenty five submissions** with overlapping tags and ages from two hours
to two weeks, and nineteen reviews with a rating for every criterion. Karma is counted from the
reviews rather than typed in.

Three things about the data are deliberate and worth knowing:

- **Several submissions have no reviews**, so the Feature 01 needs-help boost has something to
  lift.
- **There are more than twenty submissions**, which is the page size, so the pager is reachable
  on the real feed. With ten it had nothing to do and could not be demonstrated or checked.
- **A few are tagged in lower case**, because the post form lets people type any tag and both
  spellings genuinely occur. The tag filter and the sidebar counts treat "Node" and "node" as one
  technology, and the seed data is what proves it rather than a claim in a document.

`npm run seed` **deletes every row first**, including any account created through the real sign up
form, so it is a development and pre-demo command rather than something to run casually.

**Back end.** Express with TypeScript on port 4000, with:

- CORS, so the site on port 3000 is allowed to call it
- JSON body parsing
- Clerk middleware that identifies the caller without blocking anyone, so the public feed still
  works logged out
- One error handler, so every failure comes back as `{ "error": { "code", "message" } }` rather
  than an HTML stack trace
- A startup check that refuses to run and names any missing environment variable

**Endpoints built so far:**

| Endpoint | State |
| --- | --- |
| `GET /api/health` | Done |
| `GET /api/submissions` | Done. Ranked for signed in users, newest first for visitors. |
| `POST /api/users/sync` | Done. Creates or updates our User row from the Clerk identity. |
| `PATCH /api/users/me` | Done. Edits your own profile only. |
| `GET /api/users/:username` | Done. Public profile with insights and the two review lists. Feature 02. |
| `GET /api/users/me` | Done. Your own row, for the navigation bar. |
| `GET /api/submissions/:id` | Done. One request in full, with criteria, reviews and ratings. |
| `POST /api/submissions/:id/reviews` | Done. Writes the review, its ratings and +2 Karma in one transaction. |
| `POST /api/submissions` | Done. All five validation rules server side. |

**Front end.** Next.js 16 with TypeScript, Tailwind 4, Shadcn/UI and Zustand, on port 3000. Clerk
is wired in through `ClerkProvider` and `src/proxy.ts`, and the header has working sign in, sign
up and account menu.

**Documents.** `database-design.md`, `api-design.md`, `er-diagram.svg` and this guide.

### What does not exist yet

Updated 2026-08-14, after the first release to production.

**Everything in the SRS is built, merged and live.** All six endpoints, all seven pages,
and both features. `main` and `develop` are level, and the deployed site runs the same
commit.

| Was missing | Now |
| --- | --- |
| `POST /submissions` and the post form | Done, Aaysha, PR #8 |
| `GET /submissions/:id`, `POST /submissions/:id/reviews`, the detail page and review form | Done, Andrew, PR #4 |
| `GET /users/:username`, insights and the profile page | Done, Aqeel, PR #3 and #6 |
| The ranked feed, search, filters and paging | Done, Osini, PR #5 and #7 |
| Our own sign in and sign up pages | Done, Osini, PR #10 |
| The first release of `develop` into `main` | Done, PR #11 |

Left over, and none of it blocks anything:

| Item | Owner | Note |
| --- | --- | --- |
| A Postman collection | anyone, optional | `docs/test-plan.md` already carries every command with real output |
| A CI pipeline | anyone, optional | Nothing in the SRS asks for it, and there are few pull requests left to protect |
| Individual walkthrough practice | **everyone** | The largest remaining risk, and the only one that is not code |

The SQL dump that used to be listed here was dropped on purpose. Osini decided against
it: the database is hosted on Neon and the seed script rebuilds the demo data from
nothing, so a dump would be a third copy of the same thing.

**Nobody is blocked.** Every one of those can be started right now against what already exists.

---

## 4. The database, and every decision behind it

Five tables. Everything on the site is one of these.

![CodeCritic entity relationship diagram](er-diagram.svg)

The same diagram written as text, which is easier to edit, is in `database-design.md`. If you
change the schema, change both.

### How to read that diagram

Each box is a table. The teal bar is its name, the rows underneath are its columns.

| Label | Meaning |
| --- | --- |
| PK | Primary key. The column that uniquely identifies a row. |
| FK | Foreign key. A column holding the id of a row in another table. This is how tables connect. |
| unique | No two rows may share this value. Two people cannot have the same username. |
| text array | A column holding a list, for example `["React", "Next.js"]` |

Every line between two boxes is a relationship, and the ends tell you how many:

- A plain end marked **1** means exactly one row.
- The branching end, called a crow's foot, marked **many**, means any number of rows including
  none.

So the top left line reads: one User posts many Submissions. A brand new user has posted nothing,
and that is still "many", because many includes zero.

The one exception is Submission to Criterion, marked **1 to 5**. Every submission must have at
least one criterion and at most five. That limit is enforced in the API rather than the database,
because a row count limit is not something SQL expresses cleanly. It is listed in section 5 with
the other validation rules.

The dashed yellow box is not a table. It is a reminder of the two rules the database itself
enforces, explained just below.

### Why PostgreSQL and not MySQL

`tags` on a Submission and `techStack` on a User are arrays of text. Prisma supports array columns
on PostgreSQL and not on MySQL. On MySQL we would need a `Tag` table plus two join tables, so
three extra tables, more queries, and more for four people to explain individually.

PostgreSQL keeps our design at five tables. That is the reason, and it is a good one to give.

### The two constraints that do the real work

```
@@unique([submissionId, reviewerId])   on Review
@@unique([reviewId, criterionId])      on Rating
```

The first is how we stop Karma farming. Our API checks whether you have already reviewed a
submission, but a check in code has a gap: if two requests arrive in the same millisecond, both
can pass the check before either has saved. The database has no such gap. It rejects the second
one no matter what.

The second means one score per criterion per review, no duplicates.

Both exist in the live database right now. You can prove it in the Neon SQL Editor:

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'Review';
```

### Why ids are random strings and not 1, 2, 3

We use `cuid()`, which produces a random unique string. Sequential numbers leak information:
anyone can see you have 47 users, and can guess that submission 12 exists and go looking at it.

### Why we store our own id as well as the Clerk id

`clerkId` links a row to Clerk. Every foreign key in the system points at our own `id`. If
authentication ever changed, one column would need attention instead of every table.

---

## 5. The API contract

Full detail with request bodies, response shapes and every error code is in
`docs/api-design.md`. This is the summary.

Base URL locally is `http://localhost:4000/api`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/submissions` | Optional | The feed. Ranked when signed in, newest first when not. **This is Feature 01.** |
| GET | `/submissions/:id` | Optional | One request in full, with criteria, reviews and ratings |
| POST | `/submissions` | Required | Post a review request |
| POST | `/submissions/:id/reviews` | Required | Write a review and earn +2 Karma |
| GET | `/users/:username` | Optional | Public profile with insights. **This is Feature 02.** |
| POST | `/users/sync` | Required | Create or update our User row from the Clerk identity |
| PATCH | `/users/me` | Required | Edit your own profile |

### Three rules that apply to every endpoint

**Identity comes from the token, never from the body.** If a request body contains `authorId` or
`reviewerId` or `karma`, we ignore it. Otherwise anyone could post as anyone or hand themselves
points.

**Every error has the same shape**, so the front end only has to understand one thing:

```json
{ "error": { "code": "SELF_REVIEW_FORBIDDEN", "message": "You cannot review your own submission." } }
```

**There is no `PATCH /users/:id`.** The profile edit route is `/users/me` and has no id in it at
all, so there is no way to aim it at somebody else's row. That is the simplest possible answer to
the SRS rule that a user must not be able to edit another user's profile.

### The validation rules that carry marks

Mentors will call our API directly, outside our website. A check that lives only in a React form
is worth nothing. Every one of these lives in Express:

- Cannot review your own submission
- One review per person per submission
- Every criterion on the submission must get a score, no missing, no extra
- Every score is a whole number from 1 to 10
- Between 1 and 5 criteria per submission
- Title, description and repo URL not empty, repo URL a valid URL, at least one tag
- The review, its ratings and the +2 Karma are written in **one transaction**, so all three
  happen or none of them do

That last one is what makes the Karma total trustworthy. There is no path that produces Karma
without a stored review, and no path that stores a review without the Karma.

---

## 6. What actually happens when someone clicks a button

Worth understanding once, because every feature works the same way.

Say Aaysha submits a review.

1. **Her browser.** She fills the form on a Next.js page. React holds what she typed.
2. **Clerk.** The page asks Clerk for a signed token that proves she is her.
3. **The request.** The browser sends `POST /api/submissions/abc123/reviews` to our Express
   server, carrying the text, the scores, and that token in an `Authorization` header.
4. **Express checks everything.** Is the token real. Is she the author of this submission, which
   would be forbidden. Has she reviewed it before. Does every criterion have a score between 1
   and 10.
5. **Prisma writes.** Inside one transaction: create the Review, create every Rating, add 2 to
   her karma.
6. **PostgreSQL.** The rows are now permanent, in Singapore.
7. **Back to the screen.** Express answers with the created review and her new Karma total.
   Zustand updates the number in the navigation bar without reloading the page.

**Two ports, two programs.** The site runs on 3000, the API on 4000. They are separate programs
that talk over HTTP. That is why CORS exists: browsers block a page on one port from calling
another unless the server explicitly allows it.

**Where the ranking runs.** On the server, inside `GET /submissions`. Never in the browser. Two
reasons to give: the client cannot be trusted to sort honestly, and the database already holds
every value the formula needs.

---

## 7. Getting set up, from nothing

For Aqeel, Andrew and Aaysha. Roughly 20 minutes, most of it waiting for npm.

### Before you start

- **Node 22 or newer.** Check with `node --version`. If it is older, update it, nothing will work.
- **Git.** Check with `git --version`.
- Accept the GitHub organisation invitation if you have not.
- Ask Osini for two things, sent privately, never in the repo:
  - the `DATABASE_URL` for the back end
  - the two Clerk keys for the front end

### Step 1: clone the repository

```
git clone https://github.com/CodeCritic-StemLink/codecritic.git
cd codecritic
```

### Step 2: set up the back end

```
cd backend
npm install
```

Create a file called `.env` inside `backend` containing three lines:

```
DATABASE_URL="the value Osini sent you"
CLERK_SECRET_KEY=the sk_test_ key Osini sent
CLERK_PUBLISHABLE_KEY=the pk_test_ key Osini sent
```

Keep the quotes on `DATABASE_URL`, because a password can contain characters that
would otherwise be read as the start of a comment. The Clerk keys need no quotes.

Note the back end keys have **no** `NEXT_PUBLIC_` prefix. That prefix is a Next.js
thing meaning "send this to the browser", and nothing here goes to a browser.

That file is ignored by git and must never be committed. The server refuses to start
if any of the three is missing, and tells you which.

Then:

```
npx prisma generate
```

**Do not skip that.** Prisma 7 writes the database client into `src/generated/prisma`, which is
not committed, so nothing compiles until you generate it on your own machine. Run it again any
time `prisma/schema.prisma` changes.

Start it:

```
npm run dev
```

Check http://localhost:4000/api/health in a browser. You should see:

```json
{"ok":true,"service":"codecritic-api"}
```

### Step 3: set up the front end

Open a **second** terminal, because the first one is now busy running the API.

```
cd frontend
npm install
```

Create a file called `.env.local` inside `frontend` containing:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=the pk_test_ key Osini sent
CLERK_SECRET_KEY=the sk_test_ key Osini sent
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

No quotes needed. No spaces around the equals signs.

**Anything named `NEXT_PUBLIC_` is sent to the browser and any visitor can read it.** That is
correct for the publishable key, which only identifies our Clerk application. Never put that
prefix in front of a secret.

Then:

```
npm run dev
```

Open http://localhost:3000. You should see a header saying CodeCritic with Sign in and Sign up
buttons. Click Sign up and make yourself an account to check it works.

### Every day after that

Two terminals, every time:

| Terminal | Folder | Command |
| --- | --- | --- |
| 1 | `backend` | `npm run dev` |
| 2 | `frontend` | `npm run dev` |

And before you start any work, always:

```
git checkout main
git pull
```

### Useful commands

| Command | Where | What it does |
| --- | --- | --- |
| `npx prisma studio` | `backend` | Opens a browser view of the database where you can read and edit rows |
| `npx prisma generate` | `backend` | Rebuilds the database client. Run after any schema change. |
| `npx prisma migrate dev` | `backend` | Applies new migrations to your database |
| `npx tsc --noEmit` | either | Checks for TypeScript errors without building. Run before every pull request. |

### If something breaks

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Cannot find module './generated/prisma/client'` | You skipped generate | `npx prisma generate` in `backend` |
| `DATABASE_URL is missing` | No `.env`, or wrong folder | Create `backend/.env`, check you are in `backend` |
| Site loads but data never arrives | The API is not running | Start the second terminal |
| `Port 4000 is already in use` | An old server is still running | Close the other terminal, or restart |
| Clerk errors about a publishable key | `.env.local` missing or misspelt | Check the file name is exactly `.env.local`, inside `frontend` |
| A hydration error mentioning odd attributes | A browser extension edited the page | Not our bug. Try an incognito window. |

---

## 8. How we work on GitHub

Four people editing one repository. These rules exist so we never lose work and never block each
other.

### Two permanent branches, and nobody pushes to either

Since 2026-08-13, merging to `main` puts code in front of the public within two minutes. So `main`
is no longer where we work.

| Branch | What it is | Who merges into it |
| --- | --- | --- |
| `main` | **Production.** Exactly what the public and our mentors see. | Only `develop`, and only when the group agrees |
| `develop` | **Where everything comes together.** Not public. | Everyone's feature branches |
| `yourname/thing` | Your own work | Nobody. It gets merged into `develop`. |

**Nobody ever pushes directly to `main` or `develop`.** Both only ever change through a pull
request.

### Why the extra branch

Without it, the moment anyone merges, the public site changes. One broken merge and the link we
submitted is broken, possibly while a mentor is looking at it.

With it, four people can merge into `develop` all day and the public site does not move until we
decide together that it is worth showing.

`develop` is the rehearsal room. `main` is the stage.


### Branch naming

```
yourname/what-you-are-doing
```

Examples:

- `andrew/review-endpoint`
- `aqeel/seed-script`
- `aaysha/submission-form`
- `osini/ranking-engine`

Your name first means anyone can see at a glance who owns what is in flight. Keep the second part
short and in lowercase with hyphens.

### The loop, every single time

**Start from `develop`, never from `main`:**

```
git checkout develop
git pull
git checkout -b yourname/what-you-are-doing
```

Do the work. Then:

```
git add .
git commit -m "feat: add the review endpoint with full validation"
git push -u origin yourname/what-you-are-doing
```

Then open a pull request. **Check the base branch says `develop`, not `main`.** GitHub should
default to it, but look every single time.

In GitHub Desktop: **Current branch**, switch to `develop`, **Fetch origin**, then **New branch**,
do the work, write a summary, **Commit**, **Publish branch**, **Create Pull Request**.

### Releasing to the public site

When the group agrees `develop` is in good shape:

1. Open a pull request from `develop` into `main`
2. Everyone looks at it. This is the one that changes the live site.
3. Merge. Render and Vercel deploy on their own within two minutes.
4. Open https://codecritic-jade.vercel.app and check it actually works

Do this at least once a day, so `main` never falls far behind. A release carrying two days of
changes is a release nobody can review properly.

### If your branch falls behind

Somebody merged into `develop` while you were working. Bring their changes into your branch before
opening the pull request:

```
git checkout develop
git pull
git checkout yourname/what-you-are-doing
git merge develop
```

If git reports a conflict, open the file. Both versions are marked inside it. Keep what belongs,
delete the markers, then `git add` that file and `git commit`.

**Never use `git push --force` on this project.** It rewrites history and can delete work somebody
else has already pulled. If something looks broken enough that force pushing seems like the answer,
stop and ask in the group chat.


### Commit messages

We use **Conventional Commits**. Every message starts with a type, a colon, then what the commit
does. The type tells a reader at a glance what kind of change it is, without opening the diff.

| Type | Use it when |
| --- | --- |
| `feat:` | You built something new that a user can see or use |
| `fix:` | You fixed a bug |
| `chore:` | Setup, config, dependencies. Not application code. |
| `style:` | Only formatting or CSS changed. Nothing behaves differently. |
| `refactor:` | You rewrote code but nothing looks different to a user |
| `docs:` | README, design documents, comments |
| `test:` | You added or changed tests |

You can add a scope in brackets when it helps say which area changed.

Real examples from this project:

```
feat: add the seed script with demo users and submissions
feat(reviews): block self reviews and duplicate reviews
feat(feed): rank submissions by the user's tech stack
fix: feed showing reviewed submissions as pending
chore: install express, prisma and clerk
docs: add the team guide and ER diagram
refactor: move the ranking maths into its own module
style: tidy the spacing on the submission card
```

Two rules on top of the type:

**Write it in the imperative**, as though completing the sentence "this commit will". So
`feat: add the review endpoint`, not `added the review endpoint` or `adding review endpoint`.

**The title is enough for small changes.** Add a description underneath when the why is not
obvious from the title, especially when you made a decision someone might question later.

**Commit small and commit often.** Our assessors look at the history to see that all four of us
actually contributed. One giant commit at 3am on the last day looks exactly like what it is.

### Reviewing someone else's pull request

Do not just click approve. Spend five minutes and check:

1. Does it do what the description says
2. Does the back end validate anything it accepts from a user
3. Are there any secrets, keys or passwords in the diff
4. Would you be able to explain this code if a mentor asked you about it tomorrow

That fourth one matters most. **We are each examined on the whole system, including parts we did
not write.** Reviewing pull requests is how you learn the parts you did not build. If you approve
something you do not understand, you are choosing to fail that question later.

If you do not understand a line, comment and ask. That is not rude, it is the point.

### When two people edit the same file

Git will complain about a conflict. Do not panic and do not delete anything. Pull `main` into
your branch, open the file, and you will see both versions marked. Keep what belongs, remove the
markers, commit. If it looks bad, ask in the group chat rather than guessing.

The best fix is prevention: we split the work by feature, in section 10, so this should be rare.

---

## 9. How we all write code the same way

**The full structure lives in [architecture.md](architecture.md). Read that before writing any
file.** This section is the short version.

### The shape of the back end

A request passes through four hands, and each file has exactly one reason to change:

```
routes/         says which controller handles this path
controllers/    unpacks the request, validates it, calls a service, sends the response
services/       the rules, the permissions, the transactions
repositories/   the only code in the project that calls prisma
```

Plus `models/` for zod schemas, `middlewares/`, `errors/`, `config/` and `utils/`.

**The one rule to remember: `req` and `res` never leave the controller, and `prisma` never leaves
the repository.**

This is the structure taught in the programme's back end classes, so our code reads the way our
mentors expect it to.

### The shape of the front end

```
app/           pages
components/    ours, plus components/ui for shadcn
constants/     API_URL and anything configured once
api/           one fetch wrapper. Adds the base URL and the Clerk token.
services/      getAllSubmissions, createReview, and so on
store/         zustand
```

A page never calls `fetch` directly. It calls a service, and the service calls `api.ts`.

### Validation

**Every rule in `docs/api-design.md` must exist as a zod schema in `backend/src/models/`.** Not
scattered across if statements inside a route.

Zod belongs on the **back end**, because that is where the SRS puts it: "All input must be
validated on the back end, not only in the UI. Mentors will test API endpoints directly, outside
your front end." Front end checks are for being nice to the user. Back end checks are the actual
wall.

Zod also strips fields it does not know about, which is why a body containing `"karma": 9999`
loses it before any of our code runs.

### Errors

One hierarchy, thrown from any layer, caught in one place:

```
AppError
  BadRequestError    400
  UnauthorizedError  401
  ForbiddenError     403
  NotFoundError      404
  ConflictError      409
```

Nobody writes `res.status(403).json(...)` by hand except `error.middleware.ts`.

Wrap every async controller in `catchAsync`. Express 4 does not understand promises, so without
it a thrown error never reaches the error middleware and the request hangs forever with the
client seeing nothing.

### Colours, fonts and radius live in exactly one file

`frontend/src/app/globals.css`. Shadcn wrote the whole theme there as CSS variables. Change
`--primary` once and every button changes.

**Never write a hex code inside a component.** If a colour is missing, add a variable.

### Naming

| Thing | Style | Example |
| --- | --- | --- |
| Back end files | `name.layer.ts` | `review.service.ts`, `auth.middleware.ts` |
| Components | PascalCase | `SubmissionCard.tsx` |
| Prisma models | Singular | `Review`, not `Reviews` |
| API paths | Plural | `/submissions` |
| Booleans | Read as a question | `isAuthor`, `hasReviewed` |

### Testing

**Tests live in `backend/tests/`, in a folder that mirrors `src`.** A test for
`src/services/ranking.service.ts` goes in `tests/services/ranking.service.test.ts`.

Two reasons: `src` stays the shipped application and nothing else, and the build physically cannot
include a test file because they are outside the folder it compiles.

Run them with `npm test`, from `backend`. We use Jest, because that is what the programme
teaches. `jest.config.js` points it at `tests/`. Jest runs test files through `@swc/jest`, not
`ts-jest`: this project is on TypeScript 7, which does not expose the Compiler API `ts-jest`
needs, and swc strips types without type-checking, which is fine because `npm run typecheck`
already covers that separately.

Run `npm run typecheck` before opening a pull request. It checks both `src` and `tests`.

The tests must keep running with no `DATABASE_URL` set. That is what makes them runnable
anywhere, including a fresh clone or CI, without a live database. Every test file is pure logic
with no Prisma import, the same reason `ranking.service.ts` and `insights.service.ts` stand alone
from their repositories.

Not everything gets an automated test. What each person does:

- **Automated unit tests** for pure logic with no database in it. Right now that is the ranking
  (Feature 01) and the profile insight counting (Feature 02).
- **Manual API tests** for everything else, written into `docs/test-plan.md` with the exact
  command, the expected result and the real result.
- **A shared Postman collection**, so mentors testing our API directly have something to import.

---

## 10. Who does what

### The principle: one feature each, top to bottom

**Nobody owns "the back end" or "the front end".** Each of us owns one complete feature: its
endpoint, its page, and its tests.

Three reasons this is the right split:

1. **Everyone touches every layer.** You cannot be the person who only did React and cannot
   explain a database query, which is exactly what the individual walkthrough catches.
2. **Features do not depend on each other**, so nobody waits. Aqeel's profile page does not need
   Andrew's review endpoint to exist.
3. **At assessment you can walk one whole flow**, from a button, through the API, into the
   database and back, and you genuinely built all of it.

On day four each of us teaches our slice to the other three. That is how we cover the parts we
did not write.

### The four slices

**Osini: the feed and Feature 01**

| Layer | Work |
| --- | --- |
| Back end | `src/lib/ranking.ts`, and `GET /submissions` with search, tag and status filters |
| Front end | The feed page, the submission card component, and the "why this order" view |
| Tests | Automated tests for the ranking maths, plus proof the order changes per user |

**Aaysha: posting a request**

| Layer | Work |
| --- | --- |
| Back end | `POST /submissions`, with all five validation rules |
| Front end | `/submissions/new`, with criteria you can add and remove between 1 and 5. |
| Tests | Empty title rejected, six criteria rejected, bad repo URL rejected, no tags rejected, no token rejected |

**Andrew: reviewing**

| Layer | Work |
| --- | --- |
| Back end | `GET /submissions/:id`, and `POST /submissions/:id/reviews` with the Karma transaction |
| Front end | The submission detail page and the review form with a score control per criterion |
| Tests | Self review 403, duplicate review 409, score of 11 rejected, missing criterion rejected, and Karma unchanged after every failure |

**Aqeel: profiles and reputation**

| Layer | Work |
| --- | --- |
| Back end | `GET /users/:username` with the insights, which is Feature 02 |
| Front end | `/profile/[username]`, showing stack, bio, GitHub link, Karma, both counts and the insights |
| Tests | Counts correct against the seed data, and reviews received proven different from reviews given |

### The shared foundation, already built

These exist on `main` and belong to nobody in particular. If you need to change one, say so in
the group chat first, because all four of us depend on them.

- `backend/src/lib/prisma.ts`, `auth.ts`, `errors.ts`
- `backend/prisma/seed.ts`
- `backend/src/index.ts`, the middleware chain
- `POST /users/sync` and `PATCH /users/me`
- `frontend/src/app/layout.tsx` and `src/proxy.ts`

One piece is still missing and everybody needs it: **`frontend/src/lib/api/client.ts`**, the shared
fetch wrapper that adds the base URL and the Clerk token. Aaysha builds it first thing, pushes it
on its own small pull request, and then nobody touches it again.

### How we avoid editing the same lines

| File | Rule |
| --- | --- |
| `backend/src/routes/user.routes.ts` | Osini owns sync and me. Aqeel's `GET /:username` is added, Feature 02, done. |
| `frontend/src/lib/api/` | One file per resource. Never put two people's calls in one file. |
| `frontend/src/app/globals.css` | Theme changes only, and say so in the chat first. Everyone renders through it. |
| `backend/prisma/schema.prisma` | Schema changes go through the group. A migration nobody expected breaks three machines. |

---

## 11. The plan to finish

Deadline is around 2026-08-15.

### 12 August: everything works locally

Start here when you wake up. Nothing in this list is waiting on anything else.

| Who | First thing to do | Done means by tonight |
| --- | --- | --- |
| Aaysha | `frontend/src/lib/api/client.ts`, pushed on its own small PR because everyone needs it | Client done, then `POST /submissions` working, then the post form rendering |
| Andrew | `GET /submissions/:id` | Both endpoints working, the Karma transaction correct, tested with curl |
| Aqeel | `GET /users/:username` | Profile returns Karma, both counts and the insights, every figure counted from real rows |
| Osini | `backend/src/lib/ranking.ts` | Feed visibly reordered per user, with the score breakdown available |

Aaysha's API client is the one thing several people want early, so it goes first and gets its own
pull request within the first hour.

### 13 August: everything is connected

| Who | Done means |
| --- | --- |
| Andrew | Every endpoint attack tested against the list in section 13 |
| Aqeel | Profile queries explainable out loud, insights correct |
| Osini | Feature 01 finished with a "why this order" view, ready to present separately |
| Aaysha | All five pages working end to end, responsive on mobile, tablet and desktop |

### 14 August: deployed and rehearsed

Deploy all three parts, walk the whole site on the real URL, and every one of us explains the
entire system out loud to the other three. Not the part you wrote. The whole thing.

### 15 August: submit

Deployed link, repository link, design documents. Everyone submits from their own cohort.

---

## 12. How this gets onto the internet

**Done. The site is live.**

| What | Link |
| --- | --- |
| The site, and the only link we submit | https://codecritic-jade.vercel.app |
| The API | https://codecritic-api.onrender.com |

Front end on Vercel, API on Render in Singapore, database on Neon in Singapore. Both hosts watch
`main` and deploy on their own when something is merged.

**Full detail is in [deployment.md](deployment.md):** why we chose each service, every setting,
the environment variables, how CORS works and why the feed worked before we configured it, the
keepalive robot that stops the API sleeping, and a troubleshooting table.

Two things everyone should know:

- **Merging to `main` puts code in front of the public within two minutes.** That is why `main` is
  protected by the branch flow in section 8.
- **Every pull request gets its own preview site** from Vercel, linked in a comment on the pull
  request. Open that link to review someone's work instead of pulling their branch.

---

## 13. What every one of us must be able to explain

We are each examined individually on the **whole** system, including the parts we did not write.
Code you cannot explain or change on the spot earns nothing.

Practice answering these out loud. If you cannot, go and read that part of the code.

**About the data**

- Why five tables, and what each one holds
- Why Karma is a column and not a table
- Why Pending and Reviewed are not stored anywhere
- Why `Rating` exists when the SRS never mentions it
- Why PostgreSQL and not MySQL

**About trust and safety**

- How we stop someone reviewing their own submission
- How we stop someone reviewing the same submission twice, and why the database constraint matters
  more than the code check
- How we stop someone awarding themselves Karma by putting it in a request body
- What a transaction is and why the review, the ratings and the Karma are inside one
- Why a check in a React form is worth nothing

**About Feature 01, the flagship**

Full answers to all of these are in [feature-01-ranking.md](feature-01-ranking.md).

- The formula, and what each part contributes
- **How age becomes points.** It is not a clock or a cut off: a new post gets 10 and every 48
  hours whatever is left is halved
- Why tag matching is weighted highest, and what breaks if it is worth 5 instead of 12
- Why a post with no reviews gets a boost, and what problem that solves
- Why a post you have already reviewed loses points instead of being hidden
- **Why it sorts rather than filters.** Every submission is in every feed. Saying "we filter by
  tech stack" describes a design the SRS did not ask for
- Why the whole set is ranked before the page is cut out of it
- Why it runs on the server and not in the browser
- What happens to a post that matches every tag but is a year old
- What alternatives we considered and why we rejected them, including one the SRS itself suggested

**About Feature 02, the profiles**

Full answers are in [feature-02-profiles.md](feature-02-profiles.md).

- The difference between reviews given and reviews received, and why getting them the same way
  round is the trap the SRS warns about
- Why Karma always equals reviews given times two, and what it would mean if it did not
- Where "technologies you review in" comes from, and why it is not your own tech stack
- Why the average score is null rather than zero for somebody who has never rated
- Why you can edit your own profile but nobody can edit yours

**About the architecture**

- What Clerk does and what it does not do
- Why a Clerk account and a row in our `User` table are two different things
- What Prisma is, and what `prisma generate` produces
- Why the front end and back end run on different ports, and what CORS is for
- What happens between clicking submit and the row appearing in the database

### Before we submit, we run these attacks on our own API

Every one of them, by hand, and we keep the results:

1. `POST /submissions` with no token, expect 401
2. `POST /submissions` with an empty title, expect 400
3. `POST /submissions` with 6 criteria, expect 400
4. Review your own submission, expect 403
5. Review the same submission twice, expect 409 on the second
6. Send a score of 11, expect 400
7. Send a review missing one criterion, expect 400
8. Send `"karma": 9999` in a body and confirm it is ignored
9. After every failed attempt above, confirm the reviewer's Karma has not moved
