/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],

  // Same choice as the back end: @swc/jest rather than ts-jest, because this project
  // is on TypeScript 7, which no longer exposes the Compiler API that ts-jest needs.
  // swc strips the types without checking them, which is fine here because
  // `npx tsc --noEmit` already does the checking as its own step.
  transform: {
    "^.+\\.ts$": "@swc/jest",
  },

  // Our source uses the @/ alias that tsconfig.json defines. Jest does not read
  // tsconfig, so the same mapping has to be repeated here or every import fails.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
