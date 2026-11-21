# Review the result

Use the same contract for direct implementation and delegated work. Fixes are
authorized by a build/fix task; a review-only request produces findings.

## Two questions, one coordinated pass

1. **Does it implement the agreement?** Compare the complete change to the
   originating spec/ticket and current user corrections. Check each acceptance
   criterion, omissions, incorrect behavior and scope creep. If no spec exists,
   use the user's actual request; do not fabricate one from the implementation.
2. **Is the implementation sound?** Apply only the relevant guards below and
   verify against the real project. Keep findings separate from test outcomes.

| Changed material | Guard |
| --- | --- |
| Non-trivial production code | `clean-code-guard` |
| Test code | `test-guard` |
| Documentation | `docs-guard` |
| WordPress APIs | `wp-guard` |
| WooCommerce APIs | `woo-guard`; add WordPress-specific checks only where relevant |
| Rendered UI: templates, components, styles, client scripts | `ui-guard`, with browser evidence; `clean-code-guard` still covers the code itself |
| A significant UI flow without a browser test | `ui-e2e-tests`; its test code then goes to `test-guard` |

A successful build, type check or source reading is not visual verification. When the
UI could not be rendered, report its visual gate as blocked or unavailable with the
reason, never as passed.

Load branch references only when needed. Merge duplicate findings from overlapping
guards into one actionable item. Do not repeat an unchanged review because another
stage names the same guard. A later edit requires checking the affected findings
and behavior again, not automatically rereading the entire repository.

Review edits to existing tests before trusting green results: removed coverage,
weakened assertions and new skips must not conceal the failure. Preserve genuine
regression coverage, including when architecture changes move its test interface.
Run the relevant actual gates on the resulting tree. Delegated gates must be
independently verified; report failed or unavailable checks honestly.

## Independent debate

Use `debate-review` when the user requests it or the project's explicit review
policy calls for independent review of this change. It is an additional reviewer,
not a replacement for acceptance criteria or real tests. For a local change use
`--local`; for a PR use the print-only default. Posting comments needs explicit
authorization and `--post`. Missing reviewer lanes are a setup need, not a reason
to fabricate a second opinion or install tools automatically.

Return confirmed findings to implementation as a narrow correction, retaining
the original evidence. An unresolved product/architecture choice returns to
`grill-me-code`. Uncertain bug causality returns to `diagnosing-bugs`. Neither
review disagreement nor a failed check authorizes an unrelated redesign.

Report what changed, criteria verified, checks run and unresolved limitations.
Do not claim consensus where reviewers remain in disagreement. Completion,
commit, push and merge are separate actions governed by the user's scope.
