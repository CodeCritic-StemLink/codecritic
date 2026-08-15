# Feature 02: reviewer reputation and profile insights

The optional feature, which this group built anyway. Written 2026-08-14.

Every figure below is from the live database, so the numbers in this document are the
numbers on the site.

---

## 1. What it is for

Before you trust somebody's feedback, you want to know who they are.

A public page at `/profile/:username` answers three questions:

```
   WHO ARE THEY?          HOW MUCH HAVE THEY DONE?      WHAT ARE THEY GOOD AT?
   ─────────────          ───────────────────────       ──────────────────────
   username               Karma                         technologies they
   bio                    reviews given                   review in most
   tech stack             reviews received              average score they give
   GitHub link            requests posted               activity by month
```

The page is four bands, widest thing first:

```
   ┌──────────────────────────────────────────────────────────┐
   │  avatar, name, bio, technologies      [Edit]  3 stats    │  who they are
   ├────────────────┬────────────────┬────────────────────────┤
   │ reviews in     │ average score  │ reviews by month       │  the insights
   ├────────────────┴────────────────┴────────────────────────┤
   │  requests posted, up to four across                      │  what they asked
   ├───────────────────────────┬──────────────────────────────┤
   │  reviews written          │  reviews received            │  what they did
   └───────────────────────────┴──────────────────────────────┘
```

It was one narrow column with a rail beside it, which meant a very tall page where you
scrolled past everything to reach the reviews, and an empty stripe down both sides of a
wide monitor. Each band lays out in as many columns as there is room for and collapses
to one on a phone.

**Reviews written and reviews received sit side by side deliberately.** They are the
pair the SRS warns is easy to get the wrong way round, and next to each other the
difference is visible rather than something you have to remember while scrolling.

Anyone can view it, signed in or not, because the SRS requires profiles to be public.

---

## 2. What the SRS demanded, and what we did

| Requirement | What we built |
| --- | --- |
| Public page at `/profile/:username` | Yes, readable logged out |
| Tech stack, bio, GitHub link, Karma | All four, Karma in its own colour |
| Counts of reviews given and received | Both, **and the full lists**, not just numbers |
| **Meaningful insight beyond raw counts** | **Three:** technologies reviewed in, average score given, activity by month |
| Clear navigation back to the feed | "Back to the feed" at the top, and every submission links through |
| Explain how each figure is calculated | This document, section 4 |

We went past the requirement in one place: the SRS asks for *counts* of reviews given
and received. We show the **full text of every review** as well, because the SRS
elsewhere says a user must be able to *manage* their activity, and a number is not
something you can read.

---

## 2b. Editing your own profile

**The SRS rule is that you may not edit *another* user's profile.** It says nothing
against editing your own, and it does require a user to manage their own activity, so
editing your own is expected rather than merely allowed.

An **Edit profile** button sits at the top right of your own profile header. It opens
`/profile/setup`, which doubles as the edit form: it loads what you already have, fills
the fields in, and changes its wording to "Edit your profile" and "Save changes".

That form existed from the first day and **nothing linked to it**, so in practice nobody
could add a technology or fix their bio after sign up. The button is the whole fix.

### The form will not save what it could not first read

This is worth being able to explain, because it was a real bug and the fix is a good
answer to "how do you stop a partial failure corrupting data".

`POST /users/sync` writes **every** column it is given, which is right for the first
save when there is no row yet. The form used it for edits too, and it treated **any**
failure to read the existing profile as "this person has no profile yet".

Two things then went wrong together:

```
Clerk hands back getToken before it has a session, and it returns null
      ↓
the loader gave up silently and never ran again
      ↓
blank form, headed "Finish your profile", for somebody who had one
      ↓
saving wrote those blanks over a real bio and tech stack
```

From the outside it looked exactly like the site had forgotten the profile. **It had
not.** The row was intact right up until the save flattened it.

Three changes fix it:

| Change | Why |
| --- | --- |
| Wait for Clerk's `isLoaded` before asking | The loader no longer gives up on a token that is merely not ready yet |
| **"could not read" is its own state**, not "no profile" | Only `USER_NOT_FOUND` means there is nothing stored. A server that is down means we do not know |
| Edits go through `PATCH /users/me` | A partial update. A field left out is left alone, so it cannot null anything |

When the state is "could not read", the form is **disabled** and says so, with a retry
button. It is not possible to type into it, let alone save it.

The decision itself lives in `frontend/src/lib/profileLoad.ts` with **11 tests**, rather
than in a catch block inside the page, because it is the exact line the bug lived on.

### Why nobody can edit somebody else's

This is a likely question, and the answer is better than "we check permissions".

```
POST /users/sync
   body:  { username, bio, techStack, githubUrl }
   token: proves you are Clerk user_2abc...

   the row updated is chosen by the TOKEN, never by anything in the body
```

**There is no user id in the request body at all.** You cannot name a victim, because
there is nowhere to put their name. Sending `clerkId` or `id` anyway achieves nothing:
zod strips fields the schema does not declare, exactly as it does with `karma`.

So the attack is not blocked, it is **impossible to express**. Hiding the Edit button on
somebody else's profile is politeness, not security.

### What editing cannot touch

`karma`, every submission and every review are untouched by the upsert. Saving the form
again does not reset your points or lose your posts, and the page says so.

### Technologies are free text

The setup form offers eleven suggestions and a box to type anything else. **The
suggestions are shortcuts, not a list of what exists.**

They had to become shortcuts. The post form has always allowed any tag, so a fixed list
here meant somebody could post a Vue request that no reader could ever match, because no
reader could say they knew Vue. That gap damaged Feature 01 directly.

Up to **20 technologies**, which is the ceiling `models/user.schema.ts` enforces. The
API never had a fixed list; only the form did.

---

## 3. A real profile, with real numbers

`aqeel_codes`, straight from the live API:

```
  Karma              8
  reviews given      4
  reviews received   2

  Reviews most often in        Average score given
  ─────────────────────        ───────────────────
  Node          2                     6.3 / 10
  PostgreSQL    1
  Next.js       1              Activity
  TypeScript    1              ────────
  Python        1              2026-08   4 reviews
```

---

## 4. How every figure is calculated

This is the section to know. Expect "prove this number is right".

### Karma: `8`

**Not calculated.** It is a column on the `User` row.

It only ever changes inside the review transaction, `+2` at a time, and never goes
down. That is why `karma` is not in any request schema: zod strips it from a body
before our code runs, so nobody can award themselves points.

**The check anyone can do:** karma should always equal reviews given times two.

```
aqeel_codes    8 = 4 × 2   ✓
osini_dev      6 = 3 × 2   ✓
andrew_builds  4 = 2 × 2   ✓
maya_dev       6 = 3 × 2   ✓
```

If that ever failed, a review had been stored without its Karma or the other way round.
It holds because both happen inside one `prisma.$transaction`.

### Reviews given: `4`

Reviews where **this person is the reviewer**.

```sql
SELECT * FROM "Review" WHERE "reviewerId" = <them>
```

### Reviews received: `2`

**This is the trap, and the SRS calls it out.**

Reviews received is **not** reviews where this person is the reviewer. It is reviews
written **on submissions this person authored**, by other people.

```
   REVIEWS GIVEN                      REVIEWS RECEIVED
   ─────────────                      ────────────────
   me ──writes──► someone's post      someone ──writes──► my post

   Review.reviewerId = me             Review.submission.authorId = me
```

Two different relations, queried two different ways. Getting them the same way round
would make both numbers identical, which is exactly the bug the SRS is warning about.

```sql
SELECT * FROM "Review"
JOIN "Submission" ON "Review"."submissionId" = "Submission".id
WHERE "Submission"."authorId" = <them>
```

**How to prove it by hand:** `andrew_builds` gives 2 and receives 5. He wrote two
reviews. He authored three submissions which between them collected 0 + 3 + 2 = 5
reviews. Different numbers, counted different ways.

### Technologies reviewed in: `Node 2, PostgreSQL 1, ...`

For every review this person wrote, take the **tags of the submission they reviewed**,
and count each tag.

```
   a review ──► the submission it was on ──► that submission's tags ──► count them
```

`aqeel_codes` reviewed four submissions, tagged:

```
  bookstore-api      Node, Express, Prisma
  django-blog        Python, Django
  nextjs-migration   Next.js, TypeScript
  slow-query         PostgreSQL, Node
```

Node appears twice, everything else once. That is exactly what the profile shows.

**Why this is a meaningful insight and not a raw count:** it is the difference between
what somebody *claims* to know, in their tech stack, and what they *actually review*.
Those are often not the same.

Ties break alphabetically, so the list never shuffles between page loads for no reason.

**Spellings are grouped.** Tags are typed by hand on the post form, so a profile listed
"Node 2" and "node 1" as two technologies. `insights.service.ts` imports `normaliseTag`
from the ranking rather than writing its own comparison, so a profile, the feed's tag
rail and the ranking itself cannot disagree about whether two tags are the same thing.
The spelling shown is whichever was used most.

### Average score given: `6.3`

Every rating across every review this person wrote, added up and divided.

`aqeel_codes` gave nine ratings across four reviews: 8, 6, 7, 5, 7, 6, 7, 7, 4.

```
  57 ÷ 9 = 6.333...  rounded to one decimal = 6.3
```

**Note it is per rating, not per review.** A review of a submission with three criteria
contributes three numbers, not one. Averaging per review would let a one criterion
submission count as much as a three criterion one.

**Null, not zero, when somebody has never rated anything.** Zero would read as "this
person scores everybody 0", which is a lie about the data. There is a test for it.

### Activity by month: `2026-08  4`

Each review's `createdAt`, cut to `YYYY-MM`, counted.

Grouped by calendar month regardless of the day, sorted oldest first so the chart reads
left to right like time does.

---

## 5. Why the queries are correct

Expect "why are your queries right?".

**Three queries, run at the same time.**

```ts
const [reviewsGiven, reviewsReceived, submissions] = await Promise.all([...]);
```

`Promise.all` because none of them depends on the others. Run one after another they
would take three round trips to Singapore instead of one.

**Every insight comes from one of those three results, in memory.** There is no fourth
query for the tag counts, no fifth for the average. The counting is a pure function,
`buildInsights`, that takes the rows already fetched.

**Why that matters:** the numbers cannot disagree with each other. If the tag counts
came from their own query, run a moment later, a review written in between would make
"reviews given" say 4 while the tags described 5.

**Who is reading the page is asked once.** The navbar needs the viewer for the karma
chip and this page needs it to decide whether to draw an Edit button. Both used to call
`GET /users/me` themselves, and the navbar renders on every route, so that was two round
trips for the same row on every navigation. `services/viewer.ts` wraps it in React's
`cache`, which deduplicates within one render pass and holds nothing between requests,
so karma is still correct the instant a review is written.

The profile and the viewer are also fetched **together** rather than one after the other,
since neither depends on the other.

**Why the counting is a separate file.** `insights.service.ts` imports nothing that
touches a database, so it is directly testable:

```
backend/tests/services/insights.service.test.ts
```

Those tests check the counting against numbers worked out by hand, including the
57 ÷ 9 = 6.3 above.

---

## 6. What we considered and rejected

| Alternative | Why not |
| --- | --- |
| **A Karma table, one row per award** | Karma only ever moves by +2 per review, so the Review table already is that log. A second table could disagree with the first. |
| **Storing a "status" on each submission** | Pending versus reviewed is just "does it have reviews", derived by counting. Stored, it could go stale. |
| **Average score received** rather than given | It measures how kindly other people rated you, which says more about them than you. |
| **A percentage helpfulness rating** | There is no signal for it. We do not store whether a review was useful, so any percentage would be invented. |
| **Reviews per week rather than per month** | Too noisy on a site four days old. Months read better and still show a trend. |

---

## 7. Honest limitations

**Every figure is lifetime, not recent.** Somebody who reviewed heavily in August and
stopped looks identical to somebody still active. The monthly chart is the only hint.

**Karma measures volume, not quality.** Twenty short reviews earn more than five careful
ones. The SRS fixes Karma at +2 per review with no weighting, so this is the spec's
choice, not an oversight, but it is worth saying rather than pretending Karma means
"good reviewer".

**The average score can be gamed.** Someone who rates everything 10 has a high average
and it means nothing. It is shown as information, not as a judgement.

**The lists page four at a time.** Requests posted, reviews written and reviews received
each have their own pager, each keeping its place in the query string under its own key,
so turning to page two of one does not send the other two back to page one. The API
still returns every row and the paging happens in the page, which is fine at this size
and would become a server side limit and offset on a busy site.

---

## 8. How we would make it better

**Show the average score *received* beside the one given.** Together they say something
neither says alone: a reviewer who scores harshly but is scored well themselves.

**Mark a first review on a submission differently.** Being the first person to answer a
post nobody had touched is worth more than being the fifth, and it is the same idea as
the needs-help boost in Feature 01. The data is already there.

**A sparkline instead of the month list.** Same numbers, read at a glance.

**Link the technology counts into the feed.** Clicking "Node 2" could open
`/?tag=Node`, tying the two features together. The filter already exists; it is one
link.

---

## 9. Questions to have answers ready for

**How is Karma calculated?** It is not. It is a column, changed only inside the review
transaction, +2 at a time. Check it: karma equals reviews given times two, for every
user.

**Can somebody give themselves Karma?** No. It is not in any request schema, so zod
strips it from the body before our code runs. There is a test asserting that.

**What is the difference between reviews given and received?** Given is where you are
the reviewer. Received is reviews on submissions you authored, written by other people.
Two different relations. Getting them the same way round is the trap the SRS warns
about.

**Where does "technologies reviewed in" come from?** The tags of the submissions you
reviewed, counted. Not your own tech stack, which is what you claim; this is what you
actually do.

**Why is the average 6.3 and not 6.33?** Rounded to one decimal so the page never shows
a long float. The underlying figure is 57 ÷ 9.

**Why null and not zero for somebody who has never rated?** Zero would read as "scores
everybody zero". Null lets the page say "no scores given yet" instead of lying.

**Why is status not stored on the submission?** Pending versus reviewed is derived by
counting reviews. A stored flag could go stale; a derived one cannot.

**Can a user edit their profile after signing up?** Yes. Edit profile at the top right
of your own profile page. The SRS forbids editing *another* user's profile, not your
own.

**What happens if the API is down when you open the edit form?** The form loads
disabled, says it could not read your profile, and offers a retry. It will not save.
Sending a blank form through a write that touches every column is how a profile gets
wiped, so the form refuses to save anything it could not first read.

**Why does editing use PATCH and first-time setup use POST?** POST /users/sync creates
the row and writes every column, which is right when there is nothing to lose. PATCH
/users/me only touches the fields it is sent, which is what an edit should do.

**How do you stop somebody editing another user's profile?** There is no user id in the
body of `POST /users/sync`. The row updated is whichever one the caller's own token
resolves to, so there is nothing to forge. Anything extra sent in the body is stripped by
zod before our code sees it.

**Why can people type their own technologies?** Because the post form has always allowed
any tag. A fixed list on the profile meant a Vue request could never match anybody, which
broke Feature 01 for every technology outside our eleven suggestions.
