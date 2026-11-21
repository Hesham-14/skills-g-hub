---
name: wayfinder
description: "Map and resolve interdependent technical decisions across sessions. Use for a large uncertain project whose prerequisites cannot be settled in one planning conversation. DO NOT USE for a well-scoped feature, implementation queue, or personal life decision."
---

# Find the path before building

Keep a durable map of decisions, not a second implementation backlog. Read the
project tracker configuration. If it is missing, tell the user to run
`/setup-matt-pocock-skills`; it is user-invoked, so you cannot call it yourself.
A local map is sufficient for one human and multiple agent sessions.

## Chart

Use `grill-me-code` to settle the destination and scope, saving agreed terms and
important decisions through its domain-records reference. If the route is already
clear, use `to-spec` or proceed with the authorized bounded task; no map is needed.

Write a map with Destination, Notes/constraints, Decisions so far (linked one-line
answers), Not yet specified (in-scope uncertainty), and Out of scope. Keep the
answer's detail in its decision ticket. Chart only questions you can phrase now;
unknown future detail remains in Not yet specified.

Each decision ticket has a question, type, blockers, status and session owner:

- Research: use `research` for external facts; inspect local code directly when sufficient.
- Prototype: use `prototype` for a runnable answer; return its evidence and verdict.
- Grilling: use `grill-me-code` for choices the human must make.
- Task: bounded prerequisite work needed to make a decision, within authorization.

Local paths and states are defined by the tracker setup (decision tickets live
separately from implementation tickets). On a remote tracker, create identifiers
before wiring blockers. Publishing/updating remotely requires authorization.

## Work the ready frontier

Load the map index, then the selected open, unclaimed ticket whose blockers are
resolved. If none was specified, choose the first eligible ticket in map order.
Claim it with a session identifier and work only the relevant question. Shared
human account assignment is not enough to distinguish AI sessions, and a local
status file is not an atomic lock: coordinate one writer unless the tracker offers
reliable claims. Never silently take another live session's claim.

Resolve with an answer, evidence links and any consequential ADR. Update the map
index, surface newly precise questions, and reassess dependent tickets. Retain
history when superseding or ruling out a ticket; do not delete previous evidence.
An excluded blocker requires re-planning its dependents, not pretending it passed.

Human choices require the human's answer. Reading, analysis and authorized
prerequisite work may continue independently. Work one decision at a time; an
explicit request to continue through the map permits further ready decisions
without a forced fresh session. Do not start background agents simply to fill the
frontier; use them only when authorized and the independent work justifies cost.

When the path is clear, synthesize `to-spec` then `to-tickets` if the planned build
is substantial. A planning-only request ends there. `hub-workflow` coordinates
subsequent authorized execution; decision resolution alone never launches it.

Adapted from Matt Pocock's wayfinder v1.2.3 (MIT; see LICENSE).
