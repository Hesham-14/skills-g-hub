---
name: improve-codebase-architecture
description: "Investigate architectural friction and propose scoped improvements grounded in real callers and tests. Use for an architecture audit, repeated changes scattered across modules, or recurring bugs that cannot be tested faithfully. DO NOT USE for routine diff cleanup, a trivial bug, or unsolicited repository-wide redesign."
---

# Find changes that reduce maintenance work

Start with the user's named area or recurring pain. Otherwise use recent history
and actual callers to choose hotspots. Read relevant domain records and ADRs,
then consult `codebase-design` for interface, depth and locality principles.

Investigate evidence, not a quota of candidates:

- Understanding one behavior requires hopping between many coupled files.
- Pass-through wrappers duplicate interfaces without hiding meaningful complexity.
- The same business rule is implemented independently in several places.
- Tests substitute internal collaborators while real failures occur between callers.
- Dead or dummy production paths exist where real behavior was required.

For each candidate, identify real callers, current behavior, relevant tests, the
maintenance friction, and what simpler structure would remove it. Apply the
codebase-design deletion test correctly: if removing a layer removes complexity,
that layer may be unnecessary; if complexity spreads to callers, it was doing work.
Do not infer poor design merely from file count, short functions or similar text.

## Present a bounded recommendation

Show a before/after diagram when it clarifies dependencies. Mermaid in a report
is sufficient; use self-contained HTML for interactive comparisons when useful.
Do not require a CDN, browser tool, or elaborate visual for a one-candidate finding.

Report candidate scope, evidence, proposed change, expected test impact, migration
risk and uncertainty. Expected benefits are judgments, not measured token savings.
If nothing warrants change, say so without inventing a refactor.

A review request stops at recommendations. For an authorized refactor, continue
with the selected/agreed candidate; otherwise ask which consequential option the
user wants. Use `grill-me-code` for unresolved choices and persistent rationale.
Consult codebase-design's alternatives reference only if competing interface
shapes are worth exploring; do not launch a multi-agent design contest by default.

A multi-step migration goes through `to-spec`/`to-tickets`; a bounded one through
`hub-workflow`. Preserve behavior and regression coverage. `clean-code-guard`
reviews implementation quality after the change; this skill owns identifying and
planning the architectural improvement, not a duplicate line-by-line review.

Adapted from Matt Pocock's improve-codebase-architecture v1.2.3 (MIT; see LICENSE).
