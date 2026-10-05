#!/usr/bin/env bash
# Applies the GitHub protections that a private repository on the free plan cannot have. Run it once, right
# after the owner makes the repository public:
#
#   gh repo edit adam0white/human-framework --visibility public --accept-visibility-change-consequences
#   bash scripts/after-public.sh
#
# Idempotent: every step sets a state rather than toggling one, and the ruleset is updated in place when it
# already exists (matched by name). Needs `gh` logged in as a repository admin, and `jq`.
#
# Applied while the repository was still private (2026-10-05), so not repeated here except as a re-assertion:
# Actions `sha_pinning_required=true`. Dependabot alerts were already on.
set -euo pipefail

REPO=adam0white/human-framework
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RULESET_FILE="$ROOT/.github/rulesets/main.json"
summary=()
note() { summary+=("$1"); echo "  $1"; }

command -v gh >/dev/null || { echo "gh is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
[ -f "$RULESET_FILE" ] || { echo "missing $RULESET_FILE" >&2; exit 1; }

# (a) Refuse to run while the repository is not public.
visibility=$(gh repo view "$REPO" --json visibility -q .visibility)
if [ "$visibility" != "PUBLIC" ]; then
  echo "Refusing: $REPO is $visibility, not PUBLIC. Make it public first:" >&2
  echo "  gh repo edit $REPO --visibility public --accept-visibility-change-consequences" >&2
  exit 1
fi
echo "$REPO is PUBLIC."

# (b) Secret scanning and push protection.
echo "Secret scanning..."
gh api -X PATCH "repos/$REPO" --silent \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
sa=$(gh api "repos/$REPO" --jq '[.security_and_analysis.secret_scanning.status, .security_and_analysis.secret_scanning_push_protection.status] | join("/")')
[ "$sa" = "enabled/enabled" ] || { echo "secret scanning not enabled (got $sa)" >&2; exit 1; }
note "secret scanning: enabled; push protection: enabled"

# (c) Private vulnerability reporting (SECURITY.md points reporters to it).
echo "Private vulnerability reporting..."
gh api -X PUT "repos/$REPO/private-vulnerability-reporting" --silent
pvr=$(gh api "repos/$REPO/private-vulnerability-reporting" --jq .enabled)
[ "$pvr" = "true" ] || { echo "private vulnerability reporting not enabled (got $pvr)" >&2; exit 1; }
note "private vulnerability reporting: enabled"

# (d) Ruleset on the default branch: no deletion, no force-push, required check `ci`; repository admins bypass
# (the owner and his agents push directly to main).
echo "Ruleset..."
name=$(jq -r .name "$RULESET_FILE")
id=$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$name\") | .id" | head -n1)
if [ -n "$id" ]; then
  gh api -X PUT "repos/$REPO/rulesets/$id" --input "$RULESET_FILE" --silent
  note "ruleset '$name': updated (id $id)"
else
  id=$(gh api -X POST "repos/$REPO/rulesets" --input "$RULESET_FILE" --jq .id)
  note "ruleset '$name': created (id $id)"
fi
rules=$(gh api "repos/$REPO/rulesets/$id" --jq '[.enforcement, ([.rules[].type] | sort | join(","))] | join(" ")')
note "  enforcement and rules: $rules"

# (e) Actions: require SHA-pinned actions; require approval before workflows run on fork PRs from any outside
# contributor.
echo "Actions settings..."
gh api -X PUT "repos/$REPO/actions/permissions" --silent \
  -F enabled=true -f allowed_actions=all -F sha_pinning_required=true
gh api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" --silent \
  -f approval_policy=all_external_contributors
pin=$(gh api "repos/$REPO/actions/permissions" --jq .sha_pinning_required)
fork=$(gh api "repos/$REPO/actions/permissions/fork-pr-contributor-approval" --jq .approval_policy)
note "actions: sha_pinning_required=$pin; fork PR approval=$fork"

# (f) CodeQL runs through .github/workflows/codeql.yml (advanced setup). Do NOT enable CodeQL default setup:
# GitHub rejects uploads from the workflow while default setup is on. Push and PR runs gate on the repository
# being public; the weekly scheduled run gates on this variable instead.
echo "CodeQL..."
gh variable set CODEQL_SCHEDULE --repo "$REPO" --body true
default_setup=$(gh api "repos/$REPO/code-scanning/default-setup" --jq .state 2>/dev/null || echo unknown)
note "codeql: workflow .github/workflows/codeql.yml; weekly schedule on (CODEQL_SCHEDULE=true); default setup: $default_setup (must stay not-configured)"
if [ "$default_setup" = "configured" ]; then
  echo "WARNING: CodeQL default setup is on; turn it off in Settings > Code security, or the workflow's uploads fail." >&2
fi

# (g) Summary.
echo
echo "Done. $REPO:"
printf '  - %s\n' "${summary[@]}"
echo
echo "Next: run the CodeQL workflow once (gh workflow run codeql.yml --repo $REPO) and deploy the homepage (npm run deploy)."
