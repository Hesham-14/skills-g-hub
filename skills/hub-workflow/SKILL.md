---
name: hub-workflow
description: "Connect planning, implementation, delegation and review in this skills hub. Use for a feature spanning multiple steps, executing a spec or ticket queue, or coordinating review of generated code. DO NOT USE for a simple lookup, personal decisions, or a small edit that needs no workflow coordination."
---

# Hub workflow

Choose the shortest route that completes the user's task. Project instructions and
current authorization determine scope; a skill connection is guidance, not a
background scheduler or permission to publish, merge, or delegate.

Read `docs/agents/workflow.md` if the working project has one. Load other skills by
name through the runtime's available skill mechanism. Do not assume a particular
Skill tool, slash-command syntax, sibling install layout, or CLI exists. If a
named skill is unavailable, use the equivalent brief procedure here and report
the missing capability only if it prevents completion; never install it silently.

## Choose the route

| Situation | Route and stopping boundary |
| --- | --- |
| Unsettled technical plan | `grill-me-code`; persist settled terms and important decisions. |
| Many interdependent decisions across sessions | `wayfinder`; resolve decisions before making build tickets. |
| A design question needs something runnable | `prototype`; return the verdict to the originating plan. |
| Recurring, unclear or intermittent bug | `diagnosing-bugs`; carry its evidence into the fix. |
| Agreed feature too large for one bounded change | `to-spec` then `to-tickets`; skip either artifact if an adequate one already exists. |
| Ready ticket or concrete implementation | Read [execution.md](references/execution.md). Use `tdd` for meaningful behavior at an agreed interface. |
| Screen, form, component, flow or redesign | `ui-engineering` sets the task class and depth; `ui-design-system` for tokens and shared components. A small UI fix goes straight to implementation, a look in the browser and `ui-guard`. |
| Review a change or finish implementation | Read [review.md](references/review.md). |
| Repeated changes spread through the same area | `improve-codebase-architecture` within the requested scope; `codebase-design` for a chosen interface. |

Planning-only requests end with planning. A build request may continue through
settled stages without asking the user to repeat authorization. Pause only for
unresolved choices that change scope, behavior, or a consequential trade-off.
External publishing still needs authorization covering that action.

## Carry context without copying everything

Read the relevant project glossary and ADRs once, then revisit only changed or
newly relevant material. Carry links to the spec, ticket, decisions and diagnostic
evidence. Include the essential acceptance criteria in a fresh implementer's
brief; a link alone is insufficient if that process cannot access it.

Small tasks stay in the current conversation. Long queues keep a compact progress
record with status, verification and unresolved decisions. When a different session
or environment needs that context, tell the user to run `/handoff`; it is
user-invoked, so you cannot call it yourself. Do not force a context reset or
handoff between every step.

This local skill coordinates the existing delegates and guards. It does not
replace their detailed instructions or configure models and accounts.
