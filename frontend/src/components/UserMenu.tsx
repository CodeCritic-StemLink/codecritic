"use client";

import { UserButton, useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

// The avatar menu, with one change to Clerk's default: signing out asks first.
//
// Why bother. Writing a review is the longest piece of typing on this site, and the
// avatar sits a few pixels from the theme toggle in the navigation bar. A misclick
// there signs you out and the half written review is gone, because nothing is saved
// until you press submit. One confirm is cheaper than losing that.
//
// UserButton.MenuItems replaces Clerk's default menu rather than adding to it, so the
// built in Sign out is gone and only ours remains. "manageAccount" is listed by name
// to keep Clerk's own account screen, which is where somebody changes their password.
//
// A client component because a confirm dialog and a click handler need the browser.

export function UserMenu() {
  const { signOut } = useClerk();

  return (
    <UserButton
      appearance={{ elements: { userButtonAvatarBox: "size-[30px]" } }}
      userProfileMode="modal"
    >
      <UserButton.MenuItems>
        {/* Clerk's own account screen: password, email, connected accounts. */}
        <UserButton.Action label="manageAccount" />

        <UserButton.Action
          label="Sign out"
          labelIcon={<LogOut className="size-4" />}
          onClick={() => {
            const leaving = window.confirm(
              "Sign out of CodeCritic? Anything you have typed and not submitted will be lost."
            );

            if (leaving) {
              // Back to the feed rather than the current page: half of the site is
              // signed in only, and landing on a page you can no longer see would be
              // a strange way to end.
              void signOut({ redirectUrl: "/" });
            }
          }}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
