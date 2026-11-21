# skills-g-hub

Shared skills hub for coding agents (Claude Code, Codex, Antigravity, …): the software-development workflow and the skills it connects.

It holds two kinds of skills in one installable package:

- **Local** — skills written or adapted here, maintained here.
- **Vendored** — upstream skills copied in from other repos, refreshed on demand.

## Layout

`skills/<name>/SKILL.md` is each skill's entrypoint. References, assets, scripts
and optional agent metadata live within its folder.

| Area | Skills |
| --- | --- |
| Coordination and setup | hub-workflow, setup-matt-pocock-skills, delegate-setup |
| Planning and architecture | grill-me-code, wayfinder, to-spec, to-tickets, prototype, improve-codebase-architecture, codebase-design |
| Diagnosis and implementation | diagnosing-bugs, tdd, codex-delegate, claude-delegate, agy-delegate |
| Review | clean-code-guard, test-guard, docs-guard, wp-guard, woo-guard, debate-review |
| UI engineering | ui-engineering, ui-design-system, ui-guard, ui-e2e-tests ([guide](docs/ui-engineering.md)) |
| Supporting tools | frontend-design, research, handoff, resolving-merge-conflicts, writing-for-agents |
| Authoring | `templates/skill-template` (not installed as a skill) |

See [the workflow map and connection rules](docs/workflow.md) for routes,
conditions, setup, and the difference between guidance and automation.

- `vendor.json` / `vendor.lock.json`: upstream folders owned by the sync.
- `local-sources.json`: exact source pins for local adaptations; manual updates.
- `scripts/sync-vendor.sh`: refresh only vendor-owned folders.
- `tests/debate-review.test.mjs`: offline integration checks for the local reviewer.
- `tests/ui-audit.test.mjs`, `tests/ui-workflow.test.mjs`: the UI audit recorder, browser
  capture, UI skill structure and routing; fixtures under `tests/ui-workflow/`.

A folder not listed in `vendor.json` is never touched by the sync. The local
workflow layer connects unchanged vendored delegates and guards; it does not
modify installed agent copies.

## Install

```bash
npx skills add Hesham-14/skills-g-hub --global --agent claude-code --agent codex --agent antigravity-cli --skill '*' -y
```

`--agent` takes **one agent per flag** — a comma-separated list is rejected as invalid, and
the error prints the full roster of ~75 supported agents. Name the agents actually in use;
`--agent '*'` installs to every one of them.

The content lands once in `~/.agents/skills/`, the shared location Codex and Antigravity CLI
read directly. Claude Code gets symlinks into it from `~/.claude/skills/`, so all three read
one copy — but that copy is **independent of this repo**. Editing a skill here changes
nothing until the command is run again.

After installation, run `setup-matt-pocock-skills` in a project to write
`docs/agents/`: issue tracker, domain layout, and the repo's real verification
commands. It also writes a triage label vocabulary, but only when a `triage`
skill is installed alongside it, which this hub does not carry. Run it again
later and it checks the existing setup instead of replacing it, showing a diff
before touching any file that is already there. It does not install skills into
either runtime.

Before pushing, list local discovery without installing:

```bash
npx skills add . --list --full-depth
```

## Adding a skill

```bash
cp -R templates/skill-template skills/my-new-skill
mv skills/my-new-skill/SKILL.md.template skills/my-new-skill/SKILL.md
```

Then set `name:` in the frontmatter to `my-new-skill` (it must match the folder), and
write a `description:` precise enough that the agent knows when to fire it — including
a `DO NOT USE for …` clause. That description is the whole activation mechanism.

Keep `SKILL.md` short. Deep material goes in `references/*.md`, which the agent loads
only when the task calls for it.

## Updating vendored skills

```bash
./scripts/sync-vendor.sh --check      # what drifted, writes nothing
./scripts/sync-vendor.sh              # pull latest for every source
./scripts/sync-vendor.sh guard-skills # pull latest for one source
./scripts/sync-vendor.sh --yes        # accept the content audit without prompting
```

Before writing anything, the sync audits every upstream folder for content a `git diff`
will not make obvious — non-documentation files, the executable bit, symlinks, binaries,
and archives — and marks each finding **NEW** or **known**. With findings it waits for an
explicit `y`; a run with no terminal fails instead of assuming consent. The
vendor-owned baseline is seven `.mjs` files, all known. The local
`debate-review` fork adds eight inspected `.mjs` files outside sync ownership, and
`ui-guard` adds two local ones (`ui-audit.mjs`, `capture.mjs`); see their audit
records in [SKILL-SAFETY.md](SKILL-SAFETY.md).

The sync **replaces vendored folders wholesale** — local edits inside them are lost.
To change vendored behaviour, use a separate unlisted local skill or deliberately
transfer its ownership out of `vendor.json`. Record fork provenance and preserve
the licence. Local adaptations in `local-sources.json` are updated manually.

Review before committing:

```bash
git diff --stat
```

To pin a source instead of tracking a branch, set its `ref` in `vendor.json` to a tag
or commit SHA. `vendor.lock.json` always records the commit actually vendored.

## Adding another upstream source

Append to `sources` in `vendor.json`:

```json
{
  "name": "some-pack",
  "repo": "https://github.com/someone/some-pack.git",
  "ref": "main",
  "path": "skills",
  "skills": ["skill-a", "skill-b"]
}
```

Omit `skills` to vendor everything the source ships. Then run the sync.

## Before vendoring anything new

Read [SKILL-SAFETY.md](SKILL-SAFETY.md). It covers what a skill can actually execute, the
vetting checklist, and a record of skills removed from here and why.

Short version: a skill can ship executable scripts, and its `SKILL.md` prose is itself
instructions the agent obeys — so Markdown-only means *inspectable*, not *safe*. Vendor
only what you actually use.

## Notes

- Vendored skills keep their upstream licences. See each skill's folder and the
  source repo. `guard-skills` and `delegate-skills` are MIT.
- Skills install as a **copy** into `~/.agents/skills/`, so changes here do not reach an
  installed agent until the install command above is run again. Re-run it after every sync,
  or the agents keep running the previous version while git shows the new one.
- This repo was Markdown and JSON only until `delegate-skills`, which ships a
  `scripts/relay.mjs` per implementer plus four helpers under `delegate-setup`. Those
  run on every machine that installs from here. They are Node built-ins only, make no
  network calls of their own, and read no credentials — but that is a claim to re-check
  on every sync, not a property the sync enforces. See [SKILL-SAFETY.md](SKILL-SAFETY.md).

## Checks

```bash
node --test tests/debate-review.test.mjs
node --test tests/ui-audit.test.mjs tests/ui-workflow.test.mjs
jq empty vendor.json vendor.lock.json local-sources.json docs/workflow-map.json
bash -n scripts/sync-vendor.sh
npx skills add . --list --full-depth
```

Tests use temporary repositories and fake model responses. They make no live model
calls and do not install skills or configure real accounts.

## Requirements

`git` and [`jq`](https://jqlang.github.io/jq/) for the sync script (`brew install jq`).

Node 18+ for the debate-review script and offline tests. `ui-guard`'s `capture.mjs`
needs Node 22+ and an installed Chrome, Chromium or Edge; without them its browser
tests are skipped and agents report rendered checks as unavailable. Remote review also needs
the matching authenticated forge CLI and available delegate implementers; adding
these files does not provision those dependencies.
