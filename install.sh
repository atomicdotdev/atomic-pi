#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Prefer `pi install` if pi is available
if command -v pi &>/dev/null; then
  pi install "$SCRIPT_DIR"
  echo "✓ Installed via pi install"
  exit 0
fi

# Fallback: symlink into ~/.pi/agent/ directly
TARGET="$HOME/.pi/agent"

mkdir -p "$TARGET/extensions" "$TARGET/skills"

ln -sf "$SCRIPT_DIR/extensions/atomic-hooks.ts" "$TARGET/extensions/atomic-hooks.ts"

# Skills — explicit, no globs
for name in atomic-vault code-intelligence; do
  mkdir -p "$TARGET/skills/$name"
  ln -sf "$SCRIPT_DIR/skills/$name/SKILL.md" "$TARGET/skills/$name/SKILL.md"
done

echo "✓ Installed to $TARGET"
echo "  (Preferred method: pi install $SCRIPT_DIR)"
