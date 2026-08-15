# CodeCritic

A peer code review platform. You post a link to something you have built, say what you
want looked at, and other developers write structured feedback and score it against
criteria you chose yourself. Writing a review earns you Karma.

The feed is public and readable without an account. Posting a request and writing a
review both require signing in.

| | |
| --- | --- |
| Front end | Next.js, TypeScript, Tailwind CSS, Shadcn/UI |
| Authentication | Clerk |
| Back end | Node.js, Express, TypeScript |
| Database | PostgreSQL through Prisma |
| Hosting | Vercel for the front end, a hosted API and database behind it |

> Design documents live in [`docs/`](docs/). Start with
> [docs/README.md](docs/README.md).

---

## Contents

1. [What the platform does](#what-the-platform-does)
2. [Roles](#roles)
3. [The five tables](#the-five-tables)
4. [Posting a request](#posting-a-request)
5. [Writing a review](#writing-a-review)
6. [Rules the API enforces](#rules-the-api-enforces)
7. [The two features](#the-two-features)
8. [Repository layout](#repository-layout)
9. [Running it locally](#running-it-locally)

---

## What the platform does

Somebody posts a link to a project, describes the feedback they are after, and defines
the criteria they want scored. Other developers open that request, write what was done
well and what needs improving, and give a mark out of 10 against every criterion the
poster chose.

Writing a review earns **+2 Karma**, a running total showing how much somebody has put
back in.

---

## Roles

There is **no admin and no moderator**. Every signed in user has the same abilities.

**Visitor, signed out**

- Reads the feed, newest first
- Searches and filters by technology or by whether a request has been answered
- Opens any request in full
- Reads any public profile

**Signed in user**

The same person is both submitter and reviewer, depending on which page they are on.

- Completes a profile: username, technologies, bio, GitHub link
- Posts requests with criteria of their own choosing
- Reviews other people's requests
- Earns Karma per review
- Sees the feed reordered around the technologies on their profile
- Manages their own activity: requests posted, reviews written, reviews received

---

## The five tables

| Table | Holds one | Related to |
| --- | --- | --- |
| **User** | A person: username, bio, technologies, GitHub link, Karma | Has many Submissions and many Reviews written |
| **Submission** | A review request: title, description, repo link, tags | Belongs to a User. Has 1 to 5 Criteria and many Reviews |
| **Criterion** | One thing to be scored, invented by whoever posted | Belongs to a Submission. Gets one Rating per Review |
| **Review** | One person's feedback: strengths, improvements, links | Belongs to a Submission and to the User who wrote it |
| **Rating** | A single score out of 10 | Belongs to a Review and a Criterion |

Two decisions worth knowing up front:

**Karma is a column on User, not a table.** It only ever moves by +2, only inside the
transaction that writes a review, and never downward. The Review table already is the
log, so a second one could only disagree with it.

**Status is not stored.** Pending and reviewed are derived by counting a submission's
reviews. A stored flag can go stale; a count cannot disagree with itself.

Full reasoning in [docs/database-design.md](docs/database-design.md), with the diagram
in [docs/er-diagram.svg](docs/er-diagram.svg).

---

## Posting a request

1. Give a title, a description of the feedback you want, and a repository link
2. Add one or more technology tags
3. Define 1 to 5 criteria reviewers will score
4. The request appears on the public feed, searchable by everyone
5. Reviews arrive underneath it

---

## Writing a review

1. Open somebody else's request
2. Write what was done well and what needs improving, with optional resource links
3. Score every criterion out of 10
4. On save you earn **+2 Karma**

The review, its ratings and the Karma are written in **one transaction**. Either all
three happen or none do, which is what makes the Karma total trustworthy: there is no
path that produces points without a stored review, and none that stores a review without
the points.

---

## Rules the API enforces

Every one of these lives in the API, not in a form. A rule written only in React is a
suggestion, because anything can call the API directly and skip the form.

- You cannot review your own submission
- One review per person per submission, backed by a unique constraint in the database
- Every criterion must be scored, and every score is a whole number from 1 to 10
- Between 1 and 5 criteria, and at least one tag, on every submission
- Title, description and a repository link are required
- Links must start with `http://` or `https://`. A GitHub field must be on `github.com`
- Karma cannot be set through any request body
- You cannot edit anybody's profile but your own

Nothing is ever deleted. There is no rejection or moderation anywhere, and Karma once
earned is never removed.

Every rule, with its error code, is in [docs/api-design.md](docs/api-design.md).

---

## The two features

**[The personalised feed](docs/feature-01-ranking.md).** Signed out you get newest
first. Signed in you get the same submissions in a different order, worked out from the
technologies on your profile, how recent each request is, whether anybody has answered
it yet, and whether you already have. The scoring runs on the server, and a toggle on
the feed shows the arithmetic for every card.

**[Profiles and reputation](docs/feature-02-profiles.md).** A public page per user with
Karma, reviews given and received in full, and three figures derived from real review
history: the technologies somebody actually reviews in, the average score they give, and
their activity by month.

---

## Repository layout

```
codecritic/
  backend/     Express API, Prisma schema, seed script, tests
  frontend/    Next.js app, components, tests
  docs/        design documents
  README.md
```

---

## Running it locally

Node 22 or newer. Check with `node --version`.

### Back end

```bash
cd backend && npm install
```

Create `backend/.env`:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The PostgreSQL connection string |

Environment files are ignored by git and never committed.

```bash
npx prisma generate
```

**Do not skip that.** Prisma writes the database client into `src/generated/prisma`,
which is not committed, so nothing compiles until it is generated on your own machine.
Run it again whenever `prisma/schema.prisma` changes.

If your database is empty, create the tables and fill them with demo data:

```bash
npx prisma migrate dev && npm run seed
```

`npm run seed` **wipes every row first**, so never point it at data you care about.

```bash
npm run dev
```

The API runs at http://localhost:4000/api. Check
http://localhost:4000/api/health, which returns `{"ok":true,"service":"codecritic-api"}`.

| Command | What it does |
| --- | --- |
| `npm test` | Runs the test suite |
| `npm run typecheck` | Type checks the app and the tests |
| `npx prisma studio` | A browser view of the database |
| `npm run build` | Compiles TypeScript into `dist` |

### Front end

```bash
cd frontend && npm install
```

Create `frontend/.env.local`:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From the Clerk dashboard, Configure then API Keys. Starts with `pk_test_` |
| `CLERK_SECRET_KEY` | Same page. Starts with `sk_test_` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` |

Anything named `NEXT_PUBLIC_` is sent to the browser and readable by any visitor. Never
put that prefix in front of a secret.

```bash
npm run dev
```

The site runs at http://localhost:3000. The back end has to be running too, or the pages
have no data to show.
