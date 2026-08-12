import winston from "winston";

// Why not console.log.
//
// console.log writes straight to the terminal and blocks while it does. It has no
// levels, so you cannot ask for errors only. It has no timestamps. And on a deployed
// server there is no terminal to read, so the output goes nowhere useful.
//
// Winston gives us levels, timestamps, and different behaviour in development and
// production, all from one place.

const isProduction = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  // In development show everything. In production, info and above, so the logs stay
  // readable and we are not paying to store debug noise.
  level: isProduction ? "info" : "debug",

  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    isProduction
      ? // Machine readable, so a hosting platform can search and filter it.
        winston.format.json()
      : // Human readable and coloured, for our own terminals.
        winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} ${level}: ${stack ?? message}`;
          })
        )
  ),

  transports: [new winston.transports.Console()],
});
