"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Wraps next-themes so the rest of the app does not import it directly.
//
// "use client" is here because switching themes reads and writes localStorage, which
// only exists in a browser. Everything else in this app stays a server component.

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
