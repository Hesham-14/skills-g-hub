---
name: codebase-design
description: "Design a module interface that hides real complexity and concentrates change. Use when choosing an interface or test seam, consolidating duplicated business rules, or comparing concrete architecture alternatives. DO NOT USE to invent abstraction layers, audit an entire repo unasked, or replace routine code review."
---

# Design for real callers

A module exposes an interface and hides implementation. Its interface includes
signatures, invariants, ordering, errors and required configuration. Depth is how
much useful behavior callers get through a small understandable interface;
locality means a change or bug can be understood and fixed in one place.
A seam is a place where behavior can vary without rewriting its callers; an
adapter supplies an actual implementation there. Use these terms when helpful,
while preserving the project's established vocabulary.

Before proposing a layer, inspect the existing callers and the behavior it owns.
Prefer reusing or simplifying an existing interface. Similar text is not evidence
of the same business rule; consolidate duplicated knowledge, not unrelated code.

- **Deletion test:** if deleting a wrapper removes complexity, consider removing it.
  If that complexity reappears across callers, the wrapper was earning its place.
- **Keep contracts coherent:** a smaller method list is useful only if callers also
  need fewer hidden assumptions, ordering rules and configuration details.
- **Test the real interface:** choose a test surface that observes the requirement
  without coupling to internals. A faithful integration test can be better than
  many mocked unit tests.
- **Justify substitution:** introduce injection/ports for actual external boundaries
  or real variants. Do not create a second dummy adapter to justify an invented seam.
- **Preserve necessary side effects:** isolate calculation when useful; do not turn
  all operations into pure functions or erase real persistence requirements.

Read [DEEPENING.md](DEEPENING.md) when planning consolidation across dependencies.
Read [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md) only when alternative interface designs
would resolve a meaningful trade-off. Use `grill-me-code` to settle such choices
and record important reasons; `tdd` implements behavior, and `clean-code-guard`
checks the final code. Reviewing this vocabulary alone never authorizes refactoring.

Adapted from Matt Pocock's codebase-design v1.2.3 (MIT; see LICENSE).
