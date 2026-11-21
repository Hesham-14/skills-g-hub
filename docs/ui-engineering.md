# UI engineering system: operator guide

Version 1.0.0 (the `workflow.version` written into every audit record). Four local
skills, two helper scripts, one record schema. How the pieces connect is in
[workflow.md](workflow.md#ui-engineering); why upstream sources were or were not taken
is in [ui-upstream-assessment.md](../files/ui-upstream-assessment.md).

## Install or reinstall

The install is a copy, so run it again after every change here:

```bash
npx skills add Hesham-14/skills-g-hub --global --agent claude-code --agent codex --agent antigravity-cli --skill '*' -y
```

That installs what is pushed to GitHub. To try local, unpushed changes, list what
would be discovered first, then install from the checkout path:

```bash
npx skills add . --list --full-depth
```

```bash
npx skills add . --global --agent claude-code --agent codex --agent antigravity-cli --skill '*' -y
```

The UI skills work together: install all four with `hub-workflow`,
`frontend-design`, `prototype`, `clean-code-guard` and `test-guard`. Each still works
alone and says which neighbour it missed. Requirements: Node 18+ for the recorder;
Node 22+ and an installed Chrome, Chromium or Edge for `capture.mjs`.

## Set up a project once

Run `setup-matt-pocock-skills` in the project (user-invoked). For a repo with a UI it
now proposes **UI verification** rows in `docs/agents/workflow.md`: how to run and
stop the app for a browser check, the browser test command, viewports, themes,
direction and how screenshots get past login. Agents read those rows instead of
guessing. Add `.ui-audit/` to the project's `.gitignore` if you will keep audit
records; screenshots can contain real data.

## Use it

Ask for the UI work in your own words; the descriptions route it.

| You say | What runs |
| --- | --- |
| "Fix the button padding on mobile" | `ui-engineering` as **trivial**: edit, one look, `ui-guard` on the diff |
| "Add a filter bar to the offers list" | **standard**: existing design context, implement, visual loop, `ui-guard` |
| "Build the visit-planning flow" | **significant**: UI brief, direction, implement, loop, `ui-guard`, `ui-e2e-tests`, audit record |
| "Redesign the settings page" | **redesign**: brief and direction, then it **waits for your approval** before production edits |
| "Make our tokens consistent" / "add dark mode" | `ui-design-system` |
| "Review this page" / "check accessibility" | `ui-guard` (findings only, no edits) |
| "Add Playwright tests for checkout" | `ui-e2e-tests` |

Say the class yourself ("treat this as trivial") to override the agent's choice.
Delegated UI tickets carry the UI brief fields from `hub-workflow`'s execution
reference and use the `ui` lane when `delegate-setup` configured one.

## Read the results

Every UI report names, per viewport/theme/state: checked, failed, blocked or not run,
with evidence. Findings carry severity (P0–P3) and basis (`rendered`, `measured`,
`source`). A `source` finding about appearance is a hypothesis.

For audited runs:

```bash
node ~/.agents/skills/ui-guard/scripts/ui-audit.mjs summary .ui-audit/runs/<run>.json
node ~/.agents/skills/ui-guard/scripts/ui-audit.mjs compare .ui-audit/runs/<baseline>.json .ui-audit/runs/<candidate>.json
```

Verdicts: `pass` (every required gate passed with evidence, no open P0/P1), `fail`, or
`incomplete` (something required did not run, was blocked, or is unavailable).
`incomplete` is the honest result when the app could not start or login blocked the
page; it is not a pass.

## What it will not do on its own

Install browsers or packages, add a dependency, disable authentication, open
non-local URLs with the capture script, upload screenshots, commit `.ui-audit/`,
redesign without approval, or record agent cost the runtime did not report.

## Maintain it

| Change | Do |
| --- | --- |
| A skill's wording | Edit `skills/ui-*/`; keep `SKILL.md` short and push detail into `references/`. Run `node --test tests/ui-workflow.test.mjs`. |
| `ui-audit.mjs` or `capture.mjs` | Read the full diff (they execute code), `node --check`, `node --test tests/ui-audit.test.mjs`. Update the safety note in `SKILL-SAFETY.md` if what they execute changes. |
| The record format | Edit `ui-guard/references/ui-audit.schema.json` and the script together. A breaking change bumps `schema` to `ui-audit/v2` and `WORKFLOW_VERSION`; `compare` reports a schema mismatch instead of guessing. |
| Pinned Vercel guidelines | Diff upstream `command.md` against `ui-guard/references/web-interface-guidelines.md`, copy deliberately, update the commit in that file, `NOTICE.md` and `local-sources.json`. |
| Vercel React or Impeccable ideas | Re-read the pinned commits in `local-sources.json`; adopt changes by hand. |
| `frontend-design` | Vendored: refresh only through `./scripts/sync-vendor.sh anthropic-skills`. Upstream was ahead of the vendored copy on 2026-11-07. |
| Activation drift | Run `node tests/ui-workflow/activation-eval.mjs` (opt-in, costs model usage) after changing any description, and compare with the last recorded result in `tests/ui-workflow/README.md`. |

## Known limitations

- `capture.mjs` interacts only through a JavaScript expression; real user flows need
  the runtime's browser tools or the project's Playwright.
- Its DOM checks cover names, labels, `alt`, `lang` and overflow, not contrast or
  focus order. Use axe through the project's tests or a contrast measurement for those.
- Performance numbers are single samples from one machine. `compare` ignores moves
  below its noise floor and across different environments; use them to spot large
  changes, not for budgets.
- Activation is tested live only for Claude Code. Codex and Antigravity read the same
  descriptions; their routing has not been measured here.
