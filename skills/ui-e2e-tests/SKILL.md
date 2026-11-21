---
name: ui-e2e-tests
description: "Add, run or repair real-browser tests for a web UI: end-to-end user flows, screenshot and visual-regression checks, automated accessibility checks and browser-error detection, using the project's existing browser tooling. Use for 'write E2E tests', 'add a Playwright test for this flow', 'set up visual regression', 'add axe checks', 'test this page in a real browser', or when a significant UI change needs a regression test. DO NOT USE for unit or component tests in jsdom (tdd and the project's runner), reviewing test code (test-guard), judging UI design quality (ui-guard), building UI (ui-engineering), or backend API tests."
---

# UI end-to-end tests

Browser tests prove that a user can complete the flows that matter, in a real
rendering engine. Write few, meaningful, stable tests with the tooling the project
already has. This skill is the browser level of the hub's testing work: `tdd` owns
test-first behaviour at other interfaces and `test-guard` reviews every test written.

If a skill named here is not installed, apply the intent stated in this file and say
which one was missing; never install it.

## 1. Find the tooling

Read [tooling.md](references/tooling.md). Use the project's existing runner, config,
fixtures and commands. If the project has no browser test tooling:

- for a one-off verification, use the runtime's browser tools or `ui-guard`'s
  `capture.mjs`, and report it as a verification, not as a test suite;
- to add a suite, propose the smallest setup that fits the project (usually
  Playwright) with its exact packages, files and run command, and wait for the user's
  approval. Never install browsers or packages silently, and respect a project's
  "no new dependencies" rule.

## 2. Choose what to cover

Derive cases from the acceptance criteria and risk, not from the component tree:

- the primary flow of each changed surface, end to end;
- flows where a failure costs most: sending, paying, deleting, approving, saving, auth;
- the error and empty paths users actually hit;
- a regression test for a bug that escaped to the browser.

Prefer one flow test that walks a real journey over many tests of single clicks. Leave
pure logic and rendering details to unit and component tests.

## 3. Write the tests

Follow [flows.md](references/flows.md): user-facing locators, web-first assertions,
isolated deterministic data, real application code with mocks only at true external
boundaries, and authentication through the project's own test fixtures.

Add the branches the task needs:

- **Visual regression** → [visual-regression.md](references/visual-regression.md).
- **Accessibility checks** → [accessibility.md](references/accessibility.md).
- **Browser errors and performance signals**: fail a flow on uncaught page errors
  and unexpected console errors; see the accessibility reference's last section.

## 4. Run and prove

Run the new tests with the project's command and watch them fail for the right reason
when practical (break the assertion or run against the old behaviour), then pass.
Run them twice, or with the runner's repeat option, to catch flakiness. A test that
was written but not run is reported as `not_run`, never as passing.

Record results when an audit record exists: `ui-audit.mjs run` around the test command,
or `import-playwright` for a JSON report (see `ui-guard`'s
`references/audit-recorder.md`).

## 5. Hand off

`test-guard` reviews the test code (its Jest/Vitest and pytest references apply to
Playwright test files). Report: flows covered, commands run, pass/fail counts, flaky
or skipped cases with reasons, and gaps left untested.
