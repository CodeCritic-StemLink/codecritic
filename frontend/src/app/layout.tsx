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
        <body className="flex min-h-full flex-col bg-background text-foreground">
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
