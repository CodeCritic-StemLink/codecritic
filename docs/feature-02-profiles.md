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

**Nothing is paginated.** A user with 500 reviews would render all 500. Fine at this
size, and the same fix as the feed if it ever mattered.

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
