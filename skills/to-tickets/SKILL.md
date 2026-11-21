---
name: to-tickets
description: "Split an agreed spec or plan into verifiable implementation tickets with acceptance criteria and blockers. Use for a ticket breakdown or authorized multi-step feature work. DO NOT USE for decision mapping, incoming-report triage, or a change small enough to implement directly."
---

# Slice the implementation

Read the originating spec/plan and its corrections. Reuse facts already gathered.
Resolve missing product decisions through `grill-me-code`; do not turn unknowns
into apparently ready build tickets. Read project tracker configuration. If it is
missing, tell the user to run `/setup-matt-pocock-skills`; it is user-invoked, so
you cannot call it yourself.

Each ticket should deliver an independently verifiable behavior through the
layers it actually needs. Avoid separate database/API/UI tickets when none can
prove useful behavior alone. Do not invent layers a feature does not have.

For a wide mechanical migration, use expand → migrate in bounded batches →
contract, preserving compatibility until callers migrate. If batches cannot pass
independently, explicitly use an integration branch and make its final combined
verification the blocker for downstream work.

## Ticket contract

- Title and source spec reference.
- What it delivers and acceptance criteria.
- Blocked by: concrete ticket links/numbers, or none.
- Relevant agreed interfaces and decision/prototype references.
- Verification approach; executable commands can be resolved at dispatch.
- For a ticket that changes rendered UI: its screens, states, breakpoints/themes and
  the evidence that proves it, taken from the spec's UI brief (`ui-engineering`).
- Status and unresolved dependencies, following the project's tracker conventions.

Show the breakdown with its dependency order. Honor earlier approved granularity;
ask only about unresolved scope or significant dependency choices. Check for cycles,
missing blockers and duplicated deliverables before publication. A parent link is
not a blocking relationship.

For local work write one file per ticket in `.scratch/<feature>/issues/`, following
configured numbering. Check existing files before creating new ones. For remote
work create/update only within authorization, create identifiers first and wire
native blocking in a second pass where supported, or record explicit body links.
If publication is outside scope, leave concrete local drafts. Do not close the
parent or infer acceptance from creating a ticket.

When implementation is authorized, use `hub-workflow` to execute the ready frontier
and verify combined work. Ticket generation alone never starts a delegate or a
parallel scheduler. For a breakdown-only request, finish with the tickets.

Adapted from Matt Pocock's to-tickets v1.2.3 (MIT; see LICENSE).
