---
name: ui-engineering
description: "Load before creating or editing web UI files (HTML or Jinja/Django templates, CSS, React/TSX or vanilla-JS components) to add or change a screen, page, form, dialog, component, layout, responsive or RTL behaviour, or to redesign one. Sets the depth for the change's size, follows the project's own stack and verifies the result in a real browser. Use on your own initiative for any UI build or fix, small ones included. DO NOT USE for visual direction alone (frontend-design), throwaway layout experiments (prototype), design-token or component-system work (ui-design-system), reviewing an existing UI (ui-guard), writing browser tests (ui-e2e-tests), or backend, CLI and data work with no rendered UI."
---

# UI engineering

Own the path from what the user is trying to do to a rendered change that has been
looked at. Depth scales with the task class; the stack, product behaviour and project
rules stay the project's own.

Read `docs/agents/workflow.md` when the project has one: its UI verification section
names the run command, URL, preview/auth mode and browser test command. Project
instructions (`AGENTS.md`, `CLAUDE.md`, ADRs) override everything here, including
dependency, CSP, copy-language and screenshot rules.

## 1. Classify the task

Pick the lowest class that fits and say which one in a single line.

| Class | Signal | Route |
| --- | --- | --- |
| **trivial** | One visual property, copy fix, spacing, a single style rule; no new state | Implement → look at it once in the browser if it can run → `ui-guard` on the diff |
| **standard** | New or changed component, form or section inside an existing design language | Existing design context → implement → visual feedback loop → `ui-guard` |
| **significant** | New screen or multi-step flow, new states, navigation change | UX discovery → design direction → implement → loop → `ui-guard` → `ui-e2e-tests` for the critical flow |
| **redesign** | Replacing a surface's look or structure, or a new product UI | Full discovery and exploration → **user approval of the direction** → implement → full validation |

Escalate a class only on evidence found while working (an unexpected flow, a missing
state). A trivial fix never needs a spec, ticket, prototype or audit record.

## 2. Gather design context

Read what exists before proposing anything: the screens next to the target, shared
layout/templates, tokens or CSS variables, the component or macro library, copy
conventions, and any design docs or reference screenshots the project keeps.
For significant and redesign work, read [ux-discovery.md](references/ux-discovery.md)
and produce its brief: goals, primary tasks, journey, state inventory and UI acceptance
criteria.

- Visual direction for new or redesigned surfaces → `frontend-design`, bounded to the
  brief and to the project's existing language unless the class is redesign.
- Two or more plausible layouts or interactions nobody can choose on paper →
  `prototype` (UI branch); bring its verdict back here.
- Missing or drifting tokens and components that this change must touch →
  `ui-design-system` for that slice only.
- When the user explicitly invokes Impeccable or another installed design skill for
  this surface, use its result instead of a second critique of the same thing.

If a named skill is unavailable, apply the one-paragraph intent stated here and say
which skill was missing only if it blocks completion. Never install it.

## 3. Choose the stack strategy

Identify the stack from the project files, then read **only** the matching reference:

| Evidence | Reference |
| --- | --- |
| React + TypeScript, plain/global CSS or CSS modules, no utility framework | [stack-react-plain-css.md](references/stack-react-plain-css.md) |
| React with Tailwind, shadcn/ui (`components.json`) or Radix | [stack-react-tailwind.md](references/stack-react-tailwind.md) |
| Server templates (Jinja2/FastAPI, Django, Flask) + vanilla JS | [stack-server-templates.md](references/stack-server-templates.md) |
| Static HTML/CSS/JS, no build step | [stack-static.md](references/stack-static.md) |

`node "<ui-guard-dir>/scripts/ui-audit.mjs" detect --project-dir .` prints these
signals as JSON when the `ui-guard` skill is installed; reading `package.json`,
`components.json` and the template directory gives the same answer. For another stack,
take the closest reference's principles and the project's own conventions. Mixed
repositories (a React app plus a vanilla admin panel) use the strategy of the surface
being changed.

## 4. Implement

Hold every change to the production floor:

- **Preserve** routing, state ownership, data flow, component boundaries, build and
  deployment setup. Change them only when the task requires it, and say why.
- **Reuse** the existing component, macro, class or token before creating one; extract
  only when this change would otherwise duplicate it.
- **Dependencies:** add none unless the user approves that specific package and the
  project allows it.
- **States:** implement every state in the brief: loading, empty, error, success,
  disabled, long and missing content, permission-limited views.
- **Accessibility:** semantic elements first, labelled controls, visible focus, keyboard
  path, announced async updates, reduced motion, contrast.
- **Responsive and direction:** the project's breakpoints; logical properties where
  RTL applies; no horizontal page scroll at the smallest supported width.
- **Copy:** the project's language and voice; controls name their action.

## 5. Verify by looking

For standard and above, run [visual-feedback-loop.md](references/visual-feedback-loop.md):
start the app with a verified command, inspect the rendered change at the required
viewports, themes and states, fix what the look shows, and look again. A successful
build, a type check or reading the source is **not** visual verification; when the UI
cannot be rendered, report the check as blocked with the reason.

## 6. Hand off

- `ui-guard` reviews the change with the evidence from step 5. `clean-code-guard` and
  `test-guard` still review production and test code through `hub-workflow`'s review
  contract; do not repeat their checks here.
- `ui-e2e-tests` adds or runs browser tests when the class is significant or above, a
  critical flow changed, or the acceptance criteria name a browser test.
- For significant and redesign work, write an audit record with `ui-guard`'s recorder
  (see its `references/audit-recorder.md`).

Report: class, files changed, states and viewports actually checked, evidence
(screenshots, test runs), findings fixed, and what was not verified and why.
