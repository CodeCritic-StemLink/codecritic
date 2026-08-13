"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createSubmission } from "@/services/submission.service";
import { ApiError } from "@/api/api";

// The post-a-request form.
//
// Mirrors the shape of profile/setup/page.tsx: a client component holding what you
// typed, which calls one service function on submit. Every rule here is a courtesy —
// the real validation is server side in POST /submissions, and a mentor calling the
// API directly with none of this will hit the same errors.
//
// Criteria are limited to 1-5 and tags to 1-10 in the input itself as well as on
// submit, because the API rejects anything outside that range with
// INVALID_CRITERIA / INVALID_TAGS.

const MAX_TAGS = 10;
const MAX_CRITERIA = 5;

export function SubmissionForm() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [criterionDraft, setCriterionDraft] = useState("");
  const [criteria, setCriteria] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const value = tagDraft.trim();
    if (!value || tags.length >= MAX_TAGS || tags.includes(value)) return;
    setTags((current) => [...current, value]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((t) => t !== tag));
  }

  function addCriterion() {
    const value = criterionDraft.trim();
    if (!value || criteria.length >= MAX_CRITERIA) return;
    setCriteria((current) => [...current, value]);
    setCriterionDraft("");
  }

  function removeCriterion(index: number) {
    setCriteria((current) => current.filter((_, i) => i !== index));
  }

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    repoUrl.trim().length > 0 &&
    tags.length > 0 &&
    criteria.length > 0 &&
    !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const token = await getToken();

      if (!token) {
        setError("You are not signed in. Sign in and try again.");
        return;
      }

      const created = await createSubmission(
        {
          title: title.trim(),
          description: description.trim(),
          repoUrl: repoUrl.trim(),
          tags,
          criteria,
        },
        token
      );

      // Straight to the new request's own page, the same pattern profile setup uses
      // to land you on the freshly created thing rather than back on a blank form.
      router.push(`/submissions/${created.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not post your request. Is the API running?"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return <div className="mx-auto w-full max-w-xl px-6 py-16" />;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <h1 className="text-xl font-semibold">Sign in first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an account before you can post a review request.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="text-[21px] font-semibold tracking-tight">Post a review request</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        Tell reviewers what you built and what you want them to look at.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-[var(--radius)] border bg-card p-5">
        <div className="mb-4">
          <label htmlFor="title" className="mb-1.5 block text-[12.5px] font-semibold">
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="React dashboard that re-renders too often"
            required
            maxLength={120}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="mb-1.5 block text-[12.5px] font-semibold">
            Description
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does it do, and what feedback are you after?"
            required
            maxLength={5000}
            rows={5}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="repoUrl" className="mb-1.5 block text-[12.5px] font-semibold">
            Repository URL
          </label>
          <Input
            id="repoUrl"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/you/project"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="tag-draft" className="mb-1.5 block text-[12.5px] font-semibold">
            Tags{" "}
            <span className="font-normal text-muted-foreground">
              {tags.length} of {MAX_TAGS}
            </span>
          </label>
          <div className="flex gap-1.5">
            <Input
              id="tag-draft"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="React"
              disabled={tags.length >= MAX_TAGS}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={!tagDraft.trim() || tags.length >= MAX_TAGS}
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 font-mono text-[11px]">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove ${tag}`}
                    className="ml-0.5 rounded-full hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-1 text-[12px] text-muted-foreground">
            At least one. These are what the feed matches against a reviewer&apos;s tech stack.
          </p>
        </div>

        <div className="mb-5">
          <label htmlFor="criterion-draft" className="mb-1.5 block text-[12.5px] font-semibold">
            What should reviewers rate?{" "}
            <span className="font-normal text-muted-foreground">
              {criteria.length} of {MAX_CRITERIA}
            </span>
          </label>

          {criteria.length > 0 && (
            <ol className="mb-2 flex flex-col gap-1.5">
              {criteria.map((label, index) => (
                <li
                  key={`${label}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-input px-2.5 py-1.5"
                >
                  <span className="text-[13px]">
                    <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                      {index + 1}
                    </span>
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCriterion(index)}
                    aria-label={`Remove ${label}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div className="flex gap-1.5">
            <Input
              id="criterion-draft"
              value={criterionDraft}
              onChange={(e) => setCriterionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCriterion();
                }
              }}
              placeholder="Code Quality"
              disabled={criteria.length >= MAX_CRITERIA}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCriterion}
              disabled={!criterionDraft.trim() || criteria.length >= MAX_CRITERIA}
            >
              Add
            </Button>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Between 1 and 5. Each reviewer scores every one of these out of 10.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-destructive px-3 py-2 text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {submitting ? "Posting" : "Post request"}
        </Button>
      </form>
    </div>
  );
}