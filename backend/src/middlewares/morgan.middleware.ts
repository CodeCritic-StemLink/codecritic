import morgan from "morgan";

import { logger } from "../config/logger";

// Logs one line for every request that reaches the API.
//
// Morgan does the watching, winston does the writing, so HTTP traffic ends up in the
// same place as everything else we log rather than in a separate stream of console
// output with no timestamps.

const isProduction = process.env.NODE_ENV === "production";

export const morganMiddleware = morgan(
  // "dev" is short and coloured, good for a terminal you are watching.
  // "combined" is the standard full format, good for a deployed server.
  isProduction ? "combined" : "dev",
  {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }
);
