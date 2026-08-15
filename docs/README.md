# CodeCritic design documents

CodeCritic is a peer code review platform. You post a link to something you have built,
say what you want looked at, and other developers write structured feedback and score it
against criteria you chose yourself. Writing a review earns you Karma.

These documents describe how it is designed and why. They were written alongside the
build and kept in step with it, so what is here is what the code does.

---

## Where to start

| Document | What it covers |
| --- | --- |
| [database-design.md](database-design.md) | The five tables, what each one holds, and the decisions behind them |
| [er-diagram.svg](er-diagram.svg) | The same thing as a picture |
| [api-design.md](api-design.md) | Every endpoint, every field, every validation rule and error code |
| [feature-01-ranking.md](feature-01-ranking.md) | The personalised feed: how the ordering is calculated and why |
| [feature-02-profiles.md](feature-02-profiles.md) | Public profiles, Karma, and the insights derived from review history |
| [authentication.md](authentication.md) | Signing up, signing in, sessions, and how a login becomes a user row |

Reading them in that order works: the tables, then the endpoints that move data in and
out of them, then the two features built on top.

---

## The shape of the system

```
   browser                    Express API                 PostgreSQL
   ───────                    ───────────                 ──────────
   Next.js pages   ────────►  routes                          
   rendered on              controllers                       
   the server               services      ◄──── the rules live here
                            repositories  ────────►  tables
```

Two applications in one repository. The front end is Next.js and renders on the server,
so a visitor receives finished HTML. It never touches the database: everything goes
through the API, which owns every rule about what is allowed.

The layering matters more than it looks. A rule written in a React form is a suggestion,
because anyone can call the API directly and skip the form entirely. So **every rule is
enforced in the API**, and the front end repeats the ones worth repeating only so people
find out while they are typing rather than after pressing a button.

---

## Decisions worth knowing before you read further

**Karma is a column, not a table.** It only ever moves by +2, only ever inside the
transaction that writes a review, and never goes down. The Review table already is the
log, so a second one could only disagree with the first.

**Status is not stored.** Pending and reviewed are derived by counting a submission's
reviews. A stored flag can go stale; a count cannot disagree with itself.

**Criteria are invented per submission.** Whoever posts decides what they want scored, so
this cannot be a fixed set of columns. That is why Criterion and Rating are separate
tables rather than fields on Review.

**The ranking runs on the server.** The browser never receives the scoring code, only the
finished order. See [feature-01-ranking.md](feature-01-ranking.md).

**Nothing is ever deleted.** There is no delete, no moderation and no rejection anywhere
in the product.
