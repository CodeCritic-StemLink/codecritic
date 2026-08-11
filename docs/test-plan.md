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

To write. Must cover:

- The feed works with no token, newest first
- The same feed with a token for a React developer puts React tagged submissions first
- The same feed with a token for a Node developer puts a different submission first
- The score breakdown adds up: tag points, recency points and needs help points equal the total
- A submission with no reviews outranks an equally matched one that has reviews
- Automated tests for the ranking function itself

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

To write. Must cover:

- A username that does not exist, expect 404 `USER_NOT_FOUND`
- A real seeded user, and check Karma equals reviews given multiplied by 2
- Check reviews given matches the seed data by hand
- Check reviews received is different from reviews given, and prove you counted reviews on that
  person's submissions rather than reviews they wrote
- Check the technology insight counts against the seed data by hand
- A profile with no reviews at all, and confirm the page does not break on empty data
