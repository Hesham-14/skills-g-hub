# UI upstream assessment — 2026-11-07

The decisions behind the four local UI skills (`ui-engineering`, `ui-design-system`,
`ui-guard`, `ui-e2e-tests`). Every source was cloned shallow into a scratch directory
and read there; nothing was executed. Pins are the commits that were read.

| Source | Commit read | Licence | Payload | Decision |
| --- | --- | --- | --- | --- |
| `anthropics/skills` `frontend-design` | `2c5958ec` (vendored copy: `f17010c9`) | Apache-2.0 | 1 `SKILL.md` | **Reuse the vendored skill.** `ui-engineering` calls it by name for aesthetic direction only. |
| `anthropics/skills` `webapp-testing` | `2c5958ec` | Apache-2.0 | `scripts/with_server.py` (`subprocess.Popen` on given commands) + 3 Python examples | **Stay dropped** (SKILL-SAFETY.md, 2026-08-04). Its reconnaissance-then-act order informed `ui-e2e-tests`; no file copied. |
| `pbakaus/impeccable` v4.8.0 | `687bc381` | Apache-2.0 | 46 references + `scripts/impeccable` launcher that runs, or **downloads on first run**, a platform binary; ~2.3k lines in the audit/critique references alone | **Reference selected ideas, rewritten.** Not vendored: remote executable download, a description that claims every UI verb, and heavy context. Adapted: audit dimensions, P0–P3 severity, "verify the render at shipping sizes", the craft-floor checks, refinement-preserves vs redesign-replaces, and surface modes. Recorded in `skills/ui-guard/NOTICE.md`. |
| `vercel-labs/web-interface-guidelines` | `434b7f91` | MIT | `command.md` (191 lines of rules) + an unused `install.sh` | **Local pinned copy** at `skills/ui-guard/references/web-interface-guidelines.md`. Replaces the upstream skill's fetch of `main` on every review. |
| `vercel-labs/agent-skills` `web-design-guidelines` | `1a2c79d4` | MIT | `SKILL.md` that fetches the guidelines above from `main` at run time | **Not vendored.** Unpinned remote instructions on every run. Its content is covered by the pinned copy. |
| `vercel-labs/agent-skills` `composition-patterns` | `1a2c79d4` | MIT | 8 rule files + 22 KB `AGENTS.md` | **Reference selected rules** in `skills/ui-engineering/references/react-rules.md`. Not vendored: frontmatter name `vercel-composition-patterns` does not match its folder (breaks this hub's naming rule, and a vendored folder cannot be fixed), and its "component architecture" trigger competes with `ui-engineering`. |
| `vercel-labs/agent-skills` `react-best-practices` | `1a2c79d4` | MIT | 70 rule files + 108 KB `AGENTS.md`, mostly Next.js/RSC | **Reference selected rules** (same file). Not vendored: size, Next.js focus, and a trigger on every React file. |
| `microsoft/playwright-cli` `playwright-cli` | `4bc00fb7` | Apache-2.0 | `SKILL.md` + 10 references; needs the `playwright-cli` binary installed globally | **Not vendored.** `ui-e2e-tests` uses it only when the binary is already installed and the project allows it. |

## Drift found, not acted on

- The vendored `frontend-design` (`f17010c9`) is behind upstream `2c5958ec`. The newer
  text adds more "templated look" calibration (SaaS card kit, eyebrow labels) and drops
  the "signature element" wording. It is Markdown-only. Refresh it with the normal
  `./scripts/sync-vendor.sh anthropic-skills` when you choose to; this change does not
  touch vendored folders.

## Overlap resolved

| Conflict | Resolution |
| --- | --- |
| `frontend-design`'s description also claims "building new UI". | Vendored, so unchanged. `ui-engineering` owns the workflow and calls `frontend-design` only for direction; its description routes pure visual direction there. |
| `prototype/UI.md` also explores layouts. | `ui-engineering` sends genuinely unsettled choices to `prototype` and takes back its verdict. Promotion stays an implementation step. |
| `clean-code-guard` and `test-guard` also review UI files. | `ui-guard` reviews only UI quality and rendered behaviour. Browser test code is still reviewed by `test-guard`. |
| A future `test-lifecycle` set would list `ui-e2e-tests` as a browser level. | `ui-e2e-tests` is built now under that name. A future `test-lifecycle` routes its browser level here instead of carrying a copy. |
| `delegate-setup` already has a `ui` lane. | `hub-workflow/references/execution.md` uses the configured `ui` lane for UI tickets and adds UI brief fields. |
| Impeccable installed globally. | `ui-engineering` and `ui-guard` say so: when the user explicitly invokes Impeccable, do not run a second critique over the same surface. |
