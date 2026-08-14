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

Actual:

    Test Suites: 1 passed, 1 total
    Tests:       19 passed, 19 total

Those 19 cover the parts a curl command cannot show: that the three pieces of the score
add up to the total, that one matching tag beats the entire recency range, that an
unreviewed submission outranks an equally matched reviewed one, and that the needs-help
bonus never outranks a genuine extra tag match. They need no database, which is why they
run anywhere.

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

### Still to do

The two checks that need a signed in user, because they need a real Clerk token:

- a React developer's feed puts React tagged submissions first
- a Node developer's feed puts a different submission first, from the same set

The ranking maths behind both is covered by the 19 unit tests above. What is not yet
written up is the end to end proof through the API with a token, and the screenshot of
the "Why this order?" breakdown. Do this once the demo accounts are signed in.

---

## Aaysha: posting a request

To write. Must cover:

- No token, expect 401
- Empty title, expect 400 `INVALID_TITLE`
- Six criteria, expect 400 `INVALID_CRITERIA`
- Zero criteria, expect 400 `INVALID_CRITERIA`
- Repo URL that is not a URL, expect 400 `INVALID_REPO_URL`
- No tags, expect 400 `INVALID_TAGS`
- An `authorId` in the body belonging to someone else, and confirm it is ignored and the
  submission is created under the signed in person instead
- A valid post, expect 201 and the submission appearing in the feed

---

## Andrew: reviewing

To write. Must cover:

- No token, expect 401
- A submission id that does not exist, expect 404 `SUBMISSION_NOT_FOUND`
- Reviewing your own submission, expect 403 `SELF_REVIEW_FORBIDDEN`
- Reviewing the same submission twice, expect 409 `DUPLICATE_REVIEW` on the second
- A score of 11, expect 400 `INVALID_SCORE`
- A score of 0, expect 400 `INVALID_SCORE`
- Ratings missing one criterion, expect 400 `INCOMPLETE_RATINGS`
- Ratings for a criterion belonging to a different submission, expect 400
- `"karma": 9999` in the body, confirm it is ignored
- **After every single failure above, check the reviewer's Karma has not moved.** This is the one
  that proves the transaction is doing its job.
- A valid review, expect 201, Karma up by exactly 2, and the submission now showing as Reviewed

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
