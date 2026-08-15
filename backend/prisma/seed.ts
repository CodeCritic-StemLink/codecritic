// Fills the database with realistic demo data.
//
// Run it with:  npm run seed
//
// WARNING: this wipes every row first, so the result is the same every time no matter
// how many times you run it. Do not run it against a database with real data in it.
//
// The data is chosen so the demo tells a story. Tech stacks and tags overlap differently
// for each user, so the Feature 01 ranking visibly reorders the same submissions per
// person. Some submissions deliberately have zero reviews so the "needs help" boost has
// something to lift.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Create backend/.env and put it there.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Turns "3 hours ago" into a real date, so submissions have believable ages.
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// The people
//
// clerkId here is fake. Real Clerk ids start with "user_", so these can never
// collide with a real account created through the sign up form.
// ---------------------------------------------------------------------------

const USERS = [
  {
    clerkId: "seed_aaysha",
    username: "aaysha_dev",
    bio: "Front end focused. Currently learning how to make things load fast.",
    techStack: ["React", "Next.js", "Tailwind"],
    githubUrl: "https://github.com/aaysha",
  },
  {
    clerkId: "seed_aqeel",
    username: "aqeel_codes",
    bio: "Back end and databases. Ask me about schemas.",
    techStack: ["Node", "Express", "Prisma"],
    githubUrl: "https://github.com/aqeel",
  },
  {
    clerkId: "seed_andrew",
    username: "andrew_builds",
    bio: "Writes command line tools nobody asked for.",
    techStack: ["Python", "Django", "Rust"],
    githubUrl: "https://github.com/andrew",
  },
  {
    clerkId: "seed_osini",
    username: "osini_dev",
    bio: "Full stack, one week deep. Reviews more than I post.",
    techStack: ["Next.js", "Prisma", "TypeScript"],
    githubUrl: "https://github.com/osini",
  },
  {
    clerkId: "seed_maya",
    username: "maya_dev",
    bio: "Backend engineer who keeps ending up in the database.",
    techStack: ["React", "Node", "PostgreSQL"],
    githubUrl: "https://github.com/maya",
  },
];

// ---------------------------------------------------------------------------
// The review requests
//
// key      a short name used below to attach reviews. Never stored.
// ageHours how long ago it was posted. Drives both the logged out order and the
//          recency part of the ranking.
// ---------------------------------------------------------------------------

const SUBMISSIONS = [
  {
    key: "react-dashboard",
    author: "andrew_builds",
    ageHours: 2,
    title: "React dashboard that re-renders way too often",
    description:
      "Every keystroke in the search box redraws the whole table. I think I am misusing useEffect but I cannot see where. Around 400 rows, so it should not be this slow.",
    repoUrl: "https://github.com/andrew/react-dashboard",
    tags: ["React", "Next.js"],
    criteria: ["Code Quality", "Performance"],
  },
  {
    key: "bookstore-api",
    author: "andrew_builds",
    ageHours: 5,
    title: "Express REST API for a bookstore",
    description:
      "First proper API. Is my route structure sensible, and am I validating enough before touching the database? Auth is not done yet, that is on purpose.",
    repoUrl: "https://github.com/andrew/bookstore-api",
    tags: ["Node", "Express", "Prisma"],
    criteria: ["API Design", "Error Handling", "Code Quality"],
  },
  {
    key: "nextjs-migration",
    author: "maya_dev",
    ageHours: 8,
    title: "Migrating a Pages Router app to the App Router",
    description:
      "Half the app is migrated and the two halves disagree about data fetching. Looking for advice on where the boundary between server and client components should sit.",
    repoUrl: "https://github.com/maya/next-migration",
    tags: ["Next.js", "TypeScript"],
    criteria: ["Structure", "Type Safety"],
  },
  {
    key: "django-blog",
    author: "aaysha_dev",
    ageHours: 26,
    title: "Django blog with hand rolled authentication",
    description:
      "I wrote the login myself instead of using the built in one, mostly to learn how sessions work. Be honest about whether that was a mistake.",
    repoUrl: "https://github.com/aaysha/django-blog",
    tags: ["Python", "Django"],
    criteria: ["Security", "Readability"],
  },
  {
    key: "cart-store",
    author: "maya_dev",
    ageHours: 30,
    title: "Shopping cart state, is my store doing too much?",
    description:
      "One store holds the cart, the user, and the checkout step. It works but it feels like three things pretending to be one. Worth splitting?",
    repoUrl: "https://github.com/maya/cart-store",
    tags: ["React", "TypeScript"],
    criteria: ["State Management", "Code Quality"],
  },
  {
    key: "tailwind-components",
    author: "aqeel_codes",
    ageHours: 50,
    title: "Tailwind component library, first attempt",
    description:
      "Twenty components and no design system underneath them. Looking for advice on naming, folder structure, and when to stop making everything configurable.",
    repoUrl: "https://github.com/aqeel/tw-components",
    tags: ["React", "Tailwind"],
    criteria: ["Consistency", "Reusability"],
  },
  {
    key: "rust-dedup",
    author: "andrew_builds",
    ageHours: 74,
    title: "Rust CLI that finds duplicate files",
    description:
      "Works fine on 10,000 files and chokes on 100,000. I think I am holding too much in memory but I cannot work out where.",
    repoUrl: "https://github.com/andrew/dedup-rs",
    tags: ["Rust"],
    criteria: ["Performance"],
  },
  {
    key: "booking-schema",
    author: "aaysha_dev",
    ageHours: 98,
    title: "Prisma schema for a room booking app",
    description:
      "Rooms, bookings and guests. Everything runs, but I have a feeling my relations are wrong and I will find out the painful way later.",
    repoUrl: "https://github.com/aaysha/booking-schema",
    tags: ["Prisma", "Node"],
    criteria: ["Schema Design", "Naming"],
  },
  {
    key: "slow-query",
    author: "osini_dev",
    ageHours: 140,
    title: "One PostgreSQL query is 90 percent of my response time",
    description:
      "A join across three tables that takes 1.8 seconds on 50,000 rows. I have read about indexes but I do not know which one this needs or why.",
    repoUrl: "https://github.com/osini/slow-query",
    tags: ["PostgreSQL", "Node"],
    criteria: ["Query Design", "Indexing"],
  },
  {
    key: "ts-helpers",
    author: "aqeel_codes",
    ageHours: 200,
    title: "Generic helper functions that nobody on my team can read",
    description:
      "I got carried away with generics. It is type safe and completely unreadable. How much cleverness is too much?",
    repoUrl: "https://github.com/aqeel/ts-helpers",
    tags: ["TypeScript"],
    criteria: ["Readability", "Type Safety"],
  },

  // -------------------------------------------------------------------------
  // Everything below exists so the feed is longer than one page.
  //
  // The page size is 20, so ten submissions meant the pager had nothing to do and
  // could not be demonstrated or checked. These take the total past 20 and give the
  // second page enough on it to be worth turning to.
  //
  // A few are deliberately tagged in lower case. Tags are typed by hand on the post
  // form, so "node" and "Node" both really occur, and the sidebar counting them as one
  // technology is something the demo should be able to show rather than claim.
  // -------------------------------------------------------------------------

  {
    key: "form-validation",
    author: "aaysha_dev",
    ageHours: 4,
    title: "Form validation logic duplicated in three places",
    description:
      "The same rules live in the React form, in a helper, and again on the server. They have already drifted apart once. Where should the one true copy live?",
    repoUrl: "https://github.com/aaysha/form-validation",
    tags: ["react", "TypeScript"],
    criteria: ["Structure", "Maintainability"],
  },
  {
    key: "auth-middleware",
    author: "maya_dev",
    ageHours: 11,
    title: "Express auth middleware, am I checking the token properly?",
    description:
      "I verify the token and attach the user to the request. It works, but I have a nagging feeling there is a case I have not thought about.",
    repoUrl: "https://github.com/maya/auth-middleware",
    tags: ["node", "Express"],
    criteria: ["Security", "Error Handling"],
  },
  {
    key: "tailwind-dark",
    author: "osini_dev",
    ageHours: 19,
    title: "Dark mode that flashes white on every page load",
    description:
      "The theme is read from local storage, so the first paint is always the wrong one. I have seen this called a flash of unstyled content but not how to fix it properly.",
    repoUrl: "https://github.com/osini/tailwind-dark",
    tags: ["Tailwind", "Next.js"],
    criteria: ["Correctness", "Performance"],
  },
  {
    key: "prisma-n-plus-one",
    author: "andrew_builds",
    ageHours: 33,
    title: "One page, ninety database queries",
    description:
      "Loading a list of orders fires a separate query for each customer. I know this has a name and I know include exists, but I do not understand when it does and does not help.",
    repoUrl: "https://github.com/andrew/orders-api",
    tags: ["Prisma", "PostgreSQL"],
    criteria: ["Query Design", "Performance"],
  },
  {
    key: "zustand-store",
    author: "aaysha_dev",
    ageHours: 45,
    title: "Should every component read from the same Zustand store?",
    description:
      "Twelve components subscribe to one store and most re-render when anything at all changes. Is the store wrong or am I selecting from it wrong?",
    repoUrl: "https://github.com/aaysha/zustand-store",
    tags: ["React", "TypeScript"],
    criteria: ["State Management", "Performance"],
  },
  {
    key: "python-scraper",
    author: "maya_dev",
    ageHours: 61,
    title: "Scraper that silently stops after about 200 pages",
    description:
      "No error, no crash, it just finishes early. I suspect I am swallowing an exception somewhere but I cannot find where.",
    repoUrl: "https://github.com/maya/scraper",
    tags: ["Python"],
    criteria: ["Error Handling", "Readability"],
  },
  {
    key: "rest-naming",
    author: "aqeel_codes",
    ageHours: 80,
    title: "Are my REST routes named sensibly, honestly?",
    description:
      "I have /getUsers, /user/:id/delete and /createNewUser. I suspect all three are wrong and I would rather be told now than after the marking.",
    repoUrl: "https://github.com/aqeel/rest-naming",
    tags: ["Express", "node"],
    criteria: ["API Design", "Consistency"],
  },
  {
    key: "css-grid-layout",
    author: "osini_dev",
    ageHours: 96,
    title: "Layout collapses between 900px and 1100px only",
    description:
      "Fine on a phone, fine on a desktop, broken in the narrow band in the middle. I think my breakpoints have a gap but I cannot see it.",
    repoUrl: "https://github.com/osini/grid-layout",
    tags: ["Tailwind", "React"],
    criteria: ["Responsiveness", "Code Quality"],
  },
  {
    key: "jest-mocking",
    author: "andrew_builds",
    ageHours: 118,
    title: "My tests pass but they are testing the mocks",
    description:
      "Every dependency is mocked, so the tests never touch my actual logic. How much should be mocked before a test stops meaning anything?",
    repoUrl: "https://github.com/andrew/jest-mocking",
    tags: ["TypeScript", "Node"],
    criteria: ["Test Quality", "Readability"],
  },
  {
    key: "docker-compose",
    author: "aqeel_codes",
    ageHours: 155,
    title: "Postgres container loses its data on every restart",
    description:
      "I have a volume declared and I still lose everything. Reasonably sure I have misunderstood what the volume is actually pointing at.",
    repoUrl: "https://github.com/aqeel/docker-setup",
    tags: ["PostgreSQL", "Docker"],
    criteria: ["Correctness", "Documentation"],
  },
  {
    key: "error-boundaries",
    author: "aaysha_dev",
    ageHours: 180,
    title: "One failed fetch takes the whole page down",
    description:
      "A single component throwing puts the entire app on a white screen. I have read about error boundaries but not where to put them or how many.",
    repoUrl: "https://github.com/aaysha/error-boundaries",
    tags: ["React", "Next.js"],
    criteria: ["Error Handling", "Structure"],
  },
  {
    key: "django-orm",
    author: "andrew_builds",
    ageHours: 220,
    title: "Django ORM query that gets slower as the table grows",
    description:
      "Fine at a thousand rows, painful at a hundred thousand. I would like to understand why rather than just being handed an index to add.",
    repoUrl: "https://github.com/andrew/django-orm",
    tags: ["Django", "Python"],
    criteria: ["Query Design", "Performance"],
  },
  {
    key: "go-worker-pool",
    author: "maya_dev",
    ageHours: 260,
    title: "Worker pool that occasionally drops a job",
    description:
      "About one job in ten thousand never finishes. It is almost certainly my channel handling but it is rare enough to be miserable to reproduce.",
    repoUrl: "https://github.com/maya/worker-pool",
    tags: ["Go"],
    criteria: ["Correctness", "Readability"],
  },
  {
    key: "readme-rewrite",
    author: "osini_dev",
    ageHours: 300,
    title: "Nobody can run my project from the README",
    description:
      "Three people have tried and all three got stuck in a different place. Looking for feedback on the instructions themselves rather than the code.",
    repoUrl: "https://github.com/osini/readme-rewrite",
    tags: ["Documentation"],
    criteria: ["Clarity", "Completeness"],
  },
  {
    key: "api-versioning",
    author: "aqeel_codes",
    ageHours: 340,
    title: "Changing one response shape broke two other teams",
    description:
      "I renamed a field and everything downstream fell over. How do people version an API without maintaining two of everything forever?",
    repoUrl: "https://github.com/aqeel/api-versioning",
    tags: ["Express", "API"],
    criteria: ["API Design", "Documentation"],
  },
];

// ---------------------------------------------------------------------------
// The reviews
//
// scores is keyed by the criterion label, and must cover every criterion on that
// submission. That is the same rule the API enforces, so the seed data obeys the
// same contract the real endpoint will.
//
// ageHours is how long ago the review was written. Without it every review was
// created at the instant the seed ran, so every profile read "just now" against all
// of them and the reviews-by-month chart was one bar no matter how old the data was.
// Each one is checked below to be younger than the submission it is on, because a
// review written before the thing it reviews is not something that can happen.
//
// Note what is deliberately absent: nobody reviews their own submission, and no
// person appears twice on the same submission. The database would refuse both.
// ---------------------------------------------------------------------------

const REVIEWS = [
  {
    submission: "bookstore-api",
    ageHours: 3,
    reviewer: "aqeel_codes",
    strengths: "Routes are grouped sensibly and your error messages actually say what went wrong, which most first APIs get wrong.",
    improvements: "You validate inside each route handler. Move it into middleware so every route gets it for free and you cannot forget one.",
    resources: ["https://expressjs.com/en/guide/using-middleware.html"],
    scores: { "API Design": 8, "Error Handling": 6, "Code Quality": 7 },
  },
  {
    submission: "bookstore-api",
    ageHours: 2,
    reviewer: "osini_dev",
    strengths: "Good separation between the route file and the database calls. Easy to follow what happens where.",
    improvements: "Nothing stops a request sending extra fields you did not expect. Check the shape of the body before you trust any of it.",
    resources: [],
    scores: { "API Design": 7, "Error Handling": 7, "Code Quality": 8 },
  },
  {
    submission: "bookstore-api",
    ageHours: 1,
    reviewer: "maya_dev",
    strengths: "The pagination is done properly with limit and offset rather than loading everything and slicing it.",
    improvements: "Your delete route returns 200 whether or not the row existed. Return 404 when it did not, otherwise callers cannot tell.",
    resources: [],
    scores: { "API Design": 6, "Error Handling": 5, "Code Quality": 7 },
  },
  {
    submission: "django-blog",
    ageHours: 17,
    reviewer: "andrew_builds",
    strengths: "The password hashing is done correctly, which is the part most people get wrong when they roll their own.",
    improvements: "Sessions never expire. Anyone who gets hold of the cookie stays logged in forever, including after a password change.",
    resources: ["https://docs.djangoproject.com/en/stable/topics/http/sessions/"],
    scores: { Security: 4, Readability: 8 },
  },
  {
    submission: "django-blog",
    ageHours: 12,
    reviewer: "aqeel_codes",
    strengths: "Small, clear views that read top to bottom. I understood the whole flow in about five minutes.",
    improvements: "Django's own auth does everything you wrote and has been attacked by the entire internet for fifteen years. Rewriting on top of it is the honest answer.",
    resources: ["https://docs.djangoproject.com/en/stable/topics/auth/"],
    scores: { Security: 5, Readability: 7 },
  },
  {
    submission: "rust-dedup",
    ageHours: 48,
    reviewer: "aaysha_dev",
    strengths: "The two stage hashing is smart. Cheap check first to rule most files out, expensive check only on the survivors.",
    improvements: "You read whole files into memory before hashing. Stream them in chunks and your memory use stops depending on file size.",
    resources: ["https://doc.rust-lang.org/std/io/trait.Read.html"],
    scores: { Performance: 6 },
  },
  {
    submission: "rust-dedup",
    ageHours: 35,
    reviewer: "maya_dev",
    strengths: "Good use of the type system to make an unhashed file impossible to compare by accident.",
    improvements: "The directory walk is recursive and will blow the stack on a deep tree. An explicit queue would be safer.",
    resources: [],
    scores: { Performance: 7 },
  },
  {
    submission: "nextjs-migration",
    ageHours: 5,
    reviewer: "osini_dev",
    strengths: "Sensible order of migration, leaf pages first, so you were never half broken in the middle of a user journey.",
    improvements: "Several components are marked as client components only because one child needed it. Push the boundary down to the child that actually needs it.",
    resources: ["https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns"],
    scores: { Structure: 7, "Type Safety": 8 },
  },
  {
    submission: "nextjs-migration",
    ageHours: 4,
    reviewer: "aqeel_codes",
    strengths: "The data fetching in server components is clean and you are not double fetching on the client.",
    improvements: "Your shared types live in the component files. Pull them into one place or the two halves will drift apart.",
    resources: [],
    scores: { Structure: 6, "Type Safety": 7 },
  },
  {
    submission: "slow-query",
    ageHours: 91,
    reviewer: "maya_dev",
    strengths: "You included the EXPLAIN output, which is more than most people do and made this reviewable in one read.",
    improvements: "The sequential scan is on the join column. An index on that one column will do most of the work here.",
    resources: ["https://www.postgresql.org/docs/current/indexes-intro.html"],
    scores: { "Query Design": 6, Indexing: 3 },
  },
  {
    submission: "slow-query",
    ageHours: 66,
    reviewer: "aqeel_codes",
    strengths: "Selecting only the columns you need rather than everything is the right instinct and already saves you a lot.",
    improvements: "You filter after the join. Filter first and the join has far fewer rows to work with.",
    resources: [],
    scores: { "Query Design": 7, Indexing: 4 },
  },
  {
    submission: "slow-query",
    ageHours: 41,
    reviewer: "andrew_builds",
    strengths: "Clear naming in the query. I could tell what it was for without reading the surrounding code.",
    improvements: "Consider whether you need all 50,000 rows at once. Pagination would make the index question far less urgent.",
    resources: [],
    scores: { "Query Design": 8, Indexing: 5 },
  },
  {
    submission: "ts-helpers",
    ageHours: 130,
    reviewer: "osini_dev",
    strengths: "It genuinely is type safe. The compiler catches things at the call site that would be runtime bugs elsewhere.",
    improvements: "Four nested conditional types to save one cast is a bad trade. Write the simple version and add a comment saying why.",
    resources: [],
    scores: { Readability: 3, "Type Safety": 9 },
  },
  {
    submission: "ts-helpers",
    ageHours: 94,
    reviewer: "aaysha_dev",
    strengths: "The tests cover the tricky cases, so at least the behaviour is pinned down even where the types are dense.",
    improvements: "Name your generic parameters. T, U and V tell a reader nothing when there are three of them in one signature.",
    resources: [],
    scores: { Readability: 4, "Type Safety": 8 },
  },

  // Reviews on the longer set above, so the second page of the feed is a believable
  // mix of answered and unanswered rather than a block of untouched posts.
  {
    submission: "form-validation",
    ageHours: 3,
    reviewer: "osini_dev",
    strengths: "You spotted the duplication yourself before anyone told you, which is most of the work.",
    improvements: "Keep the server copy as the real one and have the form call the same rules. The server has to check anyway, so the other two are the copies you can afford to lose.",
    resources: [],
    scores: { Structure: 6, Maintainability: 5 },
  },
  {
    submission: "auth-middleware",
    ageHours: 7,
    reviewer: "aqeel_codes",
    strengths: "Attaching the user to the request once rather than re-reading the token in every route is the right shape.",
    improvements: "You verify the signature but never look at the expiry, so an old token still works. Check it, and decide what you want to happen to a request that arrives one second late.",
    resources: [],
    scores: { Security: 5, "Error Handling": 7 },
  },
  {
    submission: "python-scraper",
    ageHours: 40,
    reviewer: "andrew_builds",
    strengths: "The retry logic is sensible and you back off rather than hammering the site.",
    improvements: "Your loop has a bare except that catches everything and moves on, which is why it looks like it finished. Catch the one error you expect and let the rest be loud.",
    resources: [],
    scores: { "Error Handling": 3, Readability: 7 },
  },
  {
    submission: "rest-naming",
    ageHours: 52,
    reviewer: "andrew_builds",
    strengths: "Asking before the marking rather than after is the correct instinct and the answer is easy.",
    improvements: "The path names the thing, the method names the action. /users with GET, /users/:id with DELETE. Your three routes become two nouns.",
    resources: ["https://restfulapi.net/resource-naming/"],
    scores: { "API Design": 5, Consistency: 4 },
  },
  {
    submission: "error-boundaries",
    ageHours: 117,
    reviewer: "maya_dev",
    strengths: "Good instinct that one component should not be able to take the page down.",
    improvements: "One boundary at the top only tells you the page broke. Put one around each section that can fail on its own and the rest of the page survives.",
    resources: [],
    scores: { "Error Handling": 5, Structure: 6 },
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding CodeCritic...\n");

  // Wipe in dependency order: children first, or the foreign keys refuse.
  // Rating points at Review and Criterion, Review points at Submission and User,
  // Criterion points at Submission, Submission points at User.
  await prisma.rating.deleteMany();
  await prisma.review.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();
  console.log("  cleared existing rows");

  // People first, because everything else points at them.
  const usersByName = new Map<string, string>();

  for (const user of USERS) {
    const created = await prisma.user.create({ data: user });
    usersByName.set(user.username, created.id);
  }
  console.log(`  created ${USERS.length} users`);

  // Submissions, each with its criteria created in the same call.
  const submissionsByKey = new Map<
    string,
    { id: string; ageHours: number; criteria: Map<string, string> }
  >();

  for (const item of SUBMISSIONS) {
    const authorId = usersByName.get(item.author);

    if (!authorId) {
      throw new Error(`Submission "${item.key}" names an author who does not exist: ${item.author}`);
    }

    const created = await prisma.submission.create({
      data: {
        title: item.title,
        description: item.description,
        repoUrl: item.repoUrl,
        tags: item.tags,
        authorId,
        createdAt: hoursAgo(item.ageHours),
        updatedAt: hoursAgo(item.ageHours),
        criteria: {
          create: item.criteria.map((label, index) => ({ label, position: index })),
        },
      },
      include: { criteria: true },
    });

    submissionsByKey.set(item.key, {
      id: created.id,
      ageHours: item.ageHours,
      criteria: new Map(created.criteria.map((c) => [c.label, c.id])),
    });
  }
  console.log(`  created ${SUBMISSIONS.length} submissions with their criteria`);

  // Reviews, each with one rating per criterion.
  for (const review of REVIEWS) {
    const submission = submissionsByKey.get(review.submission);
    const reviewerId = usersByName.get(review.reviewer);

    if (!submission) {
      throw new Error(`Review points at a submission that does not exist: ${review.submission}`);
    }

    if (!reviewerId) {
      throw new Error(`Review names a reviewer who does not exist: ${review.reviewer}`);
    }

    // Same rule the API enforces: every criterion on the submission must be scored,
    // and nothing else may be. Catching it here means bad demo data cannot sneak in.
    const expected = [...submission.criteria.keys()].sort();
    const given = Object.keys(review.scores).sort();

    if (expected.join("|") !== given.join("|")) {
      throw new Error(
        `Review on "${review.submission}" scores [${given}] but that submission has criteria [${expected}]`
      );
    }

    // A review cannot exist before the thing it reviews. A bigger ageHours here than on
    // the submission means exactly that, so it is caught while seeding rather than
    // showing up as a nonsense date on a profile during the demo.
    if (review.ageHours >= submission.ageHours) {
      throw new Error(
        `Review on "${review.submission}" is ${review.ageHours}h old but the submission is only ${submission.ageHours}h old`
      );
    }

    await prisma.review.create({
      data: {
        submissionId: submission.id,
        reviewerId,
        strengths: review.strengths,
        improvements: review.improvements,
        resources: review.resources,
        // Only createdAt. Review has no updatedAt column, unlike Submission, because a
        // review is never edited once it is written.
        createdAt: hoursAgo(review.ageHours),
        ratings: {
          create: Object.entries(review.scores).map(([label, score]) => ({
            score,
            criterionId: submission.criteria.get(label)!,
          })),
        },
      },
    });
  }
  console.log(`  created ${REVIEWS.length} reviews with their ratings`);

  // Karma is not typed in by hand. It is counted, so the demo data obeys the same
  // rule as the real site: exactly 2 points per review written, and nothing else.
  for (const [username, id] of usersByName) {
    const written = await prisma.review.count({ where: { reviewerId: id } });
    await prisma.user.update({ where: { id }, data: { karma: written * 2 } });
    console.log(`  ${username.padEnd(15)} ${written} reviews written, ${written * 2} karma`);
  }

  const pending = await prisma.submission.count({ where: { reviews: { none: {} } } });
  console.log(`\nDone. ${pending} submissions have no reviews yet, so they show as Pending.`);
}

main()
  .catch((error) => {
    console.error("\nSeeding failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
