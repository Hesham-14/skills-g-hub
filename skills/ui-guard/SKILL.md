---
name: ui-guard
description: "Review web UI for accessibility, responsive layout, UX, visual hierarchy, design consistency, interaction bugs and UI architecture, with evidence from a real browser. Use whenever the user asks to review, audit or check a page, screen, template or UI change (accessibility, mobile, design consistency, ready to ship?), and after any UI change before calling it done. Records the UI audit. DO NOT USE for generic code quality (clean-code-guard), test-code quality (test-guard), writing browser tests (ui-e2e-tests), building or redesigning UI (ui-engineering), or non-UI code."
---

# UI guard

Find the UI problems that matter, prove each one, and say how to fix it. Review the
change, not the whole product, unless the user asked for an audit of a surface.
Findings are reported; fixes happen only when the task is a build or fix task.

If a skill named here is not installed, apply the intent stated in this file and say
which review it would have added; never install it.

## 1. Set the scope

Name the surfaces in scope (routes, templates, components) and the acceptance criteria
or UI brief they are held to. For a diff, also note shared tokens or components it
changes: their other users are in scope for regressions.

## 2. Collect evidence

Rendered evidence beats source reading. Follow
[browser-evidence.md](references/browser-evidence.md) to run the app, choose viewports,
themes, direction and states, and capture screenshots and browser signals safely.
When the app cannot run or authentication blocks the surface, review the source, mark
every rendered gate `blocked` or `unavailable` with the reason, and say that visual
behaviour was not verified.

## 3. Review against the rubric

Apply every section of [review-rubric.md](references/review-rubric.md) that the scope
touches: UX and flow, visual hierarchy, layout and responsive behaviour, accessibility,
interaction and states, tokens and consistency, component reuse, UI architecture,
performance signals. For code-level checks, apply the pinned
[web-interface-guidelines.md](references/web-interface-guidelines.md) rules that match the
stack. Project conventions and the UI brief win over generic rules.

Leave to their owners: naming, function size, duplication outside UI patterns and
general error handling (`clean-code-guard`); test structure and assertions
(`test-guard`). Mention an overlap once, then point to the owner.

## 4. Report findings

Each finding:

```text
[P1][a11y][rendered] Dialog close button has no accessible name
Where: src/components/SettingsDialog.tsx:212 · /settings (390×844, dark)
Evidence: screenshot .ui-audit/shots/settings-dark-390.png; accessibility tree shows button ""
Impact: screen-reader users cannot find how to leave the dialog
Fix: add aria-label="Close settings" (matches ConfirmDialog)
```

- **Severity:** P0 blocks the primary task or loses data; P1 is a WCAG A/AA failure,
  a broken state or a layout break at a supported viewport; P2 is a real but workable
  problem; P3 is polish. Keep P3s few.
- **Evidence tag:** `rendered` (seen in a browser), `measured` (a tool computed it:
  contrast ratio, axe rule, console error, metric), or `source` (read in code only).
  A `source` finding about rendering is a hypothesis; say so.
- Merge duplicates. Group systemic issues once with their count and locations.
- Say what works when it is worth keeping.

## 5. Gate and record

Summarise each gate as `pass`, `fail`, `not_run`, `blocked` or `unavailable`: visual,
ux, a11y, functional, architecture, performance. A gate passes only with evidence for
it; a check that did not run is never a pass, and a build or type check passing is not
a visual pass.

For significant and redesign work, and whenever the user or project asks for an audit
trail, write the record with the recorder in
[audit-recorder.md](references/audit-recorder.md). It validates the record against
[ui-audit.schema.json](references/ui-audit.schema.json) and refuses a `pass` without
evidence.

Return confirmed fixes to implementation as narrow corrections carrying the evidence.
An unresolved design choice goes back to `ui-engineering` (or the user for a redesign
direction); a flow that needs a regression test goes to `ui-e2e-tests`.
