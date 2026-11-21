# Debate review integration audit

Inspected 2026-09-06. Upstream: amElnagdy/review-skills commit
`5b748c654bb060ef6bf86d0e7ae123979082a88a`. Local integration targets the hub's
unchanged delegate-skills v0.5.0. This audit distinguishes source behavior from
local changes; it is not a claim of real-model review quality.

## Payload inspected

The folder contains eight Node ESM scripts, three prompt Markdown assets, two
reference Markdown files and SKILL.md. The upstream MIT LICENSE is retained.
No binary, archive, symlink or package dependency was imported. The eight `.mjs`
files are executable code, but none carries the filesystem executable bit. Node
built-ins are the only imports outside this folder.

| Files | What they do |
| --- | --- |
| scripts/review-pr.mjs | Parse target/mode; obtain PR or local snapshot; run reviewers; validate and render results; print or post; retain artifacts and clean temporary checkout. |
| scripts/lib/dispatch.mjs | Discover relays; resolve lane configuration; probe help; run external model CLIs read-only; read result.json and parse returned JSON. |
| scripts/lib/local.mjs | Snapshot committed plus visible dirty/untracked state into a temporary local clone. Handles gitlinks, symlinks, filters and file modes. Rejects conflicts, hidden index bits and unsupported special/path states. |
| scripts/lib/forge.mjs | Read remote data and optionally post through gh/glab/az. Azure obtains an access token through az and passes it to Git via environment, not a token-bearing command argument. |
| scripts/lib/shell.mjs | spawnSync wrappers with argument arrays and explicit exit handling. |
| scripts/lib/diff.mjs | Map diff lines and anchor findings; unanchorable findings remain in the summary. |
| scripts/lib/render.mjs | Render agreed/contested findings and severity. |
| scripts/lib/validate.mjs | Validate reviewer document shapes and ID coverage; it does not verify the truth of model claims. |
| assets/prompts/* | Read-only main review, challenge and final adjudication instructions. |

## Local changes

1. A remote target prints by default. Publishing requires `--post`; incompatible
   --local/--dry-run combinations fail. --force alone does not enable posting.
2. Relay discovery tries an explicit DELEGATE_SKILLS_DIR, then hub/installed sibling
   skills, then the usual global roots. This avoids silently selecting stale global
   relays while running from the hub. It does not install missing dependencies.
3. Resolve trusted project lanes in the original repo with the actual v0.5.0 lane
   helper. Pass resolved model/effort/variant/provider and timeout dials to the
   temporary review workspace without re-resolving --lane there. Review permission
   stays read-only even if an implementation lane has write-capable settings.
4. Relay spawn errors, nonzero exits and reported read-only violations stop the run.
   Remove the previous role result before a retry so a failed launch cannot reuse
   old success output.
5. `--spec <file>` reads the actual agreed spec/ticket from the source project and
   supplies it to all three reviewer prompts, including gitignored local specs.
6. Entry instructions no longer require babysit-pr or claim every PR review must
   run this expensive path. hub-workflow routes it by user request/project policy.

## Boundaries retained from upstream

Local snapshots make temporary commits, not commits in the source branch. Source
Git clean filters may execute as part of hashing; this is not a sandbox for opening
arbitrary untrusted repositories. Dirty submodule working trees are excluded (the
superproject gitlink is represented). Without --spec, local mode skips the Spec
axis; remote automatic extraction takes up to two issue references and truncates
that gathered material. Use --spec for a precise complete local agreement.

Read-only guarantees depend on the relay/runtime; a reported violation is now a
failure, but absence of such a report is not a universal security proof. Artifacts
hold project prompts/results. Remote modes access the selected forge and models;
no live model, account configuration or remote posting was exercised in this task.
GitLab partial posting recovery is not made transactional by this integration;
inspect a failed publishing result before retrying. Automated merging is absent.

## Validation

- Four hub integration tests passed using fake external model responses, real
  temporary Git repositories, and the real project config/trust helper. Covered
  print default/explicit publishing flags, spec delivery, source preservation,
  lane trust across snapshots, failed retries and read-only violations.
- Upstream local snapshot suite: 35 passed, one platform-dependent case skipped,
  zero failures. Imported local.mjs remains identical to that tested source.
- Node syntax checks cover every imported script. Skill discovery lists the hub;
  no newly added skill exists in the checked AI-tool installation directories.

Primary evidence: the pinned source and this hub's
`tests/debate-review.test.mjs`, `skills/debate-review/`, and
`skills/delegate-setup/scripts/{config,lane}.mjs`.
