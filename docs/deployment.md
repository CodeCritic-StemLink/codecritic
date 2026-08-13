# Deployment

Everything about how CodeCritic gets onto the internet: what runs where, why we chose each
service, the exact settings, and what to do when something breaks.

Deployed 2026-08-13.

---

## 1. The links

| What | Link |
| --- | --- |
| **The live site.** This is the only link we submit. | https://codecritic-jade.vercel.app |
| The API | https://codecritic-api.onrender.com |
| API health check | https://codecritic-api.onrender.com/api/health |
| Repository | https://github.com/CodeCritic-StemLink/codecritic |

**Mentors only need the Vercel link.** They never touch the API directly, because the feed page
renders on Vercel's server and that server calls Render. The visitor's browser never speaks to
Render at all.

---

## 2. What runs where

```
        A visitor's browser
                |
                | opens codecritic-jade.vercel.app
                v
        VERCEL  (Washington, USA)
        Next.js front end
                |
                | server side fetch to the API
                v
        RENDER  (Singapore)
        Express API
                |
                | Prisma
                v
        NEON  (Singapore)
        PostgreSQL 17
```

Three separate companies, one for each layer. That is the normal shape for this kind of project
and it is what the SRS asks for: "Vercel (front end) plus a hosted back end and database".

---

## 3. Why we chose each one

### Database: Neon

**What it is.** A company that runs a PostgreSQL database for you.

**Why not a database on our own laptops.** Four people need the same data, and the deployed site
needs to reach it over the internet. A local database is reachable by one person on one machine.

**Why Neon over Supabase.** Both host PostgreSQL. Supabase is a whole platform with auth, file
storage and realtime, none of which we need because Clerk handles authentication. Neon does one
thing. Also, Supabase pauses free projects after about a week of inactivity and needs a manual
click to wake, while Neon resumes on its own in under a second.

**Worth knowing.** Vercel's own "Vercel Postgres" product is Neon underneath. So even if we had
used Vercel for everything, we would have got the same database.

**Settings we chose:**

| Setting | Value | Why |
| --- | --- | --- |
| Region | Singapore (ap-southeast-1) | Close to us and close to the API. Cannot be changed later. |
| PostgreSQL version | 17 | One behind the newest. Prisma has had longer with it. |
| Neon Auth | Off | Clerk owns authentication. Two identity systems means two sources of truth. |
| Connection string | The direct one, not the pooled one | Pooled connections do not support everything `prisma migrate` needs, and our traffic is far too small to need pooling. |

### Back end: Render

**Why Render.** Our back end classes taught it specifically, including `render.yaml` blueprints
and `prisma migrate deploy` in the start command. Matching what our mentors demonstrated is worth
something at assessment.

**The technical reason.** Render runs Express as one process that stays alive. The alternative,
serverless, starts and stops a new process per request, which with Prisma means dealing with
connection pooling. Render avoids that question entirely.

**What we gave up.** Vercel can now host Express too, which would have meant one dashboard instead
of two. We chose the version our class taught.

**Settings we chose:**

| Setting | Value |
| --- | --- |
| Region | Singapore | 
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npx prisma migrate deploy && npm start` |
| Health Check Path | `/api/health` |
| Instance | Free |
| Branch watched | `main` |

**Why `prisma generate` matters.** Our `build` script is `prisma generate && tsc`. The generated
Prisma client is not committed to the repo, so without that step the build compiles against
nothing and fails with "cannot find module". This is the single most common deployment failure
with Prisma.

**Why `prisma migrate deploy` and not `migrate dev`.** `deploy` applies existing migration files
and nothing else. `dev` tries to create new ones and would prompt for input, which no deployment
can answer.

**Why Root Directory matters.** Our repository holds both halves. Without it, Render looks in the
repository root, finds no `package.json`, and fails. It also means Render only redeploys when
files inside `backend` change, so a front end change does not pointlessly rebuild the API.

### Front end: Vercel

**Why Vercel.** The SRS names it. It is also made by the same company as Next.js, so nothing needs
configuring.

**Settings we chose:**

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| Branch watched | `main` |

**One failure we hit.** The first build compiled successfully then failed with "No Output
Directory named public found". That happens when Framework Preset is set to Other: Vercel looks
for a `public` folder, but Next.js writes its output to `.next`. Setting the preset to Next.js
fixed it with no code change.

---

## 4. Environment variables

Nothing secret is in the repository. Each host holds its own copy.

### Render, the API

| Name | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Neon dashboard, the direct connection string |
| `CLERK_SECRET_KEY` | Clerk dashboard, API Keys |
| `CLERK_PUBLISHABLE_KEY` | Clerk dashboard, API Keys |
| `CORS_ORIGIN` | `https://codecritic-jade.vercel.app` |

### Vercel, the site

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `NEXT_PUBLIC_API_URL` | `https://codecritic-api.onrender.com/api` |

**The one people get wrong** is `NEXT_PUBLIC_API_URL`. Locally it is
`http://localhost:4000/api`. On Vercel it must be the Render address, with `/api` on the end and
no trailing slash. Get it wrong and the site loads perfectly with an empty feed.

**`NEXT_PUBLIC_` means the browser can read it.** That is correct for the Clerk publishable key,
whose whole job is to identify our app to the browser. It would be a disaster on a secret. Never
put that prefix in front of anything you would not put on a billboard.

---

## 5. CORS, and why the feed worked before we set it

CORS stands for Cross Origin Resource Sharing. It is a **browser** rule: a page served from one
address may not read a response from a different address unless that other server says it is
allowed.

Here is the part worth understanding. After deploying, the feed worked immediately, **before** we
had set `CORS_ORIGIN` at all. That is not a mistake, and it is a good question to be asked.

**Our feed page is a server component.** The fetch happens on Vercel's server, not in anyone's
browser. No browser, no CORS check.

The profile setup form is different. It runs in the browser, so that call is subject to CORS and
would have been blocked. That is what `CORS_ORIGIN` fixes.

**How to check it is right:**

```
curl -i -X OPTIONS https://codecritic-api.onrender.com/api/users/sync \
  -H "Origin: https://codecritic-jade.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

The reply should contain:

```
access-control-allow-origin: https://codecritic-jade.vercel.app
```

**A confusing detail.** Send that same request pretending to be some other website and the server
still answers with our Vercel address in that header. That is correct. The server always names the
one origin it trusts, and the **browser** compares. Since the header would not match the attacker's
address, the browser refuses to hand over the response.

---

## 6. The keepalive robot

**The problem.** Render's free tier switches the API off after about 15 minutes with no requests.
Waking it takes roughly 50 seconds.

**Why that is worse than slow.** Our feed page waits for the API before it renders. Vercel's free
plan caps how long a page render may wait, around 10 seconds. So a visitor arriving at a sleeping
API does not get a slow page, they get an error page.

That matters because our mentors may open the link weeks after we submit, once, and form their
whole impression from it.

**The fix.** A free scheduled job at **cron-job.org** requests the health endpoint every 10
minutes.

| Setting | Value |
| --- | --- |
| Title | CodeCritic API keepalive |
| URL | `https://codecritic-api.onrender.com/api/health` |
| Every | 10 minutes |

Render never sees 15 idle minutes, so it never sleeps, so there is never a cold start.

**Why 10 and not 1.** You only have to arrive before the 15 minutes runs out. Every minute would
be sixty requests an hour for the same result. Ten leaves a safe margin if a ping is late.

**Why the health endpoint is the right target.** It answers in a millisecond and deliberately does
not touch the database, so the robot costs us nothing.

Render's free tier gives 750 instance hours a month and a month is about 730, so one always on
free service fits.

---

## 7. How updates reach the internet

Both hosts watch the `main` branch. Merging a pull request into `main` deploys automatically.

| Change | What redeploys |
| --- | --- |
| Anything in `backend/` | Render, about 2 minutes |
| Anything in `frontend/` | Vercel, about 1 minute |
| Anything in `docs/` | Nothing |

**Vercel also builds a preview for every pull request**, on its own URL, and posts the link as a
comment on the pull request. That is how we review each other's work: open the link and click
through it, rather than pulling the branch and starting two servers.

**Rolling back.** Vercel has Instant Rollback on the Deployments page: pick the last good
deployment and promote it. Render keeps previous deploys too, under Manual Deploy.

---

## 8. Known limits

Honest list of what is not production grade, and why we accepted each one.

| Limit | Effect | Why we accepted it |
| --- | --- | --- |
| Render free tier | Sleeps after 15 idle minutes | Solved by the keepalive robot |
| Clerk development keys | Usage limits, and a development banner in the Clerk widget | A Clerk production instance needs DNS records on a domain we own. A `vercel.app` address cannot have them. |
| Vercel Hobby | Page renders time out after roughly 10 seconds | Only matters if the API is asleep, which the robot prevents |
| Neon free tier | Compute sleeps when idle | Wakes in under a second, invisible in practice |
| One API, one database | No separate staging environment | Two days to deadline. Not worth the complexity. |

---

## 9. When something breaks

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Site loads, feed is empty | `NEXT_PUBLIC_API_URL` wrong on Vercel | Check it ends in `/api` with no trailing slash |
| Site shows "could not reach the server" | API is down or waking | Open the health URL, wait, refresh |
| Build fails with "cannot find module @prisma/client" | `prisma generate` missing from the build command | Build command must be `npm install && npm run build` |
| Build fails with "No Output Directory named public" | Vercel Framework Preset is Other | Set it to Next.js |
| Signing in works but the profile form fails | `CORS_ORIGIN` missing or wrong on Render | Must exactly match the Vercel address, no trailing slash |
| Render build cannot find package.json | Root Directory not set | Set it to `backend` |
| API starts then every request returns 500 | A Clerk key is missing | The server refuses to start and names it. Read the first lines of the log. |

**Where to look first.** Open the health endpoint. If it answers, the server is running and the
problem is the database, the query, or the front end. If it does not, the server itself is down.
That one request splits the problem in half, which is exactly why the endpoint exists.
