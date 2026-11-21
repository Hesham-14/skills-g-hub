---
name: debate-review
description: "Run an independent two-model debate on a local change or PR/MR. Use when explicitly requested or when the project's established review policy requires it. DO NOT USE for every small edit, ordinary guard review, implementation, or automatic PR posting."
license: MIT
---

# Debate review

Requires Node 18+, Git and two available read-only delegate relays. Remote review
also requires the matching authenticated `gh`, `glab` or `az` CLI.

A main reviewer finds issues, a second challenges them, and the main reviewer
adjudicates. Agreed and contested findings remain distinct. Use this additional
pass within the user's task or standing project policy; it can take several model
sessions. It does not replace acceptance checks, guards or real tests.

## Run the appropriate mode

Resolve `<skill-dir>` to this installed skill's directory. Run from the source
project, or pass `--repo-dir` with its absolute path.

```bash
node "<skill-dir>/scripts/review-pr.mjs" --local --base <verified-base-ref> --spec <spec-or-ticket-file>
node "<skill-dir>/scripts/review-pr.mjs" <pr-url-or-number> --dry-run
```

A local review snapshots the working tree and prints findings; it does not contact
a forge. Pick the comparison baseline deliberately. A PR URL also prints by
DEFAULT in this local fork. Use `--post` only when posting comments has explicit
user authorization; it cannot combine with `--local` or `--dry-run`. No mode
approves or merges. A dry run still contacts the remote service and runs models.

The reviewers use `review-main` and `review-debate` fleet lanes. Configure missing
lanes through `delegate-setup` only when authorized; do not choose account/model
settings silently. Explicit `--main <implementer>` and `--debate <implementer>`
can select available relays for one run. Prefer two different implementers/models.
Missing capability is a clear setup requirement, not an invitation to install tools.

The hub's matching sibling delegates are searched before global installed copies;
`DELEGATE_SKILLS_DIR` is an explicit override. Project lanes are validated in the
original repository, then resolved model/effort settings follow the review into
its temporary snapshot. Review permissions always remain read-only. A relay error
or reported write violation fails the run instead of publishing its output.

Use `--help` for options, [schema.md](references/schema.md) for document contracts,
and [comment-format.md](references/comment-format.md) for rendering. Relay the
result and clearly label unresolved disputes. With authorized implementation,
return confirmed findings through `hub-workflow` as a bounded correction. For
review-only work, report findings without editing. No babysit-pr dependency.

Artifacts default to `~/.cache/debate-review/`; `--out-dir` can select an authorized
project/scratch location. They include prompts, review documents and relay
results; treat them as project data. Pass the originating spec/ticket with `--spec`
when available, especially for local or gitignored specs. Its content reaches all
reviewers. Omit the flag when no spec exists and report the missing Spec axis;
retain the separate hub acceptance-criteria check against the user's request.

Local fork of amElnagdy/review-skills at
5b748c654bb060ef6bf86d0e7ae123979082a88a (MIT; see LICENSE).
