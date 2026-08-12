"use client";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * Switches between light and dark.
 *
 * There is no React state here on purpose. The server cannot know which theme the
 * visitor prefers, so anything stored in state would differ between the server and the
 * browser and React would complain about a hydration mismatch.
 *
 * Instead both icons are always rendered and CSS decides which one is visible, using the
 * class next-themes puts on the html element. CSS runs after the HTML arrives, so there
 * is nothing for React to disagree about.
 *
 * The click reads that same class straight from the document, which is always accurate
 * because a click can only happen once the page is running.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();

  function toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-9"
      onClick={toggle}
      aria-label="Switch between light and dark mode"
      title="Switch between light and dark mode"
    >
      <span className="dark:hidden">☽</span>
      <span className="hidden dark:inline">☀</span>
    </Button>
  );
}
