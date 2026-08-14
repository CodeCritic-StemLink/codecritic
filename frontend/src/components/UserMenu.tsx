import { UserButton } from "@clerk/nextjs";

// The avatar menu: Clerk's own, sized to sit beside the navigation bar.
//
// There was briefly a confirming Sign out here, so a misclick could not throw away a
// half written review. It was removed, and the reason is worth recording so nobody
// spends the afternoon rebuilding it.
//
// UserButton.MenuItems adds to Clerk's default menu rather than replacing it, so a
// custom Sign out sat underneath Clerk's own and the menu offered the same action
// twice. Hiding the default with the documented appearance key
// (userButtonPopoverActionButton__signOut) did not match either, because Clerk's menu
// is rendered by their script from their CDN and its internal names are not the ones
// the appearance API exposes here.
//
// Two Sign out rows is a worse problem than no confirmation, so the default stands
// alone. If the confirmation is ever wanted again, the honest way is our own menu
// built on the useClerk() signOut function rather than fighting this component.
//
// A server component, unlike most Clerk pieces: it takes no props that need the
// browser and renders inside the navigation bar, which is itself rendered on the
// server.

export function UserMenu() {
  return <UserButton appearance={{ elements: { userButtonAvatarBox: "size-[30px]" } }} />;
}
