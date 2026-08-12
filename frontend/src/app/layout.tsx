import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
        <body className="flex min-h-full flex-col bg-background text-foreground">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <header className="border-b bg-card">
              <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3">
                <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-primary font-mono text-[12px] text-primary-foreground">
                    C
                  </span>
                  CodeCritic
                </Link>

                <nav className="flex items-center gap-2">
                  <ThemeToggle />

                  {/* Shown only to visitors who are not signed in. */}
                  <Show when="signed-out">
                    <SignInButton />
                    <SignUpButton />
                  </Show>

                  {/* Shown only to signed in users. */}
                  <Show when="signed-in">
                    <UserButton />
                  </Show>
                </nav>
              </div>
            </header>

            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
