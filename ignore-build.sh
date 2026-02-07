#!/bin/bash
# Skip Vercel build if only docs/non-code files changed.
# Exit 0 = skip build, Exit 1 = proceed with build.
# See: https://vercel.com/docs/projects/overview#ignored-build-step
#
# NOTE: data/ changes DO trigger builds — the daily data refresh
# pushes new data that must be baked into the static Next.js export.

echo "Checking if build is needed..."

# Get changed files between current and previous commit
CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "FORCE_BUILD")

if [ "$CHANGED" = "FORCE_BUILD" ]; then
    echo "Cannot determine changes — building."
    exit 1
fi

# Patterns that DON'T need a rebuild (docs/config only — NOT data/)
SKIP_PATTERNS="\.md$|\.txt$|\.env\.example$|LICENSE|\.gitignore|CLAUDE\.md|docs/|\.github/"

# Check if ALL changed files match skip patterns
CODE_CHANGES=$(echo "$CHANGED" | grep -vE "$SKIP_PATTERNS" || true)

if [ -z "$CODE_CHANGES" ]; then
    echo "Only docs/config changed — skipping build."
    echo "Changed files: $CHANGED"
    exit 0
else
    echo "Code/data changes detected — building."
    echo "Changed files: $CODE_CHANGES"
    exit 1
fi
