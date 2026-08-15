# Feature 01: the personalised feed

The flagship deliverable, explained from the beginning. Written 2026-08-14.

This document is what we present. It covers what the feature is, how it works, why we
built it this way, what we rejected, and how to demonstrate it live.

---

## 1. The problem in one picture

Everybody sees the same submissions. The order changes.

```
                          THE SAME 11 SUBMISSIONS

   logged out                a React developer          a Node developer
   ───────────               ─────────────────          ────────────────
   1  newest                 1  React dashboard         1  Bookstore API
   2  second newest          2  Tailwind library        2  Booking schema
   3  third newest           3  newest                  3  Slow query
   4  ...                    4  Bookstore API           4  React dashboard
                                    ▲                          ▲
                             their stack first          their stack first
```

Nothing is hidden and nothing is added. **The same rows come back in a different
order.**

Why it matters: a beginner posting their first React question wants a React developer
to see it, not to sit on page three under ten Rust posts.

---

## 2. What the SRS demanded, and what we did

| Requirement | What we built |
| --- | --- |
| Logged out sees newest first | `GET /submissions` with no token sorts by `createdAt` |
| Logged in sees the same set, reordered by tech stack | Tag matching, 12 points per matching tag |
| **At least one improvement of our own** | **Three:** recency decay, a needs-help boost, and an already-reviewed penalty |
| Demonstrable with real data | The "Why this order?" toggle explains every card in words |
| Present the engine separately | This document |

The SRS lists possible improvements: recency weighting, review history, skill-level
matching, weighting certain technologies more heavily. Recency is on their list. **The
needs-help boost is not, and it is the one to present.** We also deliberately rejected
one of their suggestions, weighting certain technologies more heavily, for a reason
given in section 10.

---

## 3. The formula

```
score  =  12 × (number of the post's tags that match your stack)
        + round(10 × 0.5 ^ (hoursOld / 48))
        + 6  if the post has zero reviews
        - 8  if you have already reviewed it
```

Four parts. Read them as four separate questions.

### Part one: relevance, 12 points per matching tag

**Question it answers: can this person actually help?**

A post tagged `React, Next.js` shown to somebody whose stack is `React, Next.js,
Tailwind` matches on two tags, so 24 points.

Matching ignores capitals, so `react` matches `React`. A repeated tag counts once.

### Part two: recency, a half life of 48 hours

**Question it answers: is this still worth answering?**

The rule in one sentence: **a brand new post gets 10 points, and every 48 hours whatever
is left is cut in half.**

```
age        what is left                points
────       ────────────                ──────
0 h        all of it                     10
1 day      10 × 0.71                      7
2 days     10 × 0.5                       5     one halving
3 days     10 × 0.35                      4
4 days     10 × 0.25                      3     two halvings
6 days     10 × 0.125                     1
8 days     10 × 0.0625                    1
10 days    10 × 0.031                     0
a year     nothing worth counting         0
```

The `0.5 ^ (hoursOld / 48)` in the formula is only notation for that sentence:

- `hoursOld / 48` is **how many halvings have happened**. A 96 hour old post: 2.
- `0.5 ^ 2` is 0.25, so **a quarter is left**.
- `× 10` gives 2.5, rounded to 3.

Time itself is measured in one line, in `recencyPoints`:

```ts
const hoursOld = Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
```

`getTime()` returns milliseconds, so this is "now minus posted, divided by the number of
milliseconds in an hour". **The `Math.max(0, ...)` is there for a clock that is wrong**:
a post that looks like it is from the future is treated as brand new rather than scoring
above the maximum.

It never goes below zero. This is a **decay curve, not a cut off**. A cut off means a
post is worth full marks at 47 hours and nothing at 49, and nobody can defend that
boundary. A curve means age always costs a little and nothing ever vanishes suddenly.

### Part three: the needs-help boost, 6 points

**Question it answers: has anybody helped yet?**

A submission with **zero reviews** gets 6 points. One with reviews gets nothing extra.

This is the part we are proudest of, and section 5 explains why.

### Part four: the already-reviewed penalty, minus 8

**Question it answers: is there anything left for me to do here?**

One review per person per submission is a rule the API enforces. So a submission you
have already reviewed is one you can do **nothing more with**. It is dead weight in your
feed, and it loses 8 points.

It **drops rather than disappears**, for two reasons. The SRS asks for the same
submissions reordered, not filtered. And you may well want to find your own review
again.

The card says **"you reviewed this"** underneath, so a post that has quietly moved down
does not look like it moved for no reason.

---

## 4. A worked example, with real numbers

Two posts, seen by a developer whose stack is `React, Next.js, Tailwind`.

**Post A: "Tailwind component library", tagged `React, Tailwind`, 4 days old, 0 reviews**

```
tags      2 matches × 12          = 24
recency   round(10 × 0.5^(96/48)) =  3     (4 days = two half lives)
needs help    zero reviews         =  6
                                    ──
                              total = 33
```

**Post B: "Rust CLI tool", tagged `Rust`, 2 hours old, 3 reviews**

```
tags      0 matches × 12          =  0
recency   round(10 × 0.5^(2/48))  = 10     (basically brand new)
needs help    has reviews          =  0
                                    ──
                              total = 10
```

**Post A wins, 33 to 10**, even though Post B is two hours old and Post A is four days
old.

That is the whole design in one comparison: **relevance beats freshness.** A brand new
post you cannot help with is worth less than an older one you can.

---

## 5. Why the needs-help boost exists

This is the answer to give when asked "what improvement did you design, and why?"

**The problem it solves:** without it, the site quietly becomes unfair.

```
   a post gets reviewed  ->  it looks active  ->  more people see it
          ▲                                              │
          └──────────────────────────────────────────────┘

   a post gets ignored   ->  it looks dead    ->  nobody sees it
          ▲                                              │
          └──────────────────────────────────────────────┘
```

The second loop is the problem. **A beginner's first post, the one that most needs an
answer, is the one least likely to get one.**

Six points is deliberately small. It is enough to lift an unanswered post above an
equally relevant answered one, and **not** enough to beat a genuine extra tag match,
which is worth 12.

We have a test asserting exactly that, so the rule cannot drift:

```
test("the needs-help bonus never outranks a genuine extra tag match")
```

---

## 6. Why the numbers are 12, 10, 6 and 8

Expect to be asked "why 12 and not 5?". **These are not measurements. They are four
sentences about what matters more than what.**

| Statement | Why the numbers make it true |
| --- | --- |
| One matching tag beats any amount of freshness | 12 > 10, the largest recency score |
| An unanswered post beats an equally relevant answered one | 6 > 0 |
| A real extra tag match beats the needs-help boost | 12 > 6 |
| A post you can still act on beats one you cannot | 8 > 0 |
| But relevance survives the penalty | 8 < 12 |

Those sentences **are** the design.

### Why 12 specifically

Because **recency can never exceed 10**. So "should one matching tag beat the freshest
possible post?" becomes "is this number bigger than 10?" We said yes, so it has to be 11
or more, and 12 is the round one.

Watch what breaks at 5:

```
brand new Rust post, you do not know Rust      0 + 10 + 0  = 10
2 day old React post, you do know React        5 +  5 + 0  = 10
```

**A tie.** The React developer's feed fills with Rust. The SRS specifically requires
posts matching your stack to come first, so 5 fails the requirement outright.

### Why 6 specifically

**6 is half of 12: deliberately "half a tag".**

| If it were | What would happen |
| --- | --- |
| 1 or 2 | Almost never changes an order. Decoration, not a feature. |
| **6** | Breaks a tie between two posts you can equally help with. Correct. |
| 12 or more | "Nobody reviewed it" would count as much as "you know this technology", pushing Rust posts at a React developer. |

### Why 8 specifically

Between the two: **bigger than the needs-help boost, smaller than a tag match.** So a
post you have reviewed drops below an unanswered one, but a post you have reviewed in
your own technology still beats one in a technology you have never touched. The penalty
sorts your feed; it does not censor it.

### The honest answer to "why not 20 and 15?"

**Nothing would change.** Double every number and every order is identical. Only the
ratios do any work. That answer is stronger than pretending we measured something.

Each is a named constant, so a mentor asking "what if you tuned this?" can watch it
change in one line:

```ts
export const POINTS_PER_MATCHING_TAG = 12;
export const MAX_RECENCY_POINTS = 10;
export const RECENCY_HALF_LIFE_HOURS = 48;
export const NEEDS_HELP_POINTS = 6;
export const ALREADY_REVIEWED_PENALTY = 8;
```

---

## 7. Where it runs, and why that matters

**On the server, inside `GET /submissions`.** The browser never receives the scoring
code, only the finished order.

```
   browser                    Express API                  Postgres
   ───────                    ───────────                  ────────
   GET /  ──────────────────► read the token
                              who is this?  ─────────────►
                              their techStack  ◄──────────
                              fetch matching submissions ►
                                                ◄─────────  rows
                              score every row
                              sort by score
                              cut out the page
   finished HTML ◄──────────  send
```

Two reasons, and both are proper answers:

**The client cannot be trusted.** Scoring in the browser means anyone can open the
console and change their own ranking. It would not be a security hole here, but it
would stop being *our* ranking.

**The database already has the data.** Sending 500 submissions to the browser so it can
sort them and show 20 wastes the other 480.

---

## 8. The order of operations, and the bug it avoids

This is subtle and worth knowing, because it is the kind of thing a mentor probes.

```
   RIGHT                              WRONG
   ─────                              ─────
   fetch everything matching          fetch page 1 by date
   score all of it                    score those 20
   sort by score                      sort those 20
   cut out page 1                     show them
```

The wrong version returns **a page chosen by date and merely shuffled**. On any feed
longer than one page it would be a lie: the most relevant post on page three would
never reach page one.

Our service ranks the whole matching set and only then slices. There is a comment at
that exact line saying so.

**Yes, it searches all of the posts.** With 1000 submissions, `GET /submissions` loads
all 1000 matching rows, scores all 1000, sorts all 1000, and hands back the 20 you asked
for. That is the point: page one has to be the best 20 out of everything, not the newest
20 shuffled. The honest answer to "what about a million?" is that the scoring would move
into SQL so the database sorts and pages in one query, and that is written down in the
service as a comment rather than pretended away.

---

## 8b. What is not Feature 01

Two things on the feed page look related and are not, and it is worth being clear at
assessment.

| | The tag rail on the left | Feature 01 |
| --- | --- | --- |
| What it does | **Removes** posts | **Reorders** posts |
| Runs where | Front end, `lib/tags.ts` | Back end, `ranking.service.ts` |
| Depends on who you are | No, same for everyone | Yes, that is the whole point |

**Feature 01 filters nothing.** Say this clearly, because "we filter by tech stack" is
the easiest wrong sentence to say about it, and it describes a design the SRS
specifically did not ask for. Every submission is in every feed. A Rust post in a React
developer's feed is still there, further down.

If we hid non-matching posts we would have failed the requirement, and a beginner
posting in an unpopular technology would be invisible to everybody, which is the exact
harm the needs-help boost exists to prevent.

The tag rail counts the technologies of the submissions currently on screen, takes the
top eight, and links each one to `?tag=...`. It is headed **"In these results"** rather
than "Technologies" because that is what it counts. Calling it "Technologies" would
imply totals across the whole site, which would need a counting endpoint the SRS never
asked for.

---

## 9. Proving it works

### The "Why this order?" toggle

Signed in, the feed has a **Why this order?** button. It is **off by default**. Turn it
on and one line appears under each card:

```
 33   +24 React, Tailwind  ·  +3 recent  ·  +6 unanswered
```

It has been through three versions, and the reason is worth telling because it is the
same lesson twice.

| Version | Problem |
| --- | --- |
| `score 33 = tags 24 (React, Tailwind) + fresh 3 + needs help 6` | Correct and unreadable. Nobody outside the group knows what "fresh 3" is. |
| A headed panel with one labelled row per part and a total | Readable, and four times the height of the card it was explaining. |
| **One line, score first, parts as small print** | What is there now. |

A part worth zero is **left out entirely** rather than given a row saying nothing
happened. If every part is zero, which is what an old answered post in a technology you
do not use looks like, it says "nothing matched".

This turns the demo from "trust me, it is sorted" into arithmetic anybody can check on
screen. **Use it in the live demonstration.** It is also just a URL, `/?why=1`, so it
can be linked to.

Nothing is calculated in the browser. `ScoreExplainer.tsx` only puts words to numbers
the server handed it.

### The tests

30 automated tests in `backend/tests/services/ranking.service.test.ts`, covering the
parts a demo cannot show:

- every piece adds up to the total
- one matching tag beats the entire recency range
- an unanswered post outranks an equally matched answered one
- the needs-help boost never beats an extra tag match
- a post you have already reviewed drops below an identical one you have not
- the penalty is smaller than a tag match, so relevance still wins
- the same submissions come back, only reordered, **nothing dropped or added**
- equal scores break the tie on newest first, so the order is never random
- the tag filter and the ranking compare tags the same way

They need no database, because `ranking.service.ts` imports nothing but its own maths.

### The demonstration script

1. Open the feed **logged out**. Point out the order is by date.
2. Sign in as a **front end** account. The order changes; React posts rise.
3. Turn on **Why this order?**. Read one card's arithmetic aloud.
4. Sign in as a **back end** account. Same posts, different order again.
5. Point at an unanswered post that has climbed, and explain the six points.

---

## 10. What we considered and rejected

Expect "what alternatives did you consider?". These are real ones with real reasons.

| Alternative | Why not |
| --- | --- |
| **Hide posts that do not match your stack** | The SRS says the same submissions, reordered. Hiding is a filter, not a ranking, and it would trap a beginner's post where nobody sees it. |
| **Sort in SQL with `ORDER BY`** | The needs-help boost and the decay curve are awkward in SQL, and a pure function is testable with no database. We ranked in the service instead. |
| **Weight some technologies more than others** | Who decides React is worth more than Rust? It would need a table of weights nobody could defend. |
| **Use review history rather than the declared stack** | A better signal in principle, but a brand new user has no history, so their first feed would be unranked. The declared stack works from the first minute. |
| **Machine learning** | No training data, no time, and nothing we could explain in a review call. A formula we can defend beats a model we cannot. |
| **Cut off anything older than a week** | A cliff is worse than a curve. A seven day old post with three matching tags is still useful; decay handles it gracefully. |

---

## 11. Honest limitations

Saying these out loud is stronger than being caught by them.

**A user with no tech stack gets no personalisation.** Their score is recency plus the
needs-help boost, which is still a sensible order but not a personal one. This is why
sign up now forces you to profile setup.

**Tag matching is exact, after trimming and lowercasing.** `React` matches `react` and
` React `, but `ReactJS` and `React.js` do not match `React`. A synonym table would fix
it and would need maintaining by hand.

One rule, one place. `normaliseTag` in `ranking.service.ts` is used by **four** things
that all have to agree about whether two tags are the same technology:

| Where | What it does |
| --- | --- |
| `ranking.service.ts` | Scores a tag match |
| `submission.service.ts` | Filters the feed by `?tag=` |
| `insights.service.ts` | Counts "reviews most often in" on a profile |
| `frontend/lib/tags.ts` | Counts the feed's tag rail |

All four disagreed at one point, and each disagreement looked like a different bug:
`?tag=Node` silently missed lower case posts, the feed rail listed "Node 3" and
"node 1", and a profile did the same. **One rule in one place is why they cannot drift
apart again.**

**Scores are computed on every request.** Fine for a demo, and fine into the thousands.
A very large site would cache them.

**Nothing learns.** The formula treats every user with the same stack identically. It
does not notice that you always review Prisma questions and never React ones.

---

## 12. How we would make it better

Asked "what next?", these are the honest answers, cheapest first.

### 1. Fold in review history

We already store every review and the tags of what was reviewed. `insights.service.ts`
computes "the technologies you review most often" for the profile page today. The same
figures could feed the ranking:

```
score += 4 × (matches with the technologies you actually review in)
```

**Why it is better than the declared stack alone:** what you *say* you know and what
you *actually review* are different. Somebody may list ten technologies and only ever
answer Prisma questions.

**Why it is not in the build:** a new user has no history, so it must be an addition to
tag matching rather than a replacement, and we would want the numbers argued through by
the group rather than picked by one person the night before submission.

### 2. Difficulty matching

The SRS suggests skill-level matching. We have no difficulty field, but Karma is a
rough proxy: a reviewer with 50 Karma could be nudged toward posts nobody else has
managed to answer. **We rejected it for now** because Karma measures how much you
review, not how well, and treating volume as skill would be a claim we cannot support.

### 3. Let a person see why a post did *not* rank

The "Why this order?" toggle explains what is there. The more interesting question is
often what is missing. Showing "this post scored 4 because none of its tags match your
stack" would teach people to fill in their stack properly.

### 4. Cache the scores

Recompute only when a submission is posted or reviewed, rather than on every request.
Nothing needs it yet, and doing it early would trade explainability for speed we do not
lack.

---

## 13. Questions to have answers ready for

**Where does the ranking run?** On the server, in `GET /submissions`. The browser gets
the finished order.

**Why not in the browser?** The client cannot be trusted, and the database already has
the data.

**Why 12 and not 5?** The ratios matter, not the numbers. 12 beats the biggest possible
recency score of 10, and beats the needs-help boost of 6. Those two facts are the
design.

**What happens to a post that matches every tag but is a year old?** It still ranks
high. Recency contributes at most 10, and three matching tags alone is 36. Decay never
goes below zero, so age can dampen but never bury a relevant post.

**What if two posts score the same?** Newest first. There is a test for it, so the
order is never random or dependent on how the database happened to return rows.

**Is anything hidden from a logged in user?** No. Same set, different order. A test
asserts the ranked list contains exactly the same ids as the input.

**What is your own improvement?** Two. Recency decay with a 48 hour half life, and the
six point boost for posts nobody has reviewed. The second is the one with a story: it
breaks the loop where attention only goes to posts that already have attention.
-----------------------------------