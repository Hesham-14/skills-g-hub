# Review rubric

Work through each section the scope touches. Each check names what to look at; a
finding needs evidence from step 2 of the skill. Dimensions and severity adapt
Impeccable's audit and craft floor (see [../NOTICE.md](../NOTICE.md)).

## UX and flow

- The surface's primary task is obvious within seconds and completable without
  guessing. Count the steps; extra confirmations and dead ends are findings.
- Labels and copy use the user's words and the product's language; a control names its
  action, and that verb carries through to its confirmation.
- Errors say what happened and how to recover, next to where the user is looking.
- Empty states offer the next action. Unknown values are not shown as zero.
- Destructive or irreversible actions have confirmation or undo.
- Navigation shows where the user is (`aria-current`, active state) and how to go back.
- Decision points with more than about four visible options at once need grouping or a
  default.

## Visual hierarchy

- One clear focal point per view; the primary action is visually primary and the only
  one.
- Spacing groups related items and separates unrelated ones; more space above a
  heading than below it.
- Type scale steps are distinguishable; body measure about 65–75 characters.
- Colour carries meaning consistently (status colours mean the same everywhere) and is
  never the only signal.

## Layout and responsive behaviour

- No horizontal page scroll at the smallest supported width.
- Long and missing content: long names, long numbers, empty strings and translated text
  wrap or truncate with access to the full value; flex children can shrink.
- Tables and dense grids have a narrow-screen form (stacked rows, priority columns,
  contained scroll).
- Sticky headers, footers and floating buttons do not cover content or the focused
  element.
- Touch targets at least 24×24 CSS px (44×44 preferred for primary controls), with
  spacing between neighbours.
- RTL: mirrored layout, logical spacing, isolated mixed-direction text, unmirrored
  media and logos.

## Accessibility

- Contrast per theme: text ≥4.5:1, large text and component boundaries ≥3:1. Measure;
  do not judge by eye.
- Every control has an accessible name; icon-only buttons have `aria-label`.
- Semantic elements (`button`, `a`, `label`, landmarks, heading order) before ARIA.
- Keyboard: every action reachable, logical order, visible focus, no traps, Escape closes
  overlays, focus returns to the trigger.
- Forms: labels tied to inputs, errors linked with `aria-describedby`, `aria-invalid`,
  required fields marked in text.
- Async updates announced (`role="status"`, `aria-live`).
- Motion respects `prefers-reduced-motion` while keeping state changes visible.
- Images have appropriate `alt`; decorative ones are hidden.

## Interaction and states

Exercise, do not infer: hover, focus, active, disabled, loading/busy, error, empty,
success, selected. Double submission is prevented. Back/forward and reload keep URL
state. Offline or failed requests show a message, not a frozen control.

## Tokens and consistency

- Colours, spacing, radii, type sizes and z-index come from tokens; new literals that
  duplicate a token are findings (count them).
- The same concept looks and behaves the same as elsewhere in the product.
- Themes: every surface themed, including native controls, scrollbars, selection and
  focus rings.

## Component reuse

- The change uses existing components, macros or classes for concepts that already
  exist. A re-implemented dialog, focus trap, menu or field error is a finding with the
  existing implementation named.
- A new shared component has one definition and a clear state matrix.

## UI architecture

- State lives with its owner; no copy of server state that can drift; no prop
  explosion added for one call site.
- Logic stays out of templates and render functions where the project keeps it in
  view-models or hooks.
- No new dependency, remote asset or inline script that the project policy or CSP
  forbids.
- HTML insertion stays in the sanctioned place; escaping is intact.

## Performance signals

Only with measurements or a clear source cause: large layout shifts, long tasks during
interaction, unbounded lists rendered at once, images without dimensions, heavy imports
in the entry chunk, animations of layout properties. Record metrics with their
environment; compare only like with like.

## Severity guide

| Severity | Examples |
| --- | --- |
| P0 | Primary task cannot be completed; data loss; a security-relevant rendering flaw |
| P1 | WCAG A/AA failure; layout broken at a supported viewport; a state missing or wrong; keyboard trap |
| P2 | Inconsistent component or token use; awkward flow with a workaround; minor overflow |
| P3 | Spacing or alignment polish; copy tone |
