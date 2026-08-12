import "dotenv/config";

import { app } from "./app";
import { logger } from "./config/logger";

// Starts the server. The only file that opens a port.
//
// Everything about the application itself lives in app.ts, so a test can import that
// without anything starting to listen.

// Stop now and say exactly what is missing, rather than letting every request fail
// later with a confusing 500. Clerk's middleware throws on every single request when
// its keys are absent, including the public feed, which is very hard to work out from
// the error alone.
const requiredEnv = ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  logger.error("Cannot start. These environment variables are missing:");
  for (const name of missingEnv) {
    logger.error(`  ${name}`);
  }
  logger.error("Add them to backend/.env. Ask Osini for the values.");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  logger.info(`CodeCritic API listening on http://localhost:${port}/api`);
});
