import { Router } from "express";

import { userController } from "../controllers/user.controller";
import { catchAsync } from "../utils/catchAsync";
import { writeLimiter } from "../middlewares/rateLimiter.middleware";

// Routes map a path to a controller and nothing more. No logic lives here.
//
// catchAsync wraps every async handler. Without it an error thrown inside an async
// function never reaches the error middleware and the request hangs forever.

export const userRoutes = Router();

/** Create or update our User row from the Clerk identity. Called after a sign in. */
userRoutes.post("/sync", writeLimiter, catchAsync(userController.sync));

/**
 * Edit your own profile.
 *
 * There is deliberately no id in this path. No route in this API can be aimed at
 * somebody else's row, which is the simplest possible answer to the SRS rule that a
 * user must not be able to edit another user's profile.
 */
userRoutes.patch("/me", writeLimiter, catchAsync(userController.updateMe));

/**
 * Your own row: username, karma, tech stack. What the navbar needs for the karma chip
 * and avatar. Registered before /:username, because both are GET and a literal /me
 * has to match this route rather than being swallowed by the :username pattern.
 */
userRoutes.get("/me", catchAsync(userController.getMe));

/**
 * Public profile with insights. Feature 02.
 *
 * No auth required, and no writeLimiter: this only reads.
 */
userRoutes.get("/:username", catchAsync(userController.getByUsername));
