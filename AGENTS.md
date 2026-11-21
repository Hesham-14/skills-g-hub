# Repository Guidelines

## Project Structure & Module Organization

This repository packages coding-agent skills. Each skill lives in `skills/<kebab-case-name>/` and starts with `SKILL.md`; put deeper material in `references/`, metadata in `agents/`, and necessary helpers in `scripts/`. Use `templates/skill-template/` for local skills (rename `SKILL.md.template` to `SKILL.md`). `vendor.json` declares upstream sources, `vendor.lock.json` records synced commits, and `scripts/sync-vendor.sh` refreshes vendored folders. `local-sources.json` pins the sources of skills adapted by hand, which the sync does not own. Root documentation lives in `README.md` and `SKILL-SAFETY.md`; `docs/workflow.md` describes how the skills connect.

## Build, Test, and Development Commands

There is no compilation step or package manifest. Syncing requires `git` and `jq`.

- `cp -R templates/skill-template skills/my-new-skill && mv skills/my-new-skill/SKILL.md.template skills/my-new-skill/SKILL.md` — scaffold a local skill.
- `jq empty vendor.json vendor.lock.json local-sources.json` — validate JSON syntax.
- `node --test tests/debate-review.test.mjs` — offline integration checks for the local reviewer.
- `bash -n scripts/sync-vendor.sh` — check the shell script syntax.
- `npx skills add . --list --full-depth` — verify local skill discovery before pushing.
- `./scripts/sync-vendor.sh --check` — compare vendored content with upstream without writing.
- `./scripts/sync-vendor.sh <source-name>` — update one source and its lock entry; review the resulting diff.

## Coding Style & Naming Conventions

Write concise Markdown with descriptive headings. Skill directories and frontmatter `name:` values must match and use kebab-case, for example `grill-me-code`. Make each `description:` state positive activation triggers and a clear `DO NOT USE` boundary. Keep `SKILL.md` focused; move branch-specific detail into `references/*.md`. Use two-space JSON indentation. For Bash, preserve `set -euo pipefail`, quote expansions, and use uppercase names for script-wide variables.

## Testing Guidelines

The automated suites are `tests/debate-review.test.mjs`, `tests/ui-audit.test.mjs` and `tests/ui-workflow.test.mjs`; there is no coverage threshold. Run it alongside the relevant syntax checks above. For a new or renamed skill, run local discovery and confirm its folder, frontmatter name, and referenced files agree. For sync changes, use `--check`, inspect every content-audit finding, then review `git diff --stat` and the full diff.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-case subjects without conventional-commit prefixes, such as `Audit upstream content before the sync writes it`. Keep each commit focused. Pull requests should summarize affected skills, explain source/ref changes, list validation performed, and explicitly call out new scripts, binaries, archives, symlinks, or executable bits. Link related issues when applicable.

## Vendoring & Safety

Read `SKILL-SAFETY.md` before adding or updating an upstream source. Treat `vendor.json` as ownership: the sync replaces every listed skill wholesale, so make local customizations in a separate unlisted folder and record their source pin in `local-sources.json`. Never accept new non-documentation content based only on the audit label; inspect its code and instructions before updating the lockfile.
