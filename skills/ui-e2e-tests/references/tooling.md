# Tooling discovery

`node "<ui-guard-dir>/scripts/ui-audit.mjs" detect --project-dir .` reports browser
test tooling found in `package.json`, Python requirements and config files. Confirm by
reading the files it names; then read `docs/agents/workflow.md`, CI config and scripts
for the real run command and environment (container, service dependencies, base URL).

| Found | Use |
| --- | --- |
| `@playwright/test` + `playwright.config.*` | Its config, projects and `webServer`; run with the project's script or `npx --no-install playwright test` |
| Python `playwright` / `pytest-playwright` | `page` fixture tests under the project's pytest layout; run with its pytest command |
| Cypress | Its `cypress/` layout and commands; run with `npx --no-install cypress run` |
| Selenium/WebDriver | Keep it; follow the existing page-object or helper style |
| `@axe-core/playwright`, `axe-playwright-python`, `cypress-axe`, `jest-axe` | Automated accessibility rules inside flows |
| Storybook with a test runner | Component-level visual and interaction checks, not full flows |
| Nothing | See the skill's step 1: verification without a suite, or an approved minimal setup |

## Browsers

Use browsers the runner already has installed. `npx playwright install` downloads
browser builds; run it only with the user's approval. On machines without them,
`ui-guard`'s `capture.mjs` works with an installed Chrome/Edge for screenshots and
signals, and the runtime's own browser tools for interaction.

## Proposing a minimal setup

When the user wants a suite and the project has none, propose before writing:

- **JavaScript/TypeScript projects:** `@playwright/test` as a pinned dev dependency
  installed the project's way (for example `npm ci --ignore-scripts` with a lockfile
  update), one `playwright.config.ts` with `webServer` pointing at the existing dev or
  preview command, `tests/e2e/` for specs, one script in `package.json`.
- **Python projects:** `pytest-playwright` added to the dev requirements, tests under
  the existing `tests/` tree with a marker such as `e2e`, the server started by a
  fixture using the project's own run command.
- Include the browser download step, how it runs in the project's container or CI,
  and its size. Projects that forbid new packages, or whose tests run only in a pinned
  container, get the proposal as a ticket, not an edit.

## Containers and CI

When the project's gate runs in a container, the E2E command runs there too, or is
recorded as a separate local-only check in `docs/agents/workflow.md` with the reason.
Do not add CI workflows unless the task asks for them.
