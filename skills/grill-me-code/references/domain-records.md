# Persist terms and decisions

Adapted from Matt Pocock's domain-modeling v1.2.3 (MIT; see ../LICENSE).

Read the project's `docs/agents/domain.md` when present. Otherwise follow existing
`CONTEXT-MAP.md` links or use root `CONTEXT.md` and `docs/adr/`. Create files lazily
when something has actually been agreed. Respect project-specific locations.

## Glossary

When a project term is overloaded, distinguish it with a concrete scenario and
check the code's current meaning. Once resolved, update the relevant glossary:

```markdown
**Order**: The customer's accepted purchase, containing one or more line items.
_Avoid_: Cart (the editable selection before purchase).
```

Keep definitions short and specific to the domain. Reuse existing terms. Record
synonyms to avoid only when they caused ambiguity. CONTEXT.md holds vocabulary;
keep implementation choices, meeting logs and feature requirements elsewhere.

## Important decisions

Record an agreed decision and its reason as an ADR when it is costly to reverse,
surprising without context, and the result of a real trade-off. Use the project's
format; otherwise a numbered `docs/adr/NNNN-slug.md` with context, choice, reason
and meaningful rejected alternative is enough. Do not ask again to document a
decision the user already settled within the planning task. Mark unsettled
proposals as such; do not turn the agent's suggestion into an accepted decision.

Preserve earlier rationale when superseding a decision. Keep routine reversible
feature choices in the spec or a compact planning note in the existing scratch
area. Link to records rather than copying their full bodies into every ticket.
