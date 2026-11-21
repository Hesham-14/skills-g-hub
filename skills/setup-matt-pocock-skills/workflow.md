# Workflow

How this repo verifies a change, and anything the engineering skills would otherwise get wrong. The `## Agent skills` block in `CLAUDE.md` / `AGENTS.md` points here, so an agent working in this repo can look the commands up instead of inferring them from `package.json` each session.

## Verification

| Command | Covers | When |
| ------- | ------ | ---- |
| `pnpm test` | Unit tests | Inner loop |
| `pnpm typecheck` | Types | Inner loop |
| `pnpm lint` | Lint + format | Before done |

The **gate** is the command that has to pass before a change counts as finished: `pnpm test && pnpm typecheck && pnpm lint`.

Every command here should be one that already exists in this repo — in `package.json`, a `Makefile`, a `justfile`, or CI. If a check can't run locally because it needs credentials, a service, or a device, write that down rather than substituting something that looks equivalent. A skill that runs an invented command and sees it pass will report a verification that never happened.

## UI verification

Only for a repo with a rendered UI; delete the section otherwise. The UI skills read it to look at a change in a real browser instead of guessing how to start the app.

| Item | Value |
| ---- | ----- |
| Run the app | `<command that starts the app>` (for example a no-login preview on 127.0.0.1:<port>) |
| Stop it | `<command that stops it>` |
| Browser test command | none yet |
| Viewports | 1280×800, 390×844 |
| Themes / direction | light only · LTR |
| Auth for screenshots | preview mode, no credentials needed |

Write `none` for an item the repo does not have, rather than a command that might work.

## Standing exceptions

Anything the skills would otherwise assume wrongly. Leave this empty rather than inventing entries — an empty section is accurate, a speculative one is a bug that reads like documentation.

Examples of what belongs here, if any are true:

- Parts of the tree with different rules — generated code that isn't reviewed, vendored directories that aren't edited
- A review step this repo requires beyond the default
- A convention that overrides how a skill would normally behave

## Beyond the defaults

If this repo has skills or review steps of its own that the stock set doesn't know about, describe them here in prose. The skills read this file for the repo's actual policy; they don't assume any particular tool exists.
