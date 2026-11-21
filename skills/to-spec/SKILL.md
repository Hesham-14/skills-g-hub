---
name: to-spec
description: "Turn an agreed technical discussion into a concise implementation specification. Use when asked to write a spec or when authorized multi-step feature work needs a durable agreement. DO NOT USE to reopen settled planning, invent requirements, or document a trivial fix."
---

# Capture the agreement

Synthesize the conversation, current code and relevant domain records. Reuse an
adequate existing spec. Read `docs/agents/issue-tracker.md`; if absent, tell the
user to run `/setup-matt-pocock-skills` to establish local project conventions.
It is user-invoked, so you cannot call it yourself; continue with what the current
request already settles. A standalone spec request can simply use the requested path.

Write only what changes implementation decisions:

- Problem and intended user-visible result.
- In-scope behavior and acceptance criteria; user stories only where they clarify actors.
- Settled interfaces, data/interaction decisions and relevant ADR/prototype links.
- Testing: observable interfaces, critical behavior, existing test patterns and commands.
- For a significant UI change: the UI brief from `ui-engineering` (journey, states,
  screens, breakpoints/themes, UI acceptance criteria), not a second copy of it.
- Out of scope, open decisions and dependencies.

Match length to the feature. Do not inflate stories, repeat glossary definitions,
freeze a guessed file layout, or choose a single test interface merely to reduce
its count. Preserve a small decision-rich prototype snippet only when prose would
lose its meaning. Distinguish verified repository facts from proposed behavior.

Use interfaces already agreed in the conversation or existing project conventions.
Propose new ones when needed; ask only if the choice changes the product contract
or a consequential trade-off. Mark unresolved requirements as open/blocked, never
quietly settle them by writing a spec.

Write to the configured tracker or requested location. A local tracker means
`.scratch/<feature>/spec.md`; remote publishing requires authorization for that
write. When publishing is not authorized, produce a local draft and its intended
destination. Do not apply an invented triage label or mark a blocked spec ready.

For an authorized multi-step build, continue to `to-tickets` once the agreement is
settled. For a spec-only request, end with the spec and any open decisions.

Adapted from Matt Pocock's to-spec v1.2.3 (MIT; see LICENSE).
