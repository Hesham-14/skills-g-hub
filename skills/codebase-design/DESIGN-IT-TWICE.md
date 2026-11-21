# Compare alternatives when the choice matters

Describe the current callers, constraints and concrete behavior once. Compare two
meaningfully different interface shapes against that same evidence, including
staying with or simplifying the current design. A small trade-off can be evaluated
in the current context.

When independent exploration is authorized and useful, give separate agents
bounded read-only design briefs with different constraints (simplest caller,
smallest coherent interface, or a genuine external-dependency requirement).
Do not invent a flexible-for-everything variant or spawn a fixed number of agents.

Each proposal supplies an interface/usage example, what complexity it hides, its
real dependencies, test approach, migration cost and limitations. Recommend one
based on locality and present requirements. Use grill-me-code for a consequential
unresolved choice and its rationale; implementation remains separate.
