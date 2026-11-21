# React + TypeScript with plain CSS

For React apps styled with global CSS, CSS modules or CSS custom properties, often with
a deliberately small dependency set. Typical constraints: runtime dependencies limited
to `react`/`react-dom`, pinned lockfile installs, a strict CSP (`default-src 'self'`: no
CDN, no web fonts, no inline styles injected by libraries), tests in a pinned container.

## Before editing

- Read `package.json`, the lockfile policy and any ADR on dependencies. Treat "no new
  package" as absolute unless the user approves a named package.
- Find where state for the target lives (often one large container component) and
  which props flow down. Find the existing primitives: shared CSS classes (`.btn`,
  `.modal-*`), hooks (`useX`), icon components, helpers such as focus traps or menu
  keyboard handlers.
- Find the tests that cover the area (Vitest/Jest + Testing Library) and how they run.

## Implementation rules

1. **Components.** Function components with a typed `Props` object. Keep a new
   component next to its siblings, following the folder and naming pattern already used.
2. **State ownership.** Leave state where it is unless the task needs a new owner. When
   prop lists grow past what the change can justify, follow
   [react-rules.md](react-rules.md) (composition) rather than adding another boolean prop.
3. **Reuse before re-implementing.** A dialog uses the existing dialog markup/classes and
   focus handling; when the same focus trap or menu logic already exists in several
   places and this change needs it again, extract one hook or component in the same
   change and use it at the new site only, unless the task includes migration.
4. **Styling.** Use existing custom properties for colour, spacing, radius and z-index.
   Add a token instead of a new literal when the value is a reusable role. Keep selectors
   flat and scoped by a component class; no `!important` escalations.
5. **No library-shaped shortcuts.** No CSS-in-JS, icon packs, animation or UI libraries.
   Icons are inline SVG components following the existing icon pattern, with
   `aria-hidden` when decorative.
6. **Security-sensitive rendering.** Keep HTML insertion in the one place the project
   allows it. Never add `dangerouslySetInnerHTML` elsewhere, inline `<script>`, or
   remote assets that the CSP would block.
7. **Accessibility.** Native `button`, `a`, `label`, `select`, `dialog` semantics first;
   ARIA only to fill gaps. Async results announce with `role="status"`/`aria-live`.
   Bidirectional content uses `dir="auto"` or `<bdi>` like the rest of the app.
8. **Tests.** Behaviour tests through roles and visible text, matching existing test
   style. jsdom does not prove layout; the visual loop does.

## Verify

Run the project's type check and test command (often inside its container). Then the
visual loop on the built app, both themes when the app has them, and the phone width.
Check the browser console: React warnings about keys, act() or hydration count as
findings.
