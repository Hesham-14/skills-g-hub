# Skill safety notes

Read this before vendoring a new skill or accepting an upstream update.

## What a skill can actually do

A skill is not just text. Two separate things carry risk:

1. **Files in the skill folder.** A skill can ship `.sh`, `.py`, binaries, or archives,
   and its `SKILL.md` can instruct the agent to run them. Installing such a skill puts
   executable code on the machine, and the agent has permission to run it.
2. **The `SKILL.md` prose itself.** Its content *is* instructions the agent follows.
   A skill with zero scripts can still tell the agent to exfiltrate a diff, weaken a
   check, or touch files outside the task.

So "Markdown only" does not mean *safe*. It means **inspectable** — the whole payload is
readable in a diff. That is the property to insist on, not the absence of scripts alone.

## Vetting checklist

Before adding a source to `vendor.json`:

```bash
find <skill-dir> -type f              # is there anything that is not .md?
grep -rn "curl\|wget\|npm install\|pip install\|subprocess\|eval" <skill-dir>
```

- Anything **binary or archived** (`.tar.gz`, images, compiled files) cannot be reviewed
  in a diff. Treat it as opaque and decide whether the source is trusted enough for that.
- Read `SKILL.md` end to end. It is the part the agent obeys.
- Prefer `--skill <name>` over installing a whole package. Take only what you need.

## Removal record

### web-artifacts-builder, webapp-testing — removed 2026-08-04

Vendored from `anthropics/skills`, then removed the same day. Not because they are
malicious — they are Anthropic's own and do exactly what they advertise — but because
they were **not needed** and each one widened the attack surface for no return:

- `web-artifacts-builder/scripts/init-artifact.sh` runs `npm install -g pnpm`, which
  modifies the machine's global Node setup, then pulls ~40 packages from npm. That is a
  supply-chain surface inherited by every machine that installs the skill.
- `web-artifacts-builder/scripts/shadcn-components.tar.gz` is a 49-file binary archive.
  It cannot be reviewed in a diff, so a future change to it would land unread.
- `webapp-testing/scripts/with_server.py` calls `subprocess.Popen` on commands passed to
  it — a legitimate execution primitive, but an execution primitive.

The rule this establishes: **do not vendor a skill you are not currently using**, and
weigh scripts against actual need rather than against trust in the author.

They are worth reconsidering if the work changes — `web-artifacts-builder` for React or
shadcn artifacts, `webapp-testing` for Playwright browser testing. Re-add them by
restoring the names to the `anthropic-skills` entry in `vendor.json`. **Do the
prerequisite below first.**

## The content audit in the sync

The sync pulls whatever upstream has now. A source that is Markdown-only today can add a
script tomorrow, and `./scripts/sync-vendor.sh` used to pull it **without saying anything**.
Reviewing `git diff` by hand catches that only as long as nobody is in a hurry.

The script now audits every upstream folder **before it writes anything**, and reports:

- Any file that is not `.md`, `.txt`, `.json`, `.yaml`/`.yml`, or a licence.
- Any file carrying the executable bit.
- Any symlink.
- Any binary or archive, since its diff is unreadable.

Each finding is marked **NEW** or **known** — new means the file is not in `skills/` yet,
which is the line worth stopping on. With findings, the sync prints the list and waits for
an explicit `y` before copying; anything else writes nothing. `--yes` accepts them without
asking, and a run with no terminal to ask on **fails** rather than assuming consent. A
source with nothing to report behaves exactly as it did before, with no extra prompt.

The audit runs across every source before the first copy, so a problem in the last source
cannot land after the first has already been written.

**What it does not do.** It has no opinion on whether code is safe. `relay.mjs` is fine
today; if it were replaced with something hostile the audit would say the same words —
"not a documentation file". Its only job is turning a silent arrival into one you have to
answer for. Reading the code is still the actual protection, and `--yes` throws that away,
so keep it for reruns of a list already read.

Current baseline: seven `.mjs` files from `delegate-skills`, all `known`. A sync reporting
anything **NEW** is a sync to stop and read.

## Why the hub exists

Installing straight from a remote repo means an update reaches `~/.claude/skills` with no
review step. Vendoring puts the repo in between: upstream lands in git first, gets read as
a diff, and only reaches the agent after `npx skills update`. `vendor.lock.json` records
the exact commit in use, so any version is reproducible and revertible.

## Local workflow additions — 2026-09-06

The requested Matt workflow additions are local adaptations pinned in
`local-sources.json`; they are not owned by sync-vendor.sh. Their instructions and
references are text. The local diagnosing-bugs version omits the upstream HITL
shell template and uses proportionate evidence-driven diagnosis.

The adapted setup skill carries **no executable content**. It is upstream v1.2.3
plus `SKILL.md` +48/-6 and a new `workflow.md` template; every other file is
byte-identical to the pin. The additions are a check run for repos that already have
`docs/agents/`, a section recording the repo's real verification commands, and a
rule to show a diff before editing a file that already exists. It stays
prompt-driven, so its safety envelope is the agent's own tool permissions, not a
script's. An earlier local version shipped a Python adoption helper; that helper and
its tests were removed when the fork was rebased onto upstream.

The local debate-review fork adds **eight executable-code `.mjs` files**, including
the `scripts/review-pr.mjs` entrypoint, plus readable prompt assets and references. None
of those files carries the filesystem executable bit. The scripts
were inspected at review-skills commit `5b748c654bb060ef6bf86d0e7ae123979082a88a`.
No binaries, archives, symlinks or third-party Node packages were imported.

It can run external model CLIs, read a configured forge, create temporary Git
snapshots/worktrees and retain review artifacts. In the local fork it prints by
default; publishing requires authorized `--post`. Trusted lane settings resolve in
the original project, and reported read-only violations stop the run. The source
repo's Git filters can run while preparing a local snapshot; this is not a sandbox
for arbitrary repositories. See the [payload and integration audit](files/debate-review-integration-audit.md).

The existing sync audit still reports seven vendor-owned helpers. It does **not**
audit or refresh this local fork. Future changes to these eight scripts need a
manual content review, syntax checks and the offline integration tests. The test
fixture under `tests/fixtures/` simulates the external model process and is not
part of any installed skill.

## UI skills — 2026-11-07

`ui-engineering`, `ui-design-system` and `ui-e2e-tests` are Markdown only. `ui-guard`
adds **two executable-code `.mjs` files**, written here, Node built-ins only, without
the filesystem executable bit:

- `scripts/ui-audit.mjs` reads and writes JSON records under the project's
  `.ui-audit/`. It starts `git` with fixed read-only arguments (`rev-parse`, `status`,
  `remote get-url`, `check-ignore`). Its `run` command executes **the one command the
  agent passes after `--`**, without a shell, in the project directory, and stores the
  exit code, duration and a redacted output tail. That is an execution primitive by
  design: it adds provenance to a command the agent could already run, and no command
  of its own.
- `scripts/capture.mjs` starts **an already-installed Chrome, Chromium or Edge**
  headless with a temporary profile and `--remote-debugging-port=0`, talks to it over
  the loopback DevTools endpoint, and opens one page URL. It refuses non-local URLs
  unless `--allow-remote` is passed, downloads nothing, reads no browser profile, and
  deletes its temporary profile on exit. `--before` runs a JavaScript expression in the
  captured page.

Neither script makes other network calls or reads credentials. Screenshots and records
can contain application data; both scripts keep them local and `init` warns when
`.ui-audit/` is not git-ignored.

Upstream UI skills were read but not vendored; the reasons are in
[files/ui-upstream-assessment.md](files/ui-upstream-assessment.md). In short:
Impeccable's launcher runs or downloads a platform binary; Vercel's
`web-design-guidelines` fetches its rules from `main` on every run (a pinned copy of
those rules ships in `ui-guard` instead); `webapp-testing` stays dropped for its
`Popen` helper; `playwright-cli` needs a global binary. Changes to the two scripts need
a manual read, `node --check`, and `node --test tests/ui-audit.test.mjs`.
