# CodeCritic

A peer code review platform. Developers submit their projects for review, receive structured
feedback from other developers, review other people's work in return, and earn Karma points for
contributing.

Built as an MVP for the **Software Engineering Professionals Program**.

| | |
| --- | --- |
| Version | MVP: public feed, authenticated submit and review workflow, Karma based contribution system |
| Platform | Developer focused peer code review social platform |
| Live site | Not deployed yet |

> **New to this project? Read [docs/team-guide.md](docs/team-guide.md) first.** It covers setup
> from nothing, how we use branches and pull requests, who owns what, and the plan to the
> deadline.

---

## Table of contents

1. [What the platform does](#what-the-platform-does)
2. [Technical stack](#technical-stack)
3. [System roles](#system-roles)
4. [Core entities](#core-entities)
5. [Submission workflow](#submission-workflow)
6. [Review workflow](#review-workflow)
7. [Review request status](#review-request-status)
8. [Constraints and assumptions](#constraints-and-assumptions)
9. [Challenge features](#challenge-features)
10. [Repository structure](#repository-structure)
11. [Team](#team)
12. [Submission deliverables](#submission-deliverables)

---

## What the platform does

A developer posts a link to a project they want feedback on, describes the feedback they are
looking for, and defines the specific criteria they want reviewers to score. Other developers
open that request, write structured feedback, and give a rating out of 10 against each criterion.
Writing a review earns the reviewer **+2 Karma**, a running total that represents how much they
have contributed to the community.

The home feed is public and readable without an account. Posting a request and writing a review
both require signing in.

---

## Technical stack

| Layer | Technology |
| --- | --- |
| Front end | Next.js, Tailwind CSS, Shadcn/UI, Zustand |
| Authentication | Clerk |
| Back end | Node.js + Express |
| ORM | Prisma |
| Database | SQL (relational) |
| Deployment | Vercel for the front end, plus a hosted back end and database |
| Repository | This single repository holds both the front end and the back end |

---

## System roles

There is **no admin or moderator role** in this MVP. Every authenticated user has the same
capabilities.

### Visitor (logged out)

- Browses all review requests on the public home feed, most recent first
- Searches and filters review requests
- Opens any individual review request to view its full details
- Views any user's public profile

### Authenticated user (Clerk login)

A single authenticated role that acts as **both submitter and reviewer**, depending on context.

- Signs up and logs in through Clerk, then completes a profile: username, tech stack, bio,
  GitHub link
- Posts review requests for their own projects, defining custom review criteria
- Reviews other users' requests: written feedback, optional resources, and a rating for each
  criterion
- Earns Karma points for each review submitted
- Views a personalised, reordered home feed
- Manages their own activity: requests posted, reviews given, and reviews received

---

## Core entities

| Entity | Description |
| --- | --- |
| **User** | An authenticated person (via Clerk) with a profile, a tech stack, and a Karma point total. |
| **Submission (Review Request)** | A request for review posted by a user. Includes a title, description, GitHub URL, technology tags, and a set of custom review criteria. |
| **Review** | Feedback submitted by one user on another user's submission. Includes strengths, improvements, optional resources, and a rating per criterion. |
| **Review Criteria** | A set of 1 to 5 criteria, defined by the submitter on each submission, that reviewers must rate. For example "Code Quality" or "API Design". |
| **Karma** | A point total attached to each user, representing their contribution level. Increases by a fixed amount per review submitted. |

---

## Submission workflow

1. A logged in user chooses to post a review request.
2. They provide a project title, a description of the feedback they want, a GitHub repository
   URL, and one or more technology tags.
3. They define **custom review criteria**, between 1 and 5, that reviewers will rate.
4. The request is published to the public feed and becomes browsable and searchable by everyone.
5. The submitter can later view all reviews received under each of their requests.

---

## Review workflow

1. A logged in user opens a review request posted by **another** user.
2. They choose to start a review.
3. They provide written feedback on what was done well and what needs improvement, optionally
   adding resource links.
4. They give a numeric rating out of 10 for **each** criterion the submitter defined on that
   request.
5. On submission, the reviewer earns **+2 Karma points**.
6. The review becomes visible to the submitter, and the reviewer's updated Karma appears on
   their profile and in their navigation.

---

## Review request status

| Status | Description | Updated by |
| --- | --- | --- |
| **Pending** | The request has been posted but has received no reviews yet. | System |
| **Reviewed** | The request has received one or more reviews. | System |

This MVP has **no rejection, deletion, or moderation workflow**. A request, once posted, stays on
the platform. Karma, once earned, is not removed.

---

## Constraints and assumptions

- Authentication is handled entirely through Clerk. The back end associates each Clerk identity
  with a user record in our own database.
- The public feed is visible without authentication. Posting and reviewing require login.
- The front end is responsive across mobile, tablet, and desktop.
- Karma is fixed at **+2 per review**. Static, with no weighting or dynamic scoring.
- A user must not be able to edit another user's profile or content.
- **All input is validated on the back end, not only in the UI.** Mentors will test API
  endpoints directly, outside the front end.
- Karma must not be obtainable without a genuine review.
- The front end and the back end live in this one shared repository.
- All group members contribute visibly through the repository: commits, branches, pull requests.
- There is no real time notification system in this MVP.

---

## Challenge features

### Feature 01: Personalised recommendation feed (mandatory)

The flagship group deliverable.

Logged out visitors see all submissions most recent first. Logged in users see the **same
submissions, intelligently reordered** so that the most relevant requests surface first.

- The feed is reordered for a logged in user so that requests matching that user's own tech stack
  appear ahead of those that do not.
- The engine goes beyond simple tag matching with at least one ranking improvement of our own
  design.
- The reordering is demonstrable with real data: the feed order visibly changes based on who is
  logged in.
- The engine is presented separately, covering how it works, why it was designed that way, what
  alternatives were considered, and a live demonstration.

### Feature 02: Reviewer reputation and profile insights (optional)

Extends user profiles into a richer view that helps users judge a reviewer's contribution and
credibility before trusting their feedback.

- A public profile page at `/profile/:username` displaying tech stack, bio, GitHub link, total
  Karma, and counts of reviews given and reviews received.
- At least one meaningful insight beyond raw counts, derived correctly from real data in the
  database. For example the technologies a user most often reviews in, or a breakdown of their
  review activity over time.
- Clear navigation back to the feed.

---

## Repository structure

```
codecritic/
  backend/     Express API, TypeScript, Prisma schema, seed script
  frontend/    Next.js app, TypeScript, Tailwind, Shadcn, Zustand, Clerk
  docs/        database/ER design and API design documents
  README.md
```

---

## Getting started

You need Node 22 or newer. Check with `node --version`.

### The back end

From the repository root:

```
cd backend
npm install
```

Create a file called `.env` inside `backend` containing:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The PostgreSQL connection string from Neon. Ask Osini. |

Environment files are ignored by git and are never committed, so ask a team member for the
values rather than looking for them in the repository.

```
npx prisma generate
```

**Do not skip that command.** Prisma 7 writes the database client into `src/generated/prisma`,
which is not committed, so nothing compiles until you generate it on your own machine. Run it
again any time `prisma/schema.prisma` changes.

If the database is empty on your machine, create the tables:

```
npx prisma migrate dev
```

Then start it:

```
npm run dev
```

The API runs at http://localhost:4000/api. Check it is alive at
http://localhost:4000/api/health, which should return `{"ok":true,"service":"codecritic-api"}`.

Useful extras:

| Command | What it does |
| --- | --- |
| `npx prisma studio` | Opens a browser view of the database where you can read and edit rows |
| `npm run build` | Compiles TypeScript into `dist` |
| `npm start` | Runs the compiled JavaScript, which is what the live server does |

### The front end

From the repository root:

```
cd frontend
npm install
```

Create a file called `.env.local` inside `frontend` containing:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From the Clerk dashboard, Configure then API Keys. Starts with `pk_test_`. |
| `CLERK_SECRET_KEY` | Same page. Starts with `sk_test_`. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` |

Anything named `NEXT_PUBLIC_` is sent to the browser and is readable by any visitor. Never put
that prefix in front of a secret.

Then start it:

```
npm run dev
```

The site runs at http://localhost:3000. The back end must be running as well, or the pages will
have no data to show.

---

## Team

| Name | GitHub |
| --- | --- |
| Osini Navoda | |
| Aqeel Ameer | |
| Andrew Sachin | |
| Aaysha Muzammil | |

Every member participates in an individual walkthrough during final assessment, and must be able
to explain, justify, and modify **any** part of the system, including parts they did not
personally write.

---

## Submission deliverables

- The deployed project link. Every team member submits it separately from their own cohort.
- This single repository, containing both the front end and the back end.
- The design documents (database/ER design and API design), produced before implementation and
  refined as we build. They live in `docs/`.
