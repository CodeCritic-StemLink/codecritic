# Authentication

How signing up, signing in and signing out work in CodeCritic, what Clerk does for us,
what we built, and what happens in every situation we could think of.

Written 2026-08-14.

---

## The short answer to the question people ask first

**If you already have an account and you sign out, you sign back IN, not up. Your
profile is still there. You do not fill it in again.**

Your username, bio, tech stack, GitHub link and Karma live in our own database and are
never deleted. Signing out only clears a cookie in your browser.

There is one trap, and it is ours: see [the gap in profile setup](#known-gaps) below.

---

## 1. Who does what

There are two systems and they each own different things.

| Clerk owns | We own |
| --- | --- |
| Email addresses and passwords | Username |
| Password hashing and storage | Bio, tech stack, GitHub link |
| "Forgot password" and reset emails | Karma |
| Email verification | Submissions and reviews |
| Google and GitHub sign in | Everything the product is about |
| The session cookie and its expiry | |
| Bot protection | |

**We never see a password.** Not in the database, not in a log, not in transit through
our code. That is the single biggest reason the spec chose a hosted authentication
service, and it is worth saying plainly at assessment.

### What that means practically

We did not build "forgot password". We did not build "remember me". We did not build
email verification. **All three work, and none of them are our code.** They arrived
switched on.

---

## 2. The two records, and the thread between them

```
        Clerk's servers                      our Postgres

   ┌──────────────────────┐          ┌────────────────────────────┐
   │ email                │          │ User                       │
   │ password (hashed)    │          │   clerkId   <-- the join   │
   │ Google / GitHub link │  clerkId │   username                 │
   │ session              │ ───────> │   bio                      │
   │ userId (user_2abc..) │          │   techStack []             │
   └──────────────────────┘          │   githubUrl                │
                                     │   karma                    │
                                     └────────────────────────────┘
```

`clerkId` is the only thing tying them together. It comes from the **verified token**
on every request, never from the request body. That is what makes it trustworthy.

**Nothing else is duplicated.** We do not store the email, so there is nothing to keep
in sync and nothing to leak.

---

## 3. The pages, and why they exist

| Route | What it is |
| --- | --- |
| `/sign-in` | Our page, rendering Clerk's `<SignIn>` |
| `/sign-up` | Our page, rendering Clerk's `<SignUp>` |
| `/profile/setup` | Ours entirely. Username, bio, tech stack, GitHub link |

### Why the folders are named `[[...sign-in]]`

That is a catch all route, and it is required rather than decorative.

**Signing in is not one screen.** Clerk navigates to sub paths of its own for a code
from an email, a second factor, or a password reset:

```
/sign-in/factor-one
/sign-up/verify-email-address
```

A plain `/sign-in` folder answers the first screen and **404s on every step after it**.
Anyone who ever needed to reset a password would hit a dead end.

### Why we made our own pages instead of using Clerk's popup

Three reasons:

1. **A real URL can be linked to.** A popup cannot be bookmarked, opened in a new tab,
   or sent in an email.
2. **Redirect after sign up.** Sending a new account to profile setup needs a page to
   attach that rule to.
3. **The spec expects our routes**, and a popup that says "Secured by Clerk" as its
   only heading looks like somebody else's product.

---

## 4. What happens, step by step

### Signing up with email

```
1. /sign-up, enter email and password
2. Clerk emails a verification code
3. Enter the code             -> Clerk account now exists
4. Forced redirect to /profile/setup
5. Pick a username, tech stack, bio, GitHub link
6. Submit -> POST /users/sync -> our User row is created, karma 0
7. Now the feed can rank for you
```

**The forced redirect at step 4 is the important part.** Between steps 3 and 6 you
exist in Clerk but not in our database. The feed cannot rank anything for somebody
whose technologies we do not know, and the navigation bar cannot show a Karma total
for a row that is not there.

Before we forced it, a new account landed on the feed in that half created state, and
the navigation bar had a `try/catch` quietly swallowing the resulting error. **That
workaround is still there on purpose**, as a safety net, but the redirect means it
should never fire.

### Signing up with Google or GitHub

Same, minus the verification step: Google and GitHub have already verified the email.

```
1. /sign-up, click Continue with GitHub
2. Approve on GitHub's screen  -> Clerk account exists
3. Forced redirect to /profile/setup
4. Same as above from here
```

### Signing in

```
1. /sign-in, email and password, or Google, or GitHub
2. Clerk sets the session cookie
3. Redirect to wherever you were trying to go, or the feed
```

**No profile setup.** Your row already exists and is found by `clerkId`.

### Signing out

```
1. Click your avatar, then Sign out
2. A confirm box asks first
3. Session cookie cleared
4. Back to the feed, signed out
```

**Nothing is deleted.** Not your row, not your Karma, not your submissions or reviews.
There is no delete of a User anywhere in the backend, which also satisfies the SRS
rule that nothing is ever removed.

The confirm exists for one reason: writing a review is the longest piece of typing on
the site, and the avatar sits a few pixels from the theme toggle. A misclick there
used to lose the lot, because nothing is saved until submit.

---

## 5. Every situation we could think of

| Situation | What happens | Is that right? |
| --- | --- | --- |
| **Signed up before, signed out, coming back** | **Sign in. Profile and Karma intact, straight to the feed.** | Yes |
| Try to "sign up" again with the same Google or GitHub account | Clerk recognises it and signs you in instead | Yes, normal for social login |
| Try to sign up again with the same email and password | Clerk says the account exists and offers sign in | Yes |
| Sign in with an email that never registered | Clerk says no account exists | Yes |
| Sign in with Google having never "signed up" | Works, and creates the account on the spot | Yes. There is nothing to sign up for; you already have the account |
| Forgot the password | "Forgot password?" on the password screen, Clerk emails a reset | Yes, Clerk's, not ours |
| Close the browser and come back tomorrow | Still signed in | Yes. Session is 7 days sliding |
| Two weeks away, no visits | Signed out, session expired | Yes |
| Signed out visitor opens the feed | Works, newest first | Required by the SRS |
| Signed out visitor opens any profile | Works, profiles are public | Required by the SRS |
| Signed out visitor opens `/submissions/new` | Redirected to `/sign-in?redirect_url=/submissions/new`, and after signing in lands back on the form | Yes |
| Signed out visitor calls `POST /submissions` directly | 401 `UNAUTHENTICATED` | Yes. This is the real guard; the page redirect is only convenience |
| Signed in to Clerk but abandoned profile setup | Feed shows a "Finish your profile" banner, navigation bar renders without the Karma chip | Yes, and the forced redirect makes it rare |
| Somebody puts `authorId` in a request body | Stripped by zod before our code runs; the author comes from the token | Yes, and there is a test for it |
| Editing another person's profile | Impossible. `PATCH /users/me` has no id in its path | Yes |
| Two people pick the same username | Second one gets 409 `USERNAME_TAKEN` | Yes |
| Theme toggled while sitting on the sign in page | Clerk's form keeps the old colours until the page reloads | **Known limitation.** See below |

---

## 6. What we configured, and what we changed

### In the Clerk dashboard, no code

- **Google** sign in, on
- **GitHub** sign in, on, using Clerk's shared credentials. Nothing registered on
  GitHub's side, which is fine for a development instance
- Sessions left at the default: **7 days, sliding**, so activity extends it

**Why GitHub specifically.** Every user of this site is a developer, every submission
is a repository link, and the profile already stores a GitHub URL. It fits the product.
Adding Facebook or Twitter would be another button nobody could justify.

### In our code

| File | What it does |
| --- | --- |
| `app/sign-in/[[...sign-in]]/page.tsx` | Our sign in route |
| `app/sign-up/[[...sign-up]]/page.tsx` | Our sign up route, with the forced redirect to profile setup |
| `lib/clerkAppearance.ts` | How Clerk's forms are dressed to match our theme |
| `components/UserMenu.tsx` | The avatar menu, with a confirming sign out |
| `app/submissions/new/page.tsx` | Redirects a signed out visitor to sign in |
| `proxy.ts` | Clerk middleware. Reads the session, blocks nothing |

### Two styling lessons worth recording

**Colours go through `variables`, not Tailwind classes.** Clerk injects its own
stylesheet at runtime and it beats a plain utility class. `bg-primary` on the submit
button was on the element and being ignored: the button stayed grey. `variables` is the
supported way in, and the values point at our CSS variables rather than hex codes, so
one definition covers light and dark. Our teal is `#0E7C74` light and `#3FBFB0` dark, so
a hard coded hex would have been wrong in one of them.

**Where a class is genuinely needed, Tailwind 4's `!` suffix is required.** Same fight:
without it, `hidden` sat on an element that stayed `display: flex`.

---

## 7. Known gaps

### Profile setup does not prefill, and it overwrites

`/profile/setup` starts with **empty fields**, and submitting it calls
`POST /users/sync`, which **upserts**. So a returning user who navigates there, types a
username and submits will **overwrite their existing bio, tech stack and GitHub link
with whatever the blank form contained.**

Karma and submissions are safe: the upsert does not touch them.

Nothing routes a returning user there, so it takes a deliberate visit to the URL. **The
fix is to load the existing profile into the form first**, using `GET /users/me`, which
already exists. Small job, not yet done.

### Theme changes need a reload on the auth pages

Clerk reads the colours once when its form mounts. Toggling the theme while sitting on
`/sign-in` leaves the form in the old colours until the page reloads.

Forcing a remount on theme change would fix it, but anyone halfway through email
verification would lose their place if they touched the toggle. **Mismatched colours
for a moment is the smaller problem.** Colours are correct on every normal page load.

### The Clerk instance is in development mode

That is the orange badge at the bottom of the form. Development instances have usage
limits and use Clerk's shared social credentials. Fine for the demo. Going to real
users means a production instance and our own GitHub OAuth app, which is what the
"Use custom credentials" switch is for.

---

## 8. What every member must be able to explain

Any of us can be asked about any of it, so these are the answers to have ready.

**Where is the password stored?** Nowhere in our system. Clerk holds it, hashed. We
never receive it.

**How does a Clerk identity become a row in our database?** `POST /users/sync` takes
the `clerkId` from the verified token and upserts a User row. It is called when the
profile setup form is submitted.

**Why upsert instead of create?** Because it is called on every profile save, not just
the first. Create would fail the second time, and would risk duplicate rows.

**Why does sign up force a redirect to profile setup?** Because a Clerk account with no
User row cannot be ranked for, has no Karma to show and no username to link to. It
closes a state the app could otherwise sit in.

**What happens to my data when I sign out?** Nothing. Only the session cookie is
cleared. There is no delete of a User anywhere in the backend.

**How do you stop somebody posting as another person?** The author comes from the
verified token, in the service. The schema does not declare `authorId`, so zod strips it
from the body before any of our code sees it. There is a test asserting exactly that.

**Why is the page redirect on `/submissions/new` not the real security?** Because
anyone can call the API directly and never load that page. The real guard is the
endpoint answering 401 without a valid token. The redirect is a courtesy so a signed
out visitor is not stuck looking at a form they cannot use.
