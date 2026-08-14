# Test plan

One section per person, covering their own feature. Write the command, run it, paste the real
result. Not what you expect, what actually happened.

This exists for two reasons. It is the evidence we show at assessment that the validation rules
work, and it is how we each learn to attack our own code before a mentor does.

**How to write an entry.** Copy this shape:

```
### What you are testing

Command:

    curl -s http://localhost:4000/api/health

Expected:

    {"ok":true,"service":"codecritic-api"}

Actual:

    {"ok":true,"service":"codecritic-api"}

Pass
```

On Windows Command Prompt, escape the double quotes inside a JSON body with a backslash, like
`-d "{\"title\":\"\"}"`.

---

## Shared, done by Osini

### The server refuses to start without its keys

Command: remove `CLERK_SECRET_KEY` from `backend/.env`, then `npm run dev`

Expected: it exits and names the missing variable rather than starting and failing later

Actual:

```
Cannot start. These environment variables are missing:
  CLERK_SECRET_KEY
  CLERK_PUBLISHABLE_KEY
Add them to backend/.env. Ask Osini for the values.
```

Pass

### An unknown route returns JSON, not an HTML crash page

Command:

```
curl -s http://localhost:4000/api/nonsense
```

Actual:

```
{"error":{"code":"NOT_FOUND","message":"That endpoint does not exist."}}
```

Pass

### Profile endpoints refuse an unauthenticated caller

Command:

```
curl -s -X POST http://localhost:4000/api/users/sync -H "Content-Type: application/json" -d "{\"username\":\"hacker\"}"
```

Actual:

```
{"error":{"code":"UNAUTHENTICATED","message":"You need to be signed in to do this."}}
```

Pass. Note this proves the auth gate. It does not yet prove that a `karma` field in the body is
stripped, because authentication is checked first. That test needs a real token and is still to do.

---

## Osini: the feed and Feature 01

Run against the local API on port 4000 with the seed data loaded, on 2026-08-13.

### The ranking maths, automated

    cd backend
    npx jest tests/services/ranking.service.test.ts

Actual, re-run 2026-08-14 after the already-reviewed penalty was added:

    Test Suites: 1 passed, 1 total
    Tests:       29 passed, 29 total

Those 29 cover the parts a curl command cannot show: that every piece of the score adds
up to the total, that one matching tag beats the entire recency range, that an unreviewed
submission outranks an equally matched reviewed one, that the needs-help bonus never
outranks a genuine extra tag match, that a submission you have already reviewed drops
below an identical one you have not, and that the penalty is still smaller than a tag
match so relevance wins. They need no database, which is why they run anywhere.

Pass

### The tag filter ignores case

Tags are typed by hand on the post form, so "Node" and "node" both really occur in the
data. Before this change `?tag=Node` missed every submission tagged in lower case, and
the sidebar listed "Node 3" and "node 1" as two separate technologies.

Command:

    curl -s "http://localhost:4000/api/submissions?tag=Node&limit=50"
    curl -s "http://localhost:4000/api/submissions?tag=node&limit=50"
    curl -s "http://localhost:4000/api/submissions?tag=NODE&limit=50"

Actual, 2026-08-14:

    ?tag=Node -> 4 results: react/node/reactnative | Node/Express/Prisma | Prisma/Node | PostgreSQL/Node
    ?tag=node -> 4 results: react/node/reactnative | Node/Express/Prisma | Prisma/Node | PostgreSQL/Node
    ?tag=NODE -> 4 results: react/node/reactnative | Node/Express/Prisma | Prisma/Node | PostgreSQL/Node

All three spellings return the same four rows, including the one tagged in lower case.
The sidebar counts them as one technology as well, reading "Node 4".

Pass

### The feed works logged out, newest first

Command:

    curl -s "http://localhost:4000/api/submissions?limit=3"

Actual, trimmed:

    personalised: False | total: 10
      2026-08-11  React dashboard that re-renders way too often
      2026-08-11  Express REST API for a bookstore
      2026-08-11  Migrating a Pages Router app to the App Router

`personalised` is false with no token, which is what the SRS requires of the public
feed, and the order is by date.

Pass

### Filters work, and they combine

Command, four times:

    curl -s "http://localhost:4000/api/submissions?tag=Node"
    curl -s "http://localhost:4000/api/submissions?status=pending"
    curl -s "http://localhost:4000/api/submissions?tag=Node&status=pending"
    curl -s "http://localhost:4000/api/submissions?search=prisma"

Actual, the `total` from each:

    tag=Node                 -> 3
    status=pending           -> 3
    tag=Node&status=pending  -> 1
    search=prisma            -> 1

The third line is the one that matters. Two filters together give fewer results than
either alone, so they narrow the set rather than replacing each other.

Pass

### Paging returns different submissions, not the same ones again

Command:

    curl -s "http://localhost:4000/api/submissions?limit=3&page=1"
    curl -s "http://localhost:4000/api/submissions?limit=3&page=2"
    curl -s "http://localhost:4000/api/submissions?limit=3&page=4"

Actual:

    page 1 -> 3 items (total 10)
    page 2 -> 3 items (total 10)
    page 4 -> 1 items (total 10)

Ten submissions in pages of three gives 3, 3, 3 and then 1, which is what came back.

Worth knowing for the walkthrough: the service ranks the whole matching set and only
then cuts the page out. Slicing first and ranking after would return a page chosen by
date and merely shuffled, which would make Feature 01 wrong on any feed longer than one
page.

Pass

### Rubbish in the query string is rejected

Command:

    curl -s "http://localhost:4000/api/submissions?page=0"
    curl -s "http://localhost:4000/api/submissions?limit=999"
    curl -s "http://localhost:4000/api/submissions?status=banana"
    curl -s "http://localhost:4000/api/submissions?tag="

Actual, all four returning 400:

    ?page=0        -> INVALID_PAGE   | Too small: expected number to be >=1
    ?limit=999     -> INVALID_PAGE   | Too big: expected number to be <=50
    ?status=banana -> INVALID_STATUS | Invalid option: expected one of "pending"|"reviewed"
    ?tag=          -> INVALID_TAGS   | Too small: expected string to have >=1 characters

`limit` is capped at 50 so nobody can ask for the whole database in one request.

**A bug this test found.** Before 2026-08-13 every one of these reported
`INVALID_TAGS`, because the feed controller hardcoded that one code for any query
failure. So `?page=0` blamed the tags. An error code naming the wrong field is worse
than no code, because it sends whoever is debugging to the wrong place. Fixed by mapping
the failed field to its own code in `feedErrorCodes`, the same pattern
`profileErrorCodes` already used.

Pass

### The URL is the state, checked automatically

    cd frontend
    npm test

Actual:

    Test Suites: 2 passed, 2 total
    Tests:       30 passed, 30 total

Every filter on the feed lives in the address bar rather than in React state, which is
what keeps the page a server component and makes a filtered feed a real link. The tests
pin the rules that holds up:

- changing one filter never throws away the others
- `undefined` means leave a filter alone, `null` means clear it
- changing a filter returns you to page one, so you never land on page 5 of a 3 page
  result and see a blank screen
- the "Why this order?" toggle does not reset the page, because it changes no results

**A bug these tests found.** `feedUrl` documented that `undefined` meant "leave this
filter alone", but the code cleared it, because spreading an object copies keys whose
value is `undefined` over the top of real ones. Nothing in the app passed `undefined`
yet, so nothing was visibly broken, but the function promised behaviour it did not have.

Pass

### Pagination

The page size is 20 and there were only 13 submissions, so the pager had nothing to do
and could not be checked. Verified on 2026-08-14 by temporarily setting `FEED_PAGE_SIZE`
to 4 in `frontend/src/constants/constants.ts` and opening `/?page=2`.

Actual:

    Showing 5 to 8 of 13
    Previous   2 / 4   Next

Four submissions on the page, the correct range, and both steps live. `FEED_PAGE_SIZE`
was put back to 20 immediately afterwards. The seed data has since been extended past 20
submissions so the pager is reachable on the real feed without editing anything.

Pass

### Nothing overflows sideways, at any screen size

Measured rather than eyeballed, on 2026-08-14, by loading each page in a frame of a
fixed width and comparing `scrollWidth` with the viewport.

| Page | 375 | 768 | 1280 |
| --- | --- | --- | --- |
| Feed | 0 | 0 | 0 |
| Profile | 0 | n/a | 0 |
| Sign in | n/a | n/a | 0 |
| Sign up | n/a | n/a | 0 |

Zero means no horizontal overflow. Sign in and sign up also had no vertical overflow at
1280 x 800, so neither scrolls.

Pass

### The navigation bar on a phone

Aqeel reported the navbar looking wrong on mobile. Measured by building the signed in
bar at three phone widths and comparing the width it needs with the width it has.

Before:

    320px wide -> needs 437px, overflows by 117px
    375px wide -> needs 437px, overflows by  62px
    414px wide -> needs 437px, overflows by  23px

The karma chip and "Post a request" are both `whitespace-nowrap`, so rather than
wrapping they pushed the avatar off the edge. After dropping the word "CodeCritic" below
`sm`, shortening the karma chip to the number alone, and turning "Post a request" into a
plus icon:

    320px -> needs 320px, overflow 0
    375px -> needs 375px, overflow 0
    414px -> needs 414px, overflow 0

Pass

### Still to do

The two checks that need a signed in user, because they need a real Clerk token:

- a React developer's feed puts React tagged submissions first
- a Node developer's feed puts a different submission first, from the same set
- a submission you have reviewed drops below an identical one you have not

The ranking maths behind all three is covered by the 29 unit tests above. What is not yet
written up is the end to end proof through the API with a token, and the screenshot of
the "Why this order?" breakdown. Do this once the demo accounts are signed in.

---

## Aaysha: posting a request

Tested locally against `http://localhost:4000/api/submissions`. Commands run from PowerShell
using `Invoke-RestMethod`, not `curl`, because Windows PowerShell aliases `curl` to
`Invoke-WebRequest` and mangles quoted JSON bodies. `<TOKEN>` is a fresh Clerk session token,
fetched with `await window.Clerk.session.getToken()` in the browser console and used
immediately, since it expires after about 60 seconds.

### No token

Command:

```powershell
$body = @{ title = "Test"; description = "Test"; repoUrl = "https://github.com/test/test"; tags = @("React"); criteria = @("Code Quality") } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/api/submissions" -Method Post -ContentType "application/json" -Body $body
```

Expected:

    {"error":{"code":"UNAUTHENTICATED","message":"You need to be signed in to do this."}}

Actual:

```json
{"error":{"code":"UNAUTHENTICATED","message":"You need to be signed in to do this."}}
```

Pass

### Empty title

Command:

```powershell
$body = @{ title = ""; description = "Test"; repoUrl = "https://github.com/test/test"; tags = @("React"); criteria = @("Code Quality") } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/api/submissions" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer <TOKEN>" } -Body $body
```

Expected: 400 `INVALID_TITLE`

Actual:

```json
{"error":{"code":"INVALID_TITLE","message":"Title is required."}}
```

Pass

### Six criteria

Command: same shape as above, with `criteria = @("A","B","C","D","E","F")`

Expected: 400 `INVALID_CRITERIA`

Actual:

```json
{"error":{"code":"INVALID_CRITERIA","message":"At most 5 criteria are allowed."}}
```

Pass

### Zero criteria

Command: same shape, with `criteria = @()`

Expected: 400 `INVALID_CRITERIA`

Actual:

```json
{"error":{"code":"INVALID_CRITERIA","message":"At least one criterion is required."}}
```

Pass

### Repo URL that is not a URL

Command: same shape, with `repoUrl = "not-a-url"`

Expected: 400 `INVALID_REPO_URL`

Actual:

```json
{"error":{"code":"INVALID_REPO_URL","message":"That is not a valid URL."}}
```

Pass

### No tags

Command: same shape, with `tags = @()`

Expected: 400 `INVALID_TAGS`

Actual:

```json
{"error":{"code":"INVALID_TAGS","message":"At least one tag is required."}}
```

Pass

### An authorId in the body belonging to someone else

The submission must be created under the signed in caller, not the id sent in the body.

Command:

```powershell
$body = @{
  title = "React dashboard re-renders too often"
  description = "Every keystroke redraws the whole table."
  repoUrl = "https://github.com/test/react-dashboard"
  tags = @("React","Next.js")
  criteria = @("Code Quality","Performance")
  authorId = "someone-elses-fake-id"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/api/submissions" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer <TOKEN>" } -Body $body
```

Expected: 201, and `author.username` is the signed in caller, not `"someone-elses-fake-id"`

Actual, trimmed:

```
id          : cmsryc3p20000r8uraz3y3wjz
title       : React dashboard re-renders too often
author      : @{username=Aaysha_Muzammil; karma=0}
criteria    : {Code Quality, Performance}
status      : pending
```

`author.username` is `Aaysha_Muzammil`, the real signed in user. The `authorId` field sent in
the body had no effect, because `models/submission.schema.ts` does not define that field and
zod strips anything it does not know about before the controller ever sees it.

Pass

### A valid post appears in the feed

Same request as above. Confirmed separately by reading the feed straight after.

Command:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/submissions?limit=5" | Select-Object -ExpandProperty submissions | Select-Object title, status
```

Actual:

```
title                                          status
-----                                          ------
React dashboard re-renders too often           pending
React dashboard that re-renders way too often  reviewed
Express REST API for a bookstore               reviewed
Migrating a Pages Router app to the App Router reviewed
Django blog with hand rolled authentication    reviewed
```

The new submission is first (newest, no token sent so this is the logged out ordering),
correctly `pending` since it has zero reviews.

Pass

---

## Andrew: reviewing

Run against the local API on port 4000 with the seed data loaded, on 2026-08-14.

This is the endpoint that awards Karma, so it is the one most worth attacking. The
running theme below is the last check in every failure case: **Karma must be unchanged
after every rejected request.** A rule that refuses the review but hands out the points
anyway would be worse than no rule.

### The validation rules, automated

    cd backend
    npx jest tests/services/review.service.test.ts

Actual:

    Test Suites: 1 passed, 1 total
    Tests:       13 passed, 13 total

Those 13 cover the parts of the contract that are about the body alone: empty
strengths, empty improvements, a resource that is not a URL, more than five resources,
ratings missing a criterion, a rating for a criterion belonging to a different
submission, a duplicate rating on the same criterion, and scores of 0, 11 and 5.5.

They run with no `DATABASE_URL` set, because `validateReviewFields` lives in
`models/review.schema.ts` and imports nothing that touches a database. That is why it
was moved there.

Pass

### No token

Command:

    curl -s -X POST "http://localhost:4000/api/submissions/<ID>/reviews"       -H "Content-Type: application/json" -d "{}"

Expected: 401 `UNAUTHENTICATED`

Actual:

    {"error":{"code":"UNAUTHENTICATED","message":"You need to be signed in to do this."}}

Pass

### No token, and a submission id that does not exist

Worth checking separately, because the answer proves the order the checks run in.

Command:

    curl -s -X POST "http://localhost:4000/api/submissions/does-not-exist/reviews"       -H "Content-Type: application/json" -d "{}"

Expected: 401, **not** 404

Actual:

    {"error":{"code":"UNAUTHENTICATED","message":"You need to be signed in to do this."}}

The authentication check runs before anything touches the database, so an anonymous
caller cannot use this endpoint to find out which submission ids exist. A 404 here
would have leaked that.

Pass

### A token that is not real

Command:

    curl -s -X POST "http://localhost:4000/api/submissions/<ID>/reviews"       -H "Content-Type: application/json"       -H "Authorization: Bearer not-a-real-token" -d "{}"

Expected: 401 `UNAUTHENTICATED`

Actual:

    {"error":{"code":"UNAUTHENTICATED","message":"You need to be signed in to do this."}}

A forged token is refused the same as no token. Clerk verifies the signature, so a
made up string cannot pass.

Pass

### Karma equals reviews given times two, across the whole database

The invariant the whole feature rests on. If a review were ever stored without its
Karma, or Karma awarded without a review, this stops being true.

Command:

    curl -s http://localhost:4000/api/users/osini_dev
    curl -s http://localhost:4000/api/users/aqeel_codes
    curl -s http://localhost:4000/api/users/andrew_builds

Actual:

    osini_dev        karma 6    reviews given 3
    aqeel_codes      karma 8    reviews given 4
    andrew_builds    karma 4    reviews given 2

6 = 3 x 2, 8 = 4 x 2, 4 = 2 x 2. It holds for every user checked.

This is what the single `prisma.$transaction` buys: the review, its ratings and the +2
either all happen or none of them do.

Pass

### Still to run, with a signed in token

These four need a real Clerk session token, which expires in about a minute, so they
have to be run by hand from a browser session:

    // in the browser console, signed in
    await window.Clerk.session.getToken()

- reviewing your own submission, expect 403 `SELF_REVIEW_FORBIDDEN`
- reviewing the same submission twice, expect 409 `DUPLICATE_REVIEW`
- a score of 11, expect 400 `INVALID_SCORE`
- ratings missing one criterion, expect 400 `INCOMPLETE_RATINGS`

**And after each one, re-read the reviewer's profile and confirm Karma has not moved.**

The rules themselves are already proven by the 13 automated tests above; what these add
is the proof that the API wires them up in the right order and that nothing leaks
Karma on a failure.

---

## Aqeel: profiles and reputation

### A username that does not exist

Command:

    curl -s http://localhost:4000/api/users/nobody_exists

Expected:

    {"error":{"code":"USER_NOT_FOUND","message":"No user with that username."}}

Actual:

    {"error":{"code":"USER_NOT_FOUND","message":"No user with that username."}}

Pass

### Karma equals reviews given multiplied by 2

Command:

    curl -s http://localhost:4000/api/users/aqeel_codes

Actual, trimmed to the relevant fields:

    "karma":8,"reviewsGiven":4

8 = 4 * 2. Checked a second seeded user too: `andrew_builds` returns `"karma":4,"reviewsGiven":2`,
and `maya_dev` returns `"karma":6,"reviewsGiven":3`. All three hold.

Pass

### Reviews given matches the seed data by hand

`aqeel_codes` in `backend/prisma/seed.ts` writes exactly four reviews, on `bookstore-api`,
`django-blog`, `nextjs-migration` and `slow-query`. The API returns `"reviewsGiven":4`.

Pass

### Reviews received is different from reviews given, and is counted the right way round

The trap the SRS calls out: reviews received is reviews written on submissions this person
authored, not reviews this person wrote. Checked with `andrew_builds`, who both authored
submissions and wrote reviews on other people's work.

Command:

    curl -s http://localhost:4000/api/users/andrew_builds

Actual, trimmed:

    "reviewsGiven":2,"reviewsReceived":5

By hand: `andrew_builds` wrote 2 reviews (on `django-blog` and `slow-query`). He authored three
submissions: `react-dashboard` (0 reviews), `bookstore-api` (3 reviews, from `aqeel_codes`,
`osini_dev`, `maya_dev`), `rust-dedup` (2 reviews, from `aaysha_dev`, `maya_dev`). 0 + 3 + 2 = 5.
`reviewsReceived` (5) is different from `reviewsGiven` (2), and matches the count of reviews
written on his submissions, not the count of reviews he wrote himself.

Pass

### Technology insight counts against the seed data by hand

`aqeel_codes` wrote reviews on submissions tagged: `bookstore-api` (Node, Express, Prisma),
`django-blog` (Python, Django), `nextjs-migration` (Next.js, TypeScript), `slow-query`
(PostgreSQL, Node). Counting each tag by hand: Node 2, Express 1, Prisma 1, Python 1, Django 1,
Next.js 1, TypeScript 1, PostgreSQL 1.

Actual:

```json
"reviewsByTag": [
  { "tag": "Node", "count": 2 },
  { "tag": "Express", "count": 1 },
  { "tag": "Prisma", "count": 1 },
  { "tag": "Python", "count": 1 },
  { "tag": "Django", "count": 1 },
  { "tag": "Next.js", "count": 1 },
  { "tag": "TypeScript", "count": 1 },
  { "tag": "PostgreSQL", "count": 1 }
]
```

Matches exactly. Also checked `averageScoreGiven` by hand: the nine ratings across those four
reviews are 8, 6, 7, 5, 7, 6, 7, 7, 4, summing to 57. 57 / 9 = 6.333, rounded to one decimal is
6.3, which is what the API returns.

Pass

### A profile with no reviews at all does not break

Created a throwaway user directly in the database with no reviews and no submissions, called the
endpoint, then deleted the row.

Command:

    curl -s http://localhost:4000/api/users/zero_reviews_test

Actual:

```json
{
  "username": "zero_reviews_test",
  "bio": null,
  "techStack": ["Go"],
  "githubUrl": null,
  "karma": 0,
  "reviewsGiven": 0,
  "reviewsReceived": 0,
  "insights": { "reviewsByTag": [], "reviewsByMonth": [], "averageScoreGiven": null },
  "submissions": []
}
```

No error, no crash. `averageScoreGiven` comes back `null` rather than `0`, so the front end can
tell "never rated anything" apart from "rated everything a zero". The profile page checks
`reviewsGiven === 0` before rendering the insight charts, so it shows "Has not written a review
yet" instead of two empty boxes.

Pass
