"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Loader2, Plus, RotateCw, Sparkles, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/PageShell";
import { BackLink } from "@/components/BackLink";
import { getMe, syncProfile, updateProfile } from "@/services/user.service";
import { ApiError } from "@/api/api";
import { normaliseTag } from "@/lib/tags";
import { canSaveProfile, classifyProfileLoadFailure } from "@/lib/profileLoad";
import type { ProfileLoadState } from "@/lib/profileLoad";

// Finish setting up your profile.
//
// This page is what turns "signed in to Clerk" into "exists in our database". Until it
// runs, the feed cannot sort for you, because it does not know a single technology you
// work with.
//
// It is a client component because it holds what you are typing and calls the API when
// you press the button. Everything else in this app stays a server component.
//
// It doubles as the edit form for somebody who already has a profile, which is why it
// loads the existing one first. Without that it was a trap: POST /users/sync upserts,
// so a returning visitor who opened this URL and submitted would have overwritten
// their bio, tech stack and GitHub link with the blank fields they were shown. Karma
// and submissions were never at risk, because the upsert does not touch them.
//
// The layout is two columns from lg up: the form, and a narrower column explaining what
// the answers are used for. It was a single centred card, which on a wide monitor was a
// narrow strip of form stranded in the middle of an empty page. The short fields sit two
// or three across inside the form rather than in one tall stack, so the card is as wide
// as the page without any single input being absurdly long.

/**
 * Suggested technologies. Clicking one adds it.
 *
 * These are only shortcuts, not the list of what exists. Anything can be typed into
 * the box beside them, which matters: the post form has always let people tag a
 * request with any technology, so a fixed list here meant somebody could post a Vue
 * request that no reader could ever match, because no reader could say they knew Vue.
 *
 * They also keep spelling consistent. Everything is compared without case, but a feed
 * full of "node", "Node" and "NodeJS" is still harder to read than one that is not.
 */
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

/** The same ceiling the API enforces in models/user.schema.ts. */
const MAX_TECH = 20;

/*
 * What we know about the profile this person already has.
 *
 * Four states, not a boolean, and the fourth is the whole point:
 *
 *   loading      we have not asked yet, or the answer has not come back
 *   new          asked, and there is genuinely no profile yet
 *   existing     asked, and here it is, already in the form
 *   unavailable  we asked and could not find out
 *
 * "unavailable" used to be folded into "new", and that was a data loss bug. If the API
 * was restarting when this page opened, the request failed, the form decided there was
 * no profile, and showed empty fields under the heading "Finish your profile". Filling
 * them in and saving then wrote those blanks over a real bio and a real tech stack,
 * through a sync that writes every column it is given.
 *
 * From the outside it looked exactly like the site had forgotten the profile. It had
 * not: the row was intact until the save flattened it.
 *
 * The decision itself lives in lib/profileLoad.ts so it can be tested without rendering
 * this page. See tests/lib/profileLoad.test.ts.
 */

export default function ProfileSetupPage() {
  const router = useRouter();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded } = useUser();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techDraft, setTechDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadState, setLoadState] = useState<ProfileLoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * Load the profile this person already has, if any, and put it in the form.
   *
   * A USER_NOT_FOUND is the normal first time case, not a failure: the Clerk account
   * exists but POST /users/sync has never run, so there is no row yet. Every other
   * failure means we do not know, which is a different answer and is treated as one.
   */
  useEffect(() => {
    // Clerk hands back getToken before it has a session, and calling it too early
    // returns null. This effect used to give up silently at that point and never run
    // again, because getToken never changes, so the form stayed blank for somebody who
    // had a perfectly good profile sitting in the database.
    if (!authLoaded) return;

    let cancelled = false;

    async function loadExisting() {
      try {
        const token = await getToken();

        if (!token) {
          if (!cancelled) setLoadState("unavailable");
          return;
        }

        const { user: mine } = await getMe(token);
        if (cancelled) return;

        setUsername(mine.username);
        setBio(mine.bio ?? "");
        setGithubUrl(mine.githubUrl ?? "");
        setTechStack(mine.techStack ?? []);
        setLoadState("existing");
      } catch (caught) {
        if (cancelled) return;

        // The only failure that means "there is no profile" is the API saying so. A
        // server that is down, restarting, or answering 500 means we do not know.
        setLoadState(classifyProfileLoadFailure(caught));
      }
    }

    void loadExisting();

    // Guards against setting state after the page has been navigated away from.
    return () => {
      cancelled = true;
    };
  }, [authLoaded, getToken, reloadKey]);

  /** Ask again, for the retry button on the "could not load" banner. */
  const retryLoad = useCallback(() => {
    setLoadState("loading");
    setReloadKey((key) => key + 1);
  }, []);

  /** Already on the list? Compared without case, so "node" cannot be added twice. */
  function alreadyPicked(tech: string): boolean {
    const wanted = normaliseTag(tech);

    return techStack.some((picked) => normaliseTag(picked) === wanted);
  }

  function addTech(tech: string) {
    const value = tech.trim();

    if (!value || alreadyPicked(value) || techStack.length >= MAX_TECH) return;

    setTechStack((current) => [...current, value]);
    setTechDraft("");
  }

  function removeTech(tech: string) {
    setTechStack((current) => current.filter((picked) => picked !== tech));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Refuse to save what we could not first read. This is the guard that stops a blank
    // form being written over a real profile during an API restart.
    if (!canSaveProfile(loadState)) {
      setError("Your profile has not loaded yet, so saving now could overwrite it. Try again.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // The token proves to the API who we are. Without it the request is refused.
      const token = await getToken();

      if (!token) {
        setError("You are not signed in. Sign in and try again.");
        return;
      }

      const values = {
        username: username.trim(),
        bio: bio.trim() || undefined,
        techStack,
        githubUrl: githubUrl.trim() || undefined,
      };

      /*
       * Two different endpoints, and the difference matters.
       *
       * sync creates the row and writes every column, which is right when there is no
       * row yet and nothing to lose. Once a profile exists it is an edit, so it goes
       * through PATCH /users/me, which only touches the fields it is sent and cannot
       * create anything.
       */
      if (loadState === "existing") {
        await updateProfile(values, token);
      } else {
        await syncProfile(values, token);
      }

      // Straight to the profile this form just wrote, so the change is visible rather
      // than something you have to go and check. refresh() makes the server render it
      // again rather than serving what it had cached before the save.
      router.push(`/profile/${values.username}`);
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
    return <PageShell />;
  }

  if (!user) {
    return (
      <PageShell>
        <BackLink />
        <div className="mx-auto mt-16 max-w-md text-center">
          <h1 className="text-xl font-semibold">Sign in first</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            You need an account before you can set up a profile.
          </p>
          <Link
            href="/sign-in"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Go to sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  const full = techStack.length >= MAX_TECH;
  const editing = loadState === "existing";

  // Nothing may be typed or saved until we know what is already there.
  const locked = loadState === "loading" || loadState === "unavailable";

  const heading =
    loadState === "loading"
      ? "Loading your profile"
      : editing
        ? "Edit your profile"
        : "Finish your profile";

  const subheading =
    loadState === "loading"
      ? "Fetching what you already have, so nothing gets written over."
      : loadState === "unavailable"
        ? "We could not read your existing profile, so this form is locked until we can."
        : editing
          ? "Change anything here and save. Your Karma and everything you have posted stay exactly as they are."
          : "This is what other developers see, and the technologies you pick are what the feed sorts around.";

  return (
    <PageShell>
      <BackLink />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[21px] font-semibold tracking-tight sm:text-[24px]">
            {loadState === "loading" ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
            {heading}
          </h1>
          <p className="mt-1 max-w-[60ch] text-[13.5px] leading-relaxed text-muted-foreground">
            {subheading}
          </p>
        </div>

        {editing ? (
          <Link
            href={`/profile/${username}`}
            className="text-[13px] text-muted-foreground transition-colors hover:text-primary"
          >
            View my profile
          </Link>
        ) : null}
      </div>

      {/*
        The banner that replaces the old data loss bug.
        Before this, a failure to read the existing profile was silently treated as "you
        have no profile": the form showed empty fields, and saving them overwrote a real
        bio and tech stack. Now it says so, and the form will not save.
      */}
      {loadState === "unavailable" ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-destructive bg-destructive/5 p-4"
        >
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="text-[13px] font-semibold text-destructive">
                Could not load your profile
              </p>
              <p className="mt-0.5 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
                The API did not answer, so we do not know what you already have. Nothing
                has been lost and nothing will be saved until it loads, because saving a
                blank form now would write over your real details.
              </p>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={retryLoad} className="shrink-0">
            <RotateCw className="size-3.5" aria-hidden />
            Try again
          </Button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <fieldset
            disabled={locked}
            className="rounded-[var(--radius)] border bg-card p-5 sm:p-6 disabled:opacity-60"
          >
            <legend className="px-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              About you
            </legend>

            {/* Three across on a wide screen, two on a tablet, one on a phone. These are
                all short answers, and one per row made the form far taller than the
                amount of typing in it. */}
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
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
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                  Letters, numbers and underscores. This becomes your profile address.
                </p>
              </div>

              <div>
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
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                  Shown as a link on your profile.
                </p>
              </div>

              <div className="sm:col-span-2 xl:col-span-1">
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
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                  One line about what you are working on.
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset
            disabled={locked}
            className="rounded-[var(--radius)] border bg-card p-5 sm:p-6 disabled:opacity-60"
          >
            <legend className="px-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              What you work with
            </legend>

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="tech-draft" className="text-[12.5px] font-semibold">
                Add a technology
              </label>
              <span className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
                {techStack.length} of {MAX_TECH}
              </span>
            </div>

            <div className="mt-1.5 flex gap-1.5">
              <Input
                id="tech-draft"
                value={techDraft}
                onChange={(e) => setTechDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter adds the technology rather than submitting the whole form,
                  // which is what an unguarded Enter in a text input does by default.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTech(techDraft);
                  }
                }}
                placeholder="Vue, Go, Flutter, anything"
                maxLength={40}
                disabled={full}
                className="max-w-md"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTech(techDraft)}
                disabled={!techDraft.trim() || full}
                className="shrink-0"
              >
                <Plus className="size-3.5" aria-hidden />
                Add
              </Button>
            </div>

            <p className="mt-3 mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Suggestions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((tech) => {
                const on = alreadyPicked(tech);

                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => (on ? removeTech(tech) : addTech(tech))}
                    disabled={!on && full}
                    className="disabled:opacity-40"
                  >
                    <Badge
                      variant={on ? "default" : "outline"}
                      className={
                        on
                          ? "font-mono text-[11px]"
                          : "font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      }
                    >
                      {tech}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Everything picked, including anything typed that is not a suggestion,
                so a typed technology is removable the same way a tapped one is. */}
            <div className="mt-4 border-t pt-3.5">
              <p className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                On your profile
              </p>

              {techStack.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">
                  Nothing picked yet. The feed will fall back to newest first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {techStack.map((tech) => (
                    <Badge key={tech} className="gap-1 font-mono text-[11px]">
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTech(tech)}
                        aria-label={`Remove ${tech}`}
                        className="ml-0.5 rounded-full transition-opacity hover:opacity-70"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {full ? (
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  That is the maximum of {MAX_TECH}. Remove one to add another.
                </p>
              ) : null}
            </div>
          </fieldset>

          {error ? (
            <p className="rounded-md border border-destructive px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={locked || saving || username.trim().length < 3}
              className="w-full sm:w-auto"
            >
              {saving ? "Saving" : editing ? "Save changes" : "Save and see my profile"}
            </Button>

            {locked ? (
              <span className="text-[12px] text-muted-foreground">
                {loadState === "loading"
                  ? "Waiting for your existing profile."
                  : "Saving is off until your profile loads."}
              </span>
            ) : username.trim().length < 3 ? (
              <span className="text-[12px] text-muted-foreground">
                A username of at least 3 characters is needed.
              </span>
            ) : null}
          </div>
        </form>

        <aside className="rounded-[var(--radius)] border border-primary bg-accent p-4 lg:sticky lg:top-6">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-foreground">
            <Sparkles className="size-3.5" aria-hidden />
            Why we ask
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-accent-foreground/80">
            The feed shows everybody the same requests, but it puts the ones you can
            actually help with first. It works that out by comparing the technologies here
            against the tags on each request.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-accent-foreground/80">
            Pick nothing and the feed still works, it just falls back to newest first.
            Turn on <span className="font-semibold">Why this order?</span> on the feed to
            see the points for yourself.
          </p>
          <p className="mt-2 border-t border-primary/30 pt-2 text-[12.5px] leading-relaxed text-accent-foreground/80">
            Saving again never touches your Karma, your requests or your reviews.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
