// How Clerk's sign in and sign up forms are dressed to look like the rest of the site.
//
// Clerk renders the form itself, which is the point: we never touch a password, a
// verification email or a reset link. What we control is how it looks. Every value
// below is a Tailwind class from our own theme, so these forms follow light and dark
// mode automatically without a second copy.
//
// The alternative would be building the forms ourselves with Clerk's lower level API,
// which means hand writing password reset and email verification flows. That is a lot
// of security critical code to own for a visual change.

export const clerkAppearance = {
  /*
   * Colours go through `variables` rather than Tailwind classes.
   *
   * Clerk injects its own styles at runtime and they beat a plain utility class, so
   * `bg-primary` on the submit button was being ignored and the button stayed grey.
   * `variables` is the supported way in: Clerk builds its whole palette from these.
   *
   * They point at our CSS variables rather than hex codes, so light and dark mode
   * both work from one definition. Our teal is #0E7C74 in light and #3FBFB0 in dark,
   * and a hard coded hex would be wrong in one of them.
   */
  variables: {
    colorPrimary: "var(--primary)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorBackground: "var(--card)",
    colorInputBackground: "transparent",
    colorInputText: "var(--foreground)",
    colorNeutral: "var(--foreground)",
    colorDanger: "var(--destructive)",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-sans)",
    fontSize: "13.5px",
  },

  // Turn off Clerk's own shadows and borders so ours are the only ones.
  layout: {
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
    showOptionalFields: true,
  },

  elements: {
    // The outer wrapper and the card. cardBox is the newer name, card the older one,
    // and setting both means this keeps working across Clerk updates.
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-0",
    card: "w-full bg-card border border-border rounded-[var(--radius)] shadow-none p-5! sm:p-6!",

    /*
     * Clerk's own heading is kept and restyled, not hidden.
     *
     * It was hidden for a while, to save height and because our pages carried a line
     * of their own above the card. That was a mistake: Clerk's heading is the only
     * thing on the screen that says plainly whether you are signing in or signing up,
     * and without it the two pages looked identical. The line above the card went
     * instead, which is also the cheaper of the two in height.
     */
    header: "text-center gap-1",
    headerTitle: "text-[19px] font-semibold tracking-tight text-foreground",
    headerSubtitle: "text-[13px] text-muted-foreground",

    // GitHub and Google buttons.
    socialButtonsBlockButton:
      "border border-input bg-transparent text-foreground rounded-lg h-10 " +
      "hover:border-primary hover:bg-accent transition-colors",
    socialButtonsBlockButtonText: "text-[13.5px] font-medium",

    dividerLine: "bg-border",
    dividerText: "text-[11px] uppercase tracking-wide text-muted-foreground font-mono",

    formFieldLabel: "text-[12.5px] font-semibold text-foreground",
    formFieldInput:
      "rounded-lg border border-input bg-transparent text-[13.5px] h-10 " +
      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",

    // "Forgot password?" sits beside the password label. Clerk only shows it once you
    // have entered an email, because the form asks one thing at a time.
    formFieldAction: "text-[12px] text-primary hover:underline",

    // No bg- class here on purpose: the colour comes from variables.colorPrimary
    // above, which Clerk applies with its own styles and therefore actually wins.
    formButtonPrimary:
      "rounded-lg h-10 text-[13.5px] font-semibold normal-case tracking-normal " +
      "hover:opacity-90 transition-opacity",

    footerActionText: "text-[13px] text-muted-foreground",
    footerActionLink: "text-[13px] font-semibold text-primary hover:underline",

    identityPreviewText: "text-[13px]",
    identityPreviewEditButton: "text-primary",

    formResendCodeLink: "text-primary",
    otpCodeFieldInput: "border border-input rounded-lg",

    // Clerk's own footer badge. Kept, because hiding it is against their terms on the
    // free plan, but toned down so it does not compete with our own content.
    footer: "bg-transparent",

  },
};
