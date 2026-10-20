#!/usr/bin/env bash
# Isolated agent worktrees. Run with Bash, including from fish.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"

fail() { printf 'agent-worktree: %s\n' "$*" >&2; exit 1; }
usage() {
  printf 'Usage: %s add <repo-dir> <name> [base]\n       %s rm <repo-dir> <name> [--force]\n       %s ls\n' "$0" "$0" "$0" >&2
  exit 2
}
valid_name() { [[ $1 =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]]; }
root="$HOME/code/.lab-scratch/wt"
# Never follow a substituted namespace when creating or removing worktrees.
for directory in "$HOME/code" "$HOME/code/.lab-scratch" "$root"; do
  [[ ! -L $directory ]] || fail "managed parent is a symlink: $directory"
done
[[ $# -ge 1 ]] || usage
command=$1
shift
if [[ $command == ls ]]; then
  [[ $# == 0 ]] || usage
  [[ -d $root ]] || exit 0
  for namespace in "$root"/*; do
    [[ -d $namespace && ! -L $namespace ]] || continue
    for worktree in "$namespace"/*; do
      [[ -d $worktree && ! -L $worktree && -f $worktree/.git ]] || continue
      git -C "$worktree" rev-parse --is-inside-work-tree >/dev/null 2>&1 || continue
      printf '%s\t%s\n' "$worktree" "$(git -C "$worktree" symbolic-ref --short -q HEAD || printf '(detached)')"
    done
  done
  exit 0
fi
[[ $command == add || $command == rm ]] || usage
[[ $# -ge 2 && $# -le 3 ]] || usage
repo=$(cd -- "$1" && pwd -P) || fail 'repository directory does not exist'
name=$2
valid_name "$name" || fail 'name must contain only letters, digits, underscores and hyphens, and start with a letter or digit'
[[ $(git -C "$repo" rev-parse --show-toplevel) == "$repo" ]] || fail 'repo-dir must be the repository root'
basename=${repo##*/}
valid_name "$basename" || fail 'repository basename is not a safe namespace'
namespace="$root/$basename"
worktree="$namespace/$name"
[[ ! -L $namespace && ! -L $worktree ]] || fail 'managed path is a symlink'
if [[ $command == rm ]]; then
  force=${3:-}
  [[ -z $force || $force == --force ]] || usage
  [[ -d $worktree && -f $worktree/.git ]] || fail 'managed worktree does not exist'
  source_common=$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)
  target_common=$(git -C "$worktree" rev-parse --path-format=absolute --git-common-dir)
  [[ $source_common == "$target_common" ]] || fail 'worktree belongs to another repository'
  [[ $(git -C "$worktree" rev-parse --show-toplevel) == "$worktree" ]] || fail 'worktree root does not match managed path'
  [[ -n $force || -z $(git -C "$worktree" status --porcelain --untracked-files=all) ]] || fail 'worktree has uncommitted changes; use --force to remove it'
  branch=$(git -C "$worktree" symbolic-ref --short -q HEAD || true)
  if [[ -n $force ]]; then
    git -C "$repo" worktree remove --force "$worktree"
  else
    git -C "$repo" worktree remove "$worktree"
  fi
  # Delete only our named branch, and only with an explicit ancestry proof.
  if [[ $branch == "$name" ]] && git -C "$repo" merge-base --is-ancestor "$branch" refs/remotes/origin/main; then
    git -C "$repo" branch -D -- "$branch"
  elif [[ -n $branch ]]; then
    printf 'Kept branch %s (not proven merged into origin/main).\n' "$branch"
  fi
  exit 0
fi
base=${3:-main}
git check-ref-format "refs/heads/$base" >/dev/null || fail 'invalid base branch'
[[ ! -e $worktree ]] || fail 'managed path already exists'
git -C "$repo" show-ref --verify --quiet "refs/heads/$name" && fail 'branch already exists'
git -C "$repo" fetch origin
git -C "$repo" rev-parse --verify "refs/remotes/origin/$base^{commit}" >/dev/null
mkdir -p -- "$namespace"
if git -C "$namespace" rev-parse --show-toplevel >/dev/null 2>&1; then
  fail 'managed worktree parent is inside a repository'
fi
git -C "$repo" worktree add -b "$name" "$worktree" "refs/remotes/origin/$base"

clone_dependencies() {
  [[ -f $repo/package-lock.json && -f $worktree/package-lock.json && -d $repo/node_modules && ! -L $repo/node_modules ]] || return 1
  cmp -s "$repo/package-lock.json" "$worktree/package-lock.json" || return 1
  local modules relative
  for modules in "$repo/node_modules" "$repo"/apps/*/node_modules "$repo"/packages/*/node_modules; do
    [[ -d $modules ]] || continue
    [[ ! -L $modules ]] || return 1
    relative=${modules#"$repo/"}
    [[ -d ${worktree}/${relative%/*} || $relative == node_modules ]] || return 1
    cp -cR "$modules" "$worktree/$relative" || return 1
  done
  # Relative npm workspace links retain their meaning in the new tree. Rewrite
  # absolute links into the source tree, and reject external or dangling links.
  node - "$repo" "$worktree" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [source, target] = process.argv.slice(2);
function inside(root, p) { return p === root || p.startsWith(root + path.sep); }
function scan(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(p);
      const resolved = path.resolve(path.dirname(p), link);
      if (inside(source, resolved)) {
        const replacement = path.join(target, path.relative(source, resolved));
        fs.unlinkSync(p);
        fs.symlinkSync(path.relative(path.dirname(p), replacement), p);
      } else if (!inside(target, resolved)) {
        throw new Error(`External dependency symlink: ${p}`);
      }
      if (!fs.existsSync(p) || !inside(target, fs.realpathSync(p))) {
        throw new Error(`Dependency symlink does not resolve in new worktree: ${p}`);
      }
    } else if (entry.isDirectory()) scan(p);
  }
}
scan(path.join(target, 'node_modules'));
for (const group of ['apps', 'packages']) {
  const parent = path.join(target, group);
  if (!fs.existsSync(parent)) continue;
  for (const entry of fs.readdirSync(parent, {withFileTypes: true})) {
    const modules = path.join(parent, entry.name, 'node_modules');
    if (entry.isDirectory() && fs.existsSync(modules)) scan(modules);
  }
}
NODE
}
if clone_dependencies; then
  printf 'Cloned dependencies with copy-on-write; workspace links verified.\n'
else
  printf 'Installing dependencies with npm ci.\n'
  (cd -- "$worktree" && npm ci --no-audit --no-fund)
fi
printf 'Worktree ready: %s\n' "$worktree"
