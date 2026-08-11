import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
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
  description: "Peer code review platform. Post your project, get real feedback, earn Karma.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // ClerkProvider wraps the whole site so any page can ask who is signed in.
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="flex items-center justify-between border-b px-6 py-3">
            <span className="font-semibold">CodeCritic</span>

            <nav className="flex items-center gap-3">
              {/* Shown only to visitors who are not logged in. */}
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>

              {/* Shown only to logged in users. Opens the account menu. */}
              <Show when="signed-in">
                <UserButton />
              </Show>
            </nav>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
