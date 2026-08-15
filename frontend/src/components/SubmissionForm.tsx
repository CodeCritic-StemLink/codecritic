"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  ListChecks,
  MessageSquareText,
  RotateCcw,
  Tags,
  Target,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createSubmission } from "@/services/submission.service";
import { ApiError } from "@/api/api";

// The post-a-request form, as a 4-step wizard, with a tips sidebar alongside it.
//
// The wizard keeps each step short enough to fit on a phone without scrolling. The
// sidebar fills the horizontal space that opens up on a wide screen, so the page reads
// as a proper two-column layout instead of one narrow form floating in the middle of
// a lot of empty white space. On a small screen the sidebar drops below the form,
// since there is no room for two columns there.
//
// Every rule shown in the form is a courtesy. The real validation is server side in
// POST /submissions, and a mentor calling the API directly with none of this will hit
// the same errors.

const MAX_TAGS = 10;
const MAX_CRITERIA = 5;

const STEPS = ["Basics", "Tags", "Criteria", "Review"] as const;
type Step = 0 | 1 | 2 | 3;

const EMPTY_STATE = {
  title: "",
  description: "",
  repoUrl: "",
  tagDraft: "",
  tags: [] as string[],
  criterionDraft: "",
  criteria: [] as string[],
};

/**
 * One tip per idea, each tied to the wizard step it is most useful on. `step: null`
 * means it applies everywhere, so it never gets the highlight treatment.
 */
const TIPS = [
  {
    step: 0 as Step,
    Icon: Target,
    title: "Name the real problem",
    body: "A title like \"React dashboard that re-renders too often\" tells a reviewer exactly what to look at. \"My project\" does not.",
  },
  {
    step: 0 as Step,
    Icon: MessageSquareText,
    title: "Say what feedback you want",
    body: "Mention what you already suspect is wrong, or what you have not been able to figure out. Reviewers spend less time guessing and more time helping.",
  },
  {
    step: 0 as Step,
    Icon: Link2,
    title: "Link the exact repo",
    body: "Make sure the URL points at the branch you actually want reviewed, not a fork or an older version.",
  },
  {
    step: 1 as Step,
    Icon: Tags,
    title: "Tag your real stack",
    body: "Tags are how the feed matches your request to reviewers who know that technology. A tag that is not accurate just means the wrong people see it.",
  },
  {
    step: 2 as Step,
    Icon: ListChecks,
    title: "Keep criteria specific",
    body: "\"Code Quality\" and \"Performance\" are easier to rate honestly than one broad \"Everything\" criterion. Fewer, sharper criteria get better ratings.",
  },
];

export function SubmissionForm() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const [step, setStep] = useState<Step>(0);

  const [title, setTitle] = useState(EMPTY_STATE.title);
  const [description, setDescription] = useState(EMPTY_STATE.description);
  const [repoUrl, setRepoUrl] = useState(EMPTY_STATE.repoUrl);
  const [tagDraft, setTagDraft] = useState(EMPTY_STATE.tagDraft);
  const [tags, setTags] = useState<string[]>(EMPTY_STATE.tags);
  const [criterionDraft, setCriterionDraft] = useState(EMPTY_STATE.criterionDraft);
  const [criteria, setCriteria] = useState<string[]>(EMPTY_STATE.criteria);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle(EMPTY_STATE.title);
    setDescription(EMPTY_STATE.description);
    setRepoUrl(EMPTY_STATE.repoUrl);
    setTagDraft(EMPTY_STATE.tagDraft);
    setTags(EMPTY_STATE.tags);
    setCriterionDraft(EMPTY_STATE.criterionDraft);
    setCriteria(EMPTY_STATE.criteria);
    setError(null);
    setStep(0);
  }

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

  const basicsValid =
    title.trim().length > 0 && description.trim().length > 0 && repoUrl.trim().length > 0;
  const tagsValid = tags.length > 0;
  const criteriaValid = criteria.length > 0;
  const canSubmit = basicsValid && tagsValid && criteriaValid && !submitting;

  // A step is reachable from the indicator only once every step before it is valid,
  // so jumping ahead can never land on a step that assumes data which is not there yet.
  function stepIsUnlocked(target: Step): boolean {
    if (target <= step) return true;
    if (target === 1) return basicsValid;
    if (target === 2) return basicsValid && tagsValid;
    if (target === 3) return basicsValid && tagsValid && criteriaValid;
    return false;
  }

  function goNext() {
    if (step === 0 && !basicsValid) return;
    if (step === 1 && !tagsValid) return;
    if (step === 2 && !criteriaValid) return;
    setStep((current) => Math.min(3, current + 1) as Step);
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1) as Step);
  }

  async function handleSubmit() {
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
    return <div className="mx-auto w-full max-w-5xl px-6 py-16" />;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <Link
          href="/"
          className="mb-4 flex items-center gap-1 text-[13px] text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to feed
        </Link>
        <h1 className="text-xl font-semibold">Sign in first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an account before you can post a review request.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to feed
        </Link>

        <button
          type="button"
          onClick={resetForm}
          className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-destructive"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </button>
      </div>

      <h1 className="text-[21px] font-semibold tracking-tight">Post a review request</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        Tell reviewers what you built and what you want them to review.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* Step indicator. Numbers only under sm, numbers plus labels from sm up. */}
          <ol className="flex items-center gap-1.5">
            {STEPS.map((label, index) => {
              const asStep = index as Step;
              const isCurrent = asStep === step;
              const isDone = asStep < step;
              const unlocked = stepIsUnlocked(asStep);

              return (
                <li key={label} className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setStep(asStep)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium transition-colors disabled:cursor-not-allowed",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isDone
                          ? "text-primary hover:bg-accent"
                          : "text-muted-foreground",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10.5px]",
                        isCurrent
                          ? "bg-primary-foreground text-primary"
                          : isDone
                            ? "bg-primary text-primary-foreground"
                            : "border border-current",
                      ].join(" ")}
                    >
                      {isDone ? <Check className="size-3" aria-hidden /> : index + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>

                  {index < STEPS.length - 1 ? (
                    <span
                      className={`h-px flex-1 ${asStep < step ? "bg-primary" : "bg-border"}`}
                      aria-hidden
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-5 min-h-[280px] rounded-[var(--radius)] border bg-card p-5">
            {step === 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="title" className="mb-1.5 block text-[12.5px] font-semibold">
                    Title
                  </label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="React dashboard that re-renders too often"
                    maxLength={120}
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-1.5 block text-[12.5px] font-semibold"
                  >
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does it do? What feedback are you after?"
                    maxLength={5000}
                    rows={4}
                  />
                </div>

                <div>
                  <label
                    htmlFor="repoUrl"
                    className="mb-1.5 block text-[12.5px] font-semibold"
                  >
                    Repository URL
                  </label>
                  <Input
                    id="repoUrl"
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/you/project"
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <label
                  htmlFor="tag-draft"
                  className="mb-1.5 block text-[12.5px] font-semibold"
                >
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
                    autoFocus
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

                <div className="mt-3 flex min-h-[32px] flex-wrap gap-1.5">
                  {tags.length === 0 ? (
                    <p className="text-[12.5px] text-muted-foreground">
                      No tags yet. Add at least one.
                    </p>
                  ) : (
                    tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 font-mono text-[11px]"
                      >
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
                    ))
                  )}
                </div>

                <p className="mt-3 text-[12px] text-muted-foreground">
                  These are what the feed matches against a reviewer&apos;s tech stack.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <label
                  htmlFor="criterion-draft"
                  className="mb-1.5 block text-[12.5px] font-semibold"
                >
                  What should reviewers rate?{" "}
                  <span className="font-normal text-muted-foreground">
                    {criteria.length} of {MAX_CRITERIA}
                  </span>
                </label>

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
                    autoFocus
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

                <div className="mt-3 min-h-[32px]">
                  {criteria.length === 0 ? (
                    <p className="text-[12.5px] text-muted-foreground">
                      No criteria yet. Add at least one.
                    </p>
                  ) : (
                    <ol className="flex flex-col gap-1.5">
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
                </div>

                <p className="mt-3 text-[12px] text-muted-foreground">
                  Between 1 and 5. Each reviewer scores every one of these out of 10.
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[12px] font-semibold text-muted-foreground">Title</p>
                  <p className="mt-0.5 text-[14px]">{title}</p>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-[13.5px] text-foreground/90">
                    {description}
                  </p>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    Repository
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[13px]">{repoUrl}</p>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-muted-foreground">Tags</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="font-mono text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-muted-foreground">Criteria</p>
                  <ol className="mt-1 flex flex-col gap-1">
                    {criteria.map((label, index) => (
                      <li key={`${label}-${index}`} className="text-[13px]">
                        <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                          {index + 1}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ol>
                </div>

                {error ? (
                  <p className="rounded-md border border-destructive px-3 py-2 text-[13px] text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 0}
              className="gap-1"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={
                  (step === 0 && !basicsValid) ||
                  (step === 1 && !tagsValid) ||
                  (step === 2 && !criteriaValid)
                }
                className="gap-1"
              >
                Next
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? "Posting" : "Post request"}
              </Button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[var(--radius)] border border-primary/15 bg-primary/[0.04] p-5">
            <p className="text-[13px] font-semibold text-foreground">Tips and guidelines</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              A request written this way gets clearer, faster feedback.
            </p>

            <ul className="mt-4 flex flex-col gap-3.5">
              {TIPS.map(({ step: tipStep, Icon, title: tipTitle, body }) => {
                const highlighted = tipStep === step;

                return (
                  <li
                    key={tipTitle}
                    className={[
                      "rounded-lg border p-3 transition-colors",
                      highlighted
                        ? "border-primary/30 bg-card"
                        : "border-transparent bg-transparent",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={[
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                          highlighted
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary",
                        ].join(" ")}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-foreground">
                          {tipTitle}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          {body}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}