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

// ---------------------------------------------------------------------------
// GET /:username belongs to Aqeel. This is Feature 02.
//
// Add the route here, the rules in services/user.service.ts, and the queries in
// repositories/user.repository.ts. Keep prisma out of everything except the repository.
//
// The trap to watch: reviews received is NOT reviews where this person is the reviewer.
// It is reviews written on submissions this person wrote.
// ---------------------------------------------------------------------------
