"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * Switches between light and dark.
 *
 * The mounted check exists for a real reason. The server does not know which theme the
 * visitor prefers, so if we rendered the icon straight away the server and the browser
 * would disagree and React would complain about a hydration mismatch. Rendering an empty
 * button of the same size until the browser has caught up avoids that, and avoids the
 * layout jumping.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="sm" className="w-9" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-9"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☀" : "☽"}
    </Button>
  );
}
