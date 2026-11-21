#!/usr/bin/env bash
# Sync vendored skills declared in vendor.json into skills/.
#
#   ./scripts/sync-vendor.sh              # sync every source
#   ./scripts/sync-vendor.sh guard-skills # sync one source by name
#   ./scripts/sync-vendor.sh --check      # report drift, change nothing
#   ./scripts/sync-vendor.sh --yes        # accept the content audit without prompting
#
# Vendored skill folders are REPLACED wholesale. Do not hand-edit them; put
# your own overrides in a separate skill folder instead.
#
# Nothing is written until every source has been cloned and audited. The audit
# reports what a `git diff` will not make obvious: files that are not
# documentation, files carrying the executable bit, symlinks, and binaries or
# archives whose diff is unreadable. It judges nothing — it only makes arrival
# explicit, so reading the code stays your job. See SKILL-SAFETY.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT/vendor.json"
LOCKFILE="$ROOT/vendor.lock.json"
SKILLS_DIR="$ROOT/skills"

command -v jq >/dev/null || { echo "error: jq is required (brew install jq)" >&2; exit 1; }
command -v git >/dev/null || { echo "error: git is required" >&2; exit 1; }
[ -f "$MANIFEST" ] || { echo "error: $MANIFEST not found" >&2; exit 1; }

CHECK_ONLY=0
ASSUME_YES=0
FILTER=""
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    -*) echo "error: unknown flag $arg" >&2; exit 1 ;;
    *) FILTER="$arg" ;;
  esac
done

TMPDIR_="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_"' EXIT

# Written in phase 1, replayed in phase 3, so a problem in the last source
# cannot land after the first source has already been copied.
PLAN="$TMPDIR_/plan.tsv"
FINDINGS="$TMPDIR_/findings.tsv"
: > "$PLAN"
: > "$FINDINGS"

# --- audit ------------------------------------------------------------------

# What this hub expects a skill to be made of. Everything else gets reported.
is_doc_file() {
  case "$1" in
    *.md|*.txt|*.json|*.yaml|*.yml) return 0 ;;
  esac
  case "$(basename "$1")" in
    LICENSE|LICENCE|COPYING|NOTICE) return 0 ;;
    LICENSE.*|LICENCE.*|COPYING.*|NOTICE.*) return 0 ;;
  esac
  return 1
}

is_archive() {
  case "$1" in
    *.tar|*.tar.gz|*.tgz|*.tar.bz2|*.tbz|*.tar.xz|*.txz) return 0 ;;
    *.zip|*.gz|*.bz2|*.xz|*.7z|*.rar|*.jar) return 0 ;;
  esac
  return 1
}

# `grep -I` calls an empty file binary, so size is checked first.
is_binary() {
  [ -s "$1" ] || return 1
  if grep -qI . "$1" 2>/dev/null; then return 1; fi
  return 0
}

# audit_tree <source> <skill> <upstream-dir> <local-dir>
audit_tree() {
  src="$1"; skill="$2"; from="$3"; to="$4"
  while IFS= read -r f; do
    rel="${f#"$from"/}"
    reasons=""
    is_doc_file "$rel" || reasons="not a documentation file"
    if [ -L "$f" ]; then
      reasons="${reasons:+$reasons, }symlink"
    else
      [ -x "$f" ] && reasons="${reasons:+$reasons, }executable bit set"
      if is_archive "$rel"; then
        reasons="${reasons:+$reasons, }archive"
      elif is_binary "$f"; then
        reasons="${reasons:+$reasons, }binary"
      fi
    fi
    [ -n "$reasons" ] || continue
    if [ -e "$to/$rel" ]; then state="known"; else state="NEW"; fi
    printf '%s\t%s\t%s\t%s\t%s\n' "$src" "$skill" "$rel" "$reasons" "$state" >> "$FINDINGS"
  done < <(find "$from" \( -type f -o -type l \) | sort)
}

# --- phase 1: clone, plan, audit -------------------------------------------

entries="$(jq -c '.sources[]' "$MANIFEST")"
[ -n "$entries" ] || { echo "nothing to sync: vendor.json has no sources"; exit 0; }

lock_entries=()

while IFS= read -r src; do
  name=$(jq -r '.name'         <<<"$src")
  repo=$(jq -r '.repo'         <<<"$src")
  # Omit "ref" (or set it to "HEAD") to follow the source's default branch.
  ref=$(jq  -r '.ref // "HEAD"' <<<"$src")
  path=$(jq -r '.path // "skills"' <<<"$src")

  if [ -n "$FILTER" ] && [ "$FILTER" != "$name" ]; then
    continue
  fi

  echo "==> $name  ($repo @ $ref)"
  clone="$TMPDIR_/$name"
  if [ "$ref" = "HEAD" ]; then
    git clone --quiet --depth 1 "$repo" "$clone"
  elif ! git clone --quiet --depth 1 --branch "$ref" "$repo" "$clone" 2>/dev/null; then
    # Not a branch or tag — could be a bare commit SHA, which --branch rejects.
    git clone --quiet "$repo" "$clone"
    git -C "$clone" checkout --quiet "$ref"
  fi
  sha="$(git -C "$clone" rev-parse HEAD)"

  # bash 3.2 (macOS default) has no mapfile, so read into an array the long way.
  skills=()
  while IFS= read -r s; do [ -n "$s" ] && skills+=("$s"); done < <(jq -r '.skills[]?' <<<"$src")
  if [ "${#skills[@]}" -eq 0 ]; then
    # No explicit list: take every skill folder the source ships.
    while IFS= read -r s; do [ -n "$s" ] && skills+=("$s"); done < <(
      find "$clone/$path" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort
    )
  fi

  for skill in "${skills[@]}"; do
    from="$clone/$path/$skill"
    to="$SKILLS_DIR/$skill"

    if [ ! -d "$from" ]; then
      echo "    !! $skill — not found upstream, skipping" >&2
      continue
    fi

    audit_tree "$name" "$skill" "$from" "$to"

    if [ "$CHECK_ONLY" -eq 1 ]; then
      if [ ! -d "$to" ]; then
        echo "    +  $skill (missing locally)"
      elif diff -rq "$from" "$to" >/dev/null 2>&1; then
        echo "    =  $skill"
      else
        echo "    ~  $skill (differs from upstream)"
      fi
      continue
    fi

    printf '%s\t%s\t%s\t%s\n' "$name" "$skill" "$from" "$to" >> "$PLAN"
  done

  lock_entries+=("$(jq -n \
    --arg name "$name" --arg repo "$repo" --arg ref "$ref" \
    --arg commit "$sha" --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson skills "$(printf '%s\n' "${skills[@]}" | jq -R . | jq -s .)" \
    '{name: $name, repo: $repo, ref: $ref, commit: $commit, synced_at: $at, skills: $skills}')")
done <<<"$entries"

# --- phase 2: report the audit and decide -----------------------------------

if [ -s "$FINDINGS" ]; then
  total=$(wc -l < "$FINDINGS" | tr -d ' ')
  fresh=$(awk -F'\t' '$5 == "NEW"' "$FINDINGS" | wc -l | tr -d ' ')
  echo
  echo "!! content audit — $total file(s) are not plain documentation ($fresh new)"
  echo
  awk -F'\t' '{ printf "   %-6s %-22s %-40s %s\n", $5, $2, $3, $4 }' "$FINDINGS"
  echo
  echo "   NEW means the file is not in skills/ yet. A skill folder can ship code"
  echo "   that runs with your agent's permissions — read these before accepting"
  echo "   them. Background: SKILL-SAFETY.md"
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
  echo
  echo "check only — nothing was written."
  exit 0
fi

if [ -s "$FINDINGS" ]; then
  echo
  if [ "$ASSUME_YES" -eq 1 ]; then
    echo "   --yes given — continuing without asking."
  else
    reply=""
    if [ -c /dev/tty ] && [ -r /dev/tty ]; then
      printf '   Write these into skills/? [y/N] '
      read -r reply < /dev/tty || reply=""
    elif [ -t 0 ]; then
      printf '   Write these into skills/? [y/N] '
      read -r reply || reply=""
    else
      echo "error: the audit needs confirmation and there is no terminal to ask on." >&2
      echo "       Re-run interactively, or pass --yes once you have read the list." >&2
      exit 1
    fi
    case "$reply" in
      y|Y|yes|YES|Yes) ;;
      *) echo; echo "aborted — nothing was written."; exit 1 ;;
    esac
  fi
  echo
fi

# --- phase 3: write ---------------------------------------------------------

synced=0
last_source=""
while IFS=$'\t' read -r name skill from to; do
  [ -n "$skill" ] || continue
  if [ "$name" != "$last_source" ]; then
    echo "==> writing $name"
    last_source="$name"
  fi
  rm -rf "$to"
  mkdir -p "$SKILLS_DIR"
  cp -R "$from" "$to"
  echo "    ok $skill"
  synced=$((synced + 1))
done < "$PLAN"

if [ "${#lock_entries[@]}" -gt 0 ]; then
  # Merge over the previous lock instead of replacing it: a filtered sync must not
  # drop the entries of sources it did not touch. Names no longer in vendor.json
  # fall out, because the manifest is the source of truth for what is vendored.
  known="$(jq -c '[.sources[].name]' "$MANIFEST")"
  previous='[]'
  [ -f "$LOCKFILE" ] && previous="$(jq -c '.sources // []' "$LOCKFILE")"

  printf '%s\n' "${lock_entries[@]}" \
    | jq -s --argjson prev "$previous" --argjson known "$known" \
        '($prev + .)
         | group_by(.name) | map(last)
         | map(select(.name as $n | $known | index($n)))
         | sort_by(.name)
         | {sources: .}' > "$LOCKFILE"
fi

echo
echo "synced $synced skill(s). lockfile: vendor.lock.json"
echo "review with:  git -C \"$ROOT\" diff --stat"
