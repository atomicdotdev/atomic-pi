#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Prefer `pi install` if pi is available
if command -v pi &>/dev/null; then
  pi install "$SCRIPT_DIR"

  cat <<EOF

────────────────────────────────────────────────────────────
✓ Installed atomic-pi via pi install
────────────────────────────────────────────────────────────

What was installed:
  pi handles placement automatically from this checkout:
  ${SCRIPT_DIR}
  • Extension  extensions/atomic-hooks.ts (session lifecycle, turn recording)
  • Skills     atomic-vault, atomic-vcs, code-intelligence

Manual steps to finish:
  1. Ensure your project is an Atomic repo (one-time):
       cd /path/to/your/project && atomic init
  2. Restart pi if it's already running so it picks up the extension.

Verify:
  • Run 'pi' in an Atomic project — the Atomic agent activates automatically.
────────────────────────────────────────────────────────────
EOF
  exit 0
fi

# Fallback: symlink into ~/.pi/agent/ directly
TARGET="$HOME/.pi/agent"

mkdir -p "$TARGET/extensions" "$TARGET/skills"

ln -sf "$SCRIPT_DIR/extensions/atomic-hooks.ts" "$TARGET/extensions/atomic-hooks.ts"

# Skills — explicit, no globs
for name in atomic-vault atomic-vcs code-intelligence; do
  mkdir -p "$TARGET/skills/$name"
  ln -sf "$SCRIPT_DIR/skills/$name/SKILL.md" "$TARGET/skills/$name/SKILL.md"
done

cat <<EOF

────────────────────────────────────────────────────────────
✓ Installed atomic-pi
────────────────────────────────────────────────────────────

What was installed:
  • Extension  → ${TARGET}/extensions/atomic-hooks.ts
  • Skills     → ${TARGET}/skills/atomic-vault/SKILL.md
               → ${TARGET}/skills/atomic-vcs/SKILL.md
               → ${TARGET}/skills/code-intelligence/SKILL.md

Symlinks point back into this checkout:
  ${SCRIPT_DIR}
Keep this directory in place; moving or deleting it breaks the links.

Manual steps to finish:
  1. Restart pi if it's already running so it picks up the extension.
  2. Ensure your project is an Atomic repo (one-time):
       cd /path/to/your/project && atomic init

Verify:
  • Skills: ls ${TARGET}/skills/

  (Preferred method: pi install ${SCRIPT_DIR})
────────────────────────────────────────────────────────────
EOF
