import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SubmissionForm } from "@/components/SubmissionForm";

// Posting a review request. Signed in only.
//
// The check runs here, on the server, before any HTML is sent. A signed out visitor
// used to reach this page and be told "Sign in first" with no link, which is a dead
// end: they could see the door but not the handle.
//
// redirectUrl carries where they were trying to go, so Clerk sends them back to this
// form after signing in rather than dumping them on the feed to find it again.
//
// This is convenience, not security. The real guard is POST /submissions answering 401
// without a valid token, which holds whether or not this page exists. Anyone can call
// the API directly and this check would never run.

export default async function NewSubmissionPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/submissions/new");
  }

  return <SubmissionForm />;
}
