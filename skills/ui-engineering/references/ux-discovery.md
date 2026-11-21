# UX discovery

For significant and redesign work. The output is a **UI brief**: short enough to sit
at the top of a ticket or delegation brief, specific enough that someone else can
check the result against it. Write it from evidence: the request, existing screens,
domain docs, tickets and the user. Mark anything assumed as an assumption.

## The brief

```markdown
## UI brief: <surface>
Class: significant | redesign        Mode: operate | read | persuade | experience
Users and context: <who, on what device, under what conditions>
Primary task: <the one job this surface must make easy>
Secondary tasks: <ranked; cut anything nobody asked for>
Journey: <entry point> → <steps> → <exit/success> (+ the main failure path)
Information architecture: <what lives on this surface, in what order of importance, and what moves elsewhere>
States: <see inventory below>
Screens/routes: <paths or template files>
Breakpoints: <project's own values>   Themes: <light/dark/none>   Direction: <ltr/rtl/both>
Constraints: <dependency policy, CSP, copy language, auth, data sensitivity>
Acceptance criteria:
- [ ] <observable behaviour, e.g. "submitting with an empty title shows the field error and keeps the typed body">
- [ ] <viewport/state requirement, e.g. "no horizontal scroll at 375px; table becomes label/value rows">
Out of scope: <what stays as it is>
Open questions: <only choices that change scope or behaviour>
```

**Mode** names what success looks like on the surface: *operate* (complete a task:
apps, admin, dashboards; consistency and scanability outrank expression), *read*
(understand: docs, reports), *persuade* (decide and act: landing, pricing), *experience*
(the work itself: portfolios, showcases). Choose it from the surface, not the product.

## State inventory

List, for each data-bearing region, every state that can actually occur, and how the
UI shows it:

| Region | Loading | Empty | Error | Partial/stale | Long content | No permission | Success feedback |
| --- | --- | --- | --- | --- | --- | --- | --- |

Delete columns that cannot occur, and say why in one word. Unknown values shown as
zero, errors that only say "something went wrong", and an empty list with no next
action are the common misses.

## Interaction requirements

For each control: what it does, its keyboard path, its disabled and busy behaviour,
what feedback confirms it worked, and whether it is reversible. Destructive and
irreversible actions need confirmation or undo. Stateful views (filters, tabs,
pagination, open panels) belong in the URL when the project routes that way.

## Wireframes and exploration

Use an ASCII wireframe when layout order or grouping is the decision; skip it when an
existing screen already fixes the layout. One wireframe per competing structure, at
most three. When the choice still cannot be made on paper, send the question to
`prototype` and record its verdict here.

```text
┌ header: title · primary action ┐
│ filters (URL-synced)          │
│ list ─────────── │ detail      │   ← ≥ 900px
└───────────────────────────────┘
phone: list → detail as separate views; primary action stays reachable
```

## Approval

A redesign stops after the brief and direction for the user's approval before
production edits. Significant work continues unless an open question changes scope or
behaviour. Record the approved direction and its reason in the ticket or plan.
