# Execute a ticket or queue

Before implementation, read the originating ticket/spec and applicable decisions.
Record the review baseline (commit plus any pre-existing staged, unstaged and
untracked work), the acceptance criteria, and the project's actual verification
commands. Do not absorb unrelated user work into the task's diff.

## Direct or delegated

Implement directly by default. When the user has authorized delegation, use the
appropriate available `codex-delegate`, `claude-delegate`, or `agy-delegate` skill.
Read the configured lane map; do not invent models, assume authenticated accounts,
or rewrite fleet configuration. `delegate-setup` owns configuration changes.

Add these facts to the chosen delegate's existing brief format, omitting empty fields:

- Ticket/spec reference, acceptance criteria and out-of-scope behavior.
- Relevant glossary/ADR references and already settled interfaces under test.
- For bugs: exact reproduction, observations, ruled-out explanations, next probe.
- Verification commands and the baseline the reviewer will compare against.
- Expected report: changed behavior, evidence per criterion, remaining uncertainty.

For UI work, also add (from `ui-engineering`'s UI brief when one exists):

- UI class (trivial / standard / significant / redesign) and design context: the
  screens or files that define the existing look, the design doc, the approved direction.
- Target screens/routes and the states to implement and check.
- Tokens and components to reuse; dependency, CSP and copy-language constraints.
- Breakpoints, themes and text direction to verify.
- The app's run command, URL and preview/auth mode, and the browser test command.
- Expected evidence: screenshots per viewport/theme/state and browser test results,
  or the reason each could not be produced.

Use the `ui` lane when `delegate-setup` configured one. An implementer without a
browser still owes the evidence it can produce; the orchestrator runs the visual
feedback loop on the returned diff before review.

Use `tdd` when implementing substantial behavior or a regression at an appropriate
interface. Skip test-first ceremony for prose, config-only edits, disposable
prototypes and mechanically verified changes. The implementer must still run
checks appropriate to the change. Return generated diffs through
[review.md](review.md) before treating the task as complete.

## Queue dependencies

Work only tickets whose blockers are verified complete. Sequential execution is
the default. If parallel work is authorized and useful, isolate independent
writes in separate worktrees/branches; account for shared interfaces, migrations,
generated files and lockfiles, not just filenames. Never switch or reset a dirty
working tree to create that isolation.

For a long queue, record queued / implementing / reviewed / integrated states,
verification and commit references where available, plus blockers. A delegate's
success report is not an integration result. After dependent changes are combined,
run relevant checks on the combined tree before releasing their successors.

Do not create a second progress database when the tracker already serves this
purpose. Match its existing states. Finish with a coherence check of the combined
feature; publish, push, close external issues or merge only within authorization.
