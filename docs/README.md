# Design documents

This folder holds the design work for CodeCritic. It is a **graded deliverable**, not an
afterthought. The specification asks for design documents "produced before implementation and
refined as you build", and they are submitted alongside the repository link.

## What lives here

| File | What it covers | Status |
| --- | --- | --- |
| `database-design.md` | The five tables, their columns, their relationships, and the design decisions we reasoned through (Karma as a column, status as a derived value, Rating as its own table). Includes the ER diagram. | Version 1, 2026-08-11 |
| `api-design.md` | Every endpoint the front end can call, what it expects, what it returns, and which server side validation rules apply to each one. Includes the Feature 01 ranking formula and the plan for proving validation works. | Version 1, 2026-08-11 |
| `team-guide.md` | **Start here.** The A to Z guide for the whole team: what we are building, how we meet the SRS, how to get set up from nothing, how we use branches and pull requests, who owns what, the plan to the deadline, how deployment works, and what every member must be able to explain. | 2026-08-12 |
| `architecture.md` | **Read before writing any file.** The folder structure for both halves, what each layer may import, how one request travels through them, the error hierarchy, and the decisions we locked where the SRS and the class notes disagreed. | 2026-08-12 |
| `deployment.md` | Where everything runs, why we chose Neon, Render and Vercel, the exact settings for each, the environment variables, how CORS works, the keepalive robot, and what to do when a deploy breaks. | 2026-08-13 |
| `aaysha-submission-feature.md` | The full specification for posting a review request, split into back end, unit tests and form. Written because `POST /submissions` is the last unstarted piece and the whole product depends on it. | 2026-08-13 |
| `test-plan.md` | One section per person. The exact command, the expected result and the real result for every rule on their own feature. This is the evidence we show at assessment. | Started 2026-08-12 |

## Why these come before the code

Four people are building one system in one week. If the database shape is not agreed first,
everybody builds against a different idea of it and the pieces do not fit together at the end.

The API design does the same job for the boundary between the front end and the back end.
Once it is agreed, the front end can be built against endpoints that do not exist yet, and the
back end can be built without waiting for any screens.

## Rules for this folder

- Update these documents when the design changes. A design document that no longer matches the
  code is worse than none, because it teaches the wrong thing to whoever reads it.
- Every figure and every decision in here must be explainable by **any** member of the group at
  final assessment, including the parts they did not write.
