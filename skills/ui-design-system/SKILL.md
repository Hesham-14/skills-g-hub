---
name: ui-design-system
description: "Extract, document, consolidate or extend a project's design system: semantic tokens, type and spacing scales, colour roles, themes, breakpoints, RTL rules and reusable component patterns. Use for 'set up design tokens', 'document our design system', 'make the UI consistent', 'add dark mode', 'unify these components', or when a UI change must add or fix tokens or shared components. DO NOT USE for a single screen or component change that fits the existing system (ui-engineering), aesthetic direction for a new look (frontend-design), reviewing a diff (ui-guard), or projects with no rendered UI."
---

# UI design system

A design system here is the project's **existing** visual language made explicit,
consistent and reusable. Extract and improve what is there; create only what is
missing; keep the project's framework and styling approach. Do not introduce React,
Tailwind, shadcn, a token build tool or any package the project does not already use,
unless the user approves that specific addition.

If a skill named here is not installed, apply the intent stated in this file and say
which one was missing; never install it.

## 1. Scope the job

| Request | Output |
| --- | --- |
| Extract / document | `DESIGN.md` or the project's design doc: current tokens, components, rules, known drift |
| Consolidate | One source per token and component; call sites migrated within the agreed scope |
| Extend | New tokens, a theme, RTL support or a new shared component, fitting the existing system |
| Slice for a UI change | Only the tokens/components that change needs; record the rest as drift |

Migration of every call site is its own decision: propose it with a count, and
change only the files the user's scope includes.

## 2. Inventory before deciding

Read the real sources: CSS custom properties and theme blocks, Tailwind `@theme` or
config, shared stylesheets, page-level style blocks, component/macro/partial folders,
existing design docs and reference screenshots. Count, do not estimate:

- distinct values per category (colour, font size, spacing, radius, shadow, z-index,
  breakpoint), with how often each appears and where;
- hard-coded values that duplicate a token;
- the same concept implemented under different names or markup;
- themes defined twice, or tokens missing from one theme.

A `grep`/`rg` count over the style sources is enough; keep the command in the report so
the count can be rerun.

## 3. Define or repair the tokens

Follow [tokens.md](references/tokens.md): semantic roles over raw values, a small scale
per category derived from values already in use, theme and direction rules, and
contrast verified per theme. Every token has one definition site.

## 4. Define or repair the components

Follow [components.md](references/components.md): an inventory of the patterns that
exist, a state matrix per component, one implementation per concept in the project's
own component model (React component, Jinja macro, CSS class contract), and
interaction conventions.

## 5. Write it down where agents will read it

Record the system in the project's existing design doc, or `DESIGN.md` at the root
when none exists, and point to it from `docs/agents/workflow.md` or the agent
instruction file only with the user's agreement. Keep the doc a map: token names,
roles, scales, component list with file locations, rules that are not obvious from the
code, and remaining drift with counts. Leave values the code already states to the code.

## 6. Verify

Token and component changes ripple. Run the project's build and tests, then the visual
loop from `ui-engineering` (`references/visual-feedback-loop.md`) on every screen that
uses a changed token or component, in every theme and direction. Hand the change to
`ui-guard`. Report counts before and after, the screens checked, and what drift remains.
