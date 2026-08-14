import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeCritic",
  description: "Post your project, get real feedback from other developers, and earn Karma.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // ClerkProvider wraps everything so any page can ask who is signed in.
    <ClerkProvider>
      <html
        lang="en"
        // The server cannot know which theme the visitor prefers, so next-themes sets it
        // in the browser. This tells React not to complain about that one difference.
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        {/*
          suppressHydrationWarning is here because browser extensions edit the body tag
          before React starts. Grammarly, for one, adds data-gr-ext-installed and
          data-new-gr-c-s-check-loaded, and React then complains that the HTML the
          server sent does not match what it found in the browser.

          Nothing is actually broken: the attributes are not ours, we cannot stop them
          being added, and they change nothing about the page. This tells React to
          ignore attribute differences on this one element only. It does not hide real
          mismatches anywhere else in the tree.
        */}
        <body
          suppressHydrationWarning
          className="flex min-h-full flex-col bg-background text-foreground"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Nav />

            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
