---
name: setup-matt-pocock-skills
description: Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, domain doc layout, and verification commands. Run before first use of the other engineering skills, and again to check or update an existing setup.
disable-model-invocation: true
---

# Setup Matt Pocock's Skills

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker** — where issues live (GitHub by default; local markdown is also supported out of the box)
- **Triage labels** — the strings used for the five canonical triage roles
- **Domain docs** — where `CONTEXT.md` and ADRs live, and the consumer rules for reading them
- **Workflow** — how this repo verifies a change, and any standing exceptions

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

## Setting up, or checking what's there

Most repos this lands in aren't empty. They already have a test command, a habit for filing work, maybe an `AGENTS.md` someone wrote by hand. The job is to record what's already true and add the smallest thing on top — not to install a fresh opinion over a working repo.

Exploration tells you which run this is:

| What you find | What to do |
| --- | --- |
| No `docs/agents/` | **Set up** — the full process below |
| `docs/agents/` already there | **Check** — report the state, then offer to fix or update |
| The user asked to check, audit, or "see what you'd do" | **Check**, and write nothing |

Check is read-only until the user asks for a change. It's step 5 run on its own, and it's worth running after any change to how the repo tests or tracks work.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- `git remote -v` and `.git/config` — is this a GitHub repo? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root — does either exist? Is there already an `## Agent skills` section in either?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/` — does this skill's prior output already exist? If it does, this is a **Check**, not a fresh setup.
- `.scratch/` — sign that a local-markdown issue tracker convention is already in use
- How the repo verifies a change — `package.json` scripts, `Makefile`, `justfile`, `.github/workflows/`. Note the command strings verbatim; you'll record them, not invent them.
- Is the `triage` skill installed? (a `triage` skill folder alongside this one, or `triage` in your available skills.) This decides whether Section B runs at all.
- Monorepo signals — a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. Present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.

Keep track of **which findings you're actually confident about**. A `test` script in `package.json` is evidence. That it's the check everyone runs before calling something done is a guess, and so is the package manager that runs it. Ask about the guesses, or write them down marked as guesses — don't record them as fact.

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order — one section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip the section entirely when exploration already settled it (Section B when `triage` isn't installed, Section C when there's no monorepo).

**Section A — Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, and `to-spec` read from and write to it — they need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise (or if the user prefers), offer:

- **GitHub** — issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab** — issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown** — issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.) — ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off** — leave it off and don't raise it; a user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B — Triage label vocabulary.** Skip this section entirely if the `triage` skill isn't installed (exploration told you) — an uninstalled skill needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no — usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`) — collect the overrides so `triage` applies existing labels instead of creating duplicates.

**Section C — Domain docs.** Default to **single-context** — one `CONTEXT.md` + `docs/adr/` at the repo root. This fits almost every repo; write it without asking.

Offer **multi-context** — a root `CONTEXT-MAP.md` pointing to per-context `CONTEXT.md` files — only when exploration found monorepo signals. Then confirm which layout they want.

**Section D — Verification.** `implement` is told to "run typechecking regularly, single test files regularly, and the full test suite once at the end" — with nothing telling it what any of those are in this repo. Recording them is what turns that instruction into something to act on rather than guess at, once per session, from whatever `package.json` happens to look like.

Propose the commands exploration actually found, quoted, each with where it came from ("`pnpm test` — `package.json` scripts"). Ask which is the gate that has to pass before a change is done, and whether any is slow enough to be a final check rather than an inner-loop one.

When the repo renders a UI, also propose its **UI verification** rows, which `ui-engineering` and `ui-guard` read (how to run and stop the app for a browser check, the browser test command, viewports, themes, direction, and how to get past login for screenshots), from what exploration found, with the same sourcing rule.

If nothing runnable turned up, leave the section empty and say so. A wrong command is worse than a missing one: an agent that runs it, sees nothing fail, and reports a pass has verified nothing — and the report looks identical to a real one.

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to whichever of `CLAUDE.md` / `AGENTS.md` is being edited (see step 4 for selection rules)
- The contents of `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `docs/agents/workflow.md`, and `docs/agents/triage-labels.md` (the last only when `triage` is installed)

For anything that **already exists**, show a diff against what's there rather than the finished file on its own. The difference decides whether the user can see what they're agreeing to: a page of new content reads as fine, while a diff shows the two lines of theirs you were about to drop. Let them edit before writing.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create — don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa) — always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout — "single-context" or "multi-context"]. See `docs/agents/domain.md`.

### Workflow

[one-line summary of how a change is verified]. See `docs/agents/workflow.md`.
```

Include the `### Triage labels` sub-block, and write `docs/agents/triage-labels.md`, only when `triage` is installed and Section B ran. When it isn't, both are omitted.

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md) — GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md) — local-markdown issue tracker
- [triage-labels.md](./triage-labels.md) — label mapping (only if `triage` is installed)
- [domain.md](./domain.md) — domain doc consumer rules + layout
- [workflow.md](./workflow.md) — verification commands + standing exceptions

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description.

### 5. Check

Before telling the user it worked, confirm that it did. The failures here are quiet ones — a second `## Agent skills` block, a tracker CLI that isn't installed, an ADR path that doesn't resolve. None of them announce themselves; they surface later as a skill behaving oddly, a long way from the cause.

- Every file you said you'd write exists, and reads the way you intended
- The instruction file has exactly one `## Agent skills` block
- Paths referenced from those files resolve — the ADR directory, the `.scratch/` root, anything else you named
- The tracker's CLI is installed and authenticated: `gh auth status`, `glab auth status`. If it isn't, say so plainly — the configuration is still right, the tool just isn't ready yet.

Report what you checked and anything that came back wrong.

This is also the whole of a **Check** run: on a repo that's already set up, do these against what's there and report, without writing. Add one more, since the setup may predate the repo's current shape — do the recorded verification commands still exist in `package.json`, the `Makefile`, or CI? A command that was renamed six months ago is the most common way this configuration goes stale.

### 6. Done

Tell the user the setup is complete and which engineering skills will now read from these files. Mention they can edit `docs/agents/*.md` directly later, and that re-running this skill checks an existing setup rather than replacing it — so it's worth running again after the repo changes how it tests or tracks work.
