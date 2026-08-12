"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { syncProfile } from "@/services/user.service";
import { ApiError } from "@/api/api";

// Finish setting up your profile.
//
// This page is what turns "signed in to Clerk" into "exists in our database". Until it
// runs, the feed cannot sort for you, because it does not know a single technology you
// work with.
//
// It is a client component because it holds what you are typing and calls the API when
// you press the button. Everything else in this app stays a server component.

/** Suggested technologies. Clicking one adds it, nobody has to type them all. */
const SUGGESTIONS = [
  "React",
  "Next.js",
  "Tailwind",
  "TypeScript",
  "Node",
  "Express",
  "Prisma",
  "PostgreSQL",
  "Python",
  "Django",
  "Rust",
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTech(tech: string) {
    setTechStack((current) =>
      current.includes(tech) ? current.filter((t) => t !== tech) : [...current, tech]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // The token proves to the API who we are. Without it the request is refused.
      const token = await getToken();

      if (!token) {
        setError("You are not signed in. Sign in and try again.");
        return;
      }

      await syncProfile(
        {
          username: username.trim(),
          bio: bio.trim() || undefined,
          techStack,
          githubUrl: githubUrl.trim() || undefined,
        },
        token
      );

      // refresh() makes the server render the feed again, this time knowing who we are.
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not save your profile. Is the API running?"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded) {
    return <main className="mx-auto w-full max-w-xl px-6 py-16" />;
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16">
        <h1 className="text-xl font-semibold">Sign in first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an account before you can set up a profile.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="text-[21px] font-semibold tracking-tight">Finish your profile</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        The technologies you pick are what the feed uses to sort requests for you.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-[var(--radius)] border bg-card p-5">
        <div className="mb-4">
          <label htmlFor="username" className="mb-1.5 block text-[12.5px] font-semibold">
            Username
          </label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="osini_dev"
            required
            minLength={3}
            maxLength={30}
          />
          <p className="mt-1 text-[12px] text-muted-foreground">
            Letters, numbers and underscores. This becomes your profile address.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="bio" className="mb-1.5 block text-[12.5px] font-semibold">
            Bio <span className="font-normal text-muted-foreground">optional</span>
          </label>
          <Input
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Full stack, one week deep."
            maxLength={500}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="github" className="mb-1.5 block text-[12.5px] font-semibold">
            GitHub <span className="font-normal text-muted-foreground">optional</span>
          </label>
          <Input
            id="github"
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/you"
          />
        </div>

        <div className="mb-5">
          <p className="mb-1.5 text-[12.5px] font-semibold">
            What do you work with?{" "}
            <span className="font-normal text-muted-foreground">
              {techStack.length} selected
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((tech) => {
              const on = techStack.includes(tech);

              return (
                <button key={tech} type="button" onClick={() => toggleTech(tech)}>
                  <Badge
                    variant={on ? "default" : "outline"}
                    className={on ? "font-mono text-[11px]" : "font-mono text-[11px] text-muted-foreground"}
                  >
                    {tech}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-destructive px-3 py-2 text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={saving || username.trim().length < 3} className="w-full">
          {saving ? "Saving" : "Save and see my feed"}
        </Button>
      </form>
    </main>
  );
}
