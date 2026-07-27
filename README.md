# atomic-pi

[Atomic VCS](https://atomic.dev) integration for [Pi](https://pi.dev).

Automatic turn recording with AI provenance, intent tracking, and knowledge graph skills.

> **Definitive source:** this repository lives on Atomic storage at `https://atomic.atomic.storage/workspaces/oss/projects/atomic-pi/code`. The GitHub repo is a mirror.

## What it does

- **1 session = 1 view** — a draft view is created automatically when you start Pi
- **Every turn records with provenance** — model, vendor, session, turn number, timing
- **Tool executions tracked** — reads, edits, bash calls captured in a causal decision graph
- **Intent workflow** — agent prompt guides problem-first development with vault intents
- **Skills on demand** — `@atomic-vault`, `@atomic-vcs`, and `@code-intelligence` loaded when needed

## Install

### Quick start

Requires the [Atomic VCS](https://atomic.dev) CLI on your PATH. Then:

```bash
atomic agent enable --agent pi
```

The enable command syncs the package from Atomic storage and installs the extension, agent prompt, and skills into `~/.config/pi/`.

### Development install

From a local checkout:

```bash
git clone https://github.com/atomicdotdev/atomic-pi
cd atomic-pi
atomic agent enable --agent pi --from .

# or the legacy script path:
./install.sh
```

`./install.sh` registers the package with Pi via `pi install`. Edit files in the repo — changes apply immediately (run `/reload` in Pi for extension changes).

## Prerequisites

- [Atomic VCS](https://atomic.dev) installed and on your PATH (`atomic --version`)
- A project with an `.atomic/` repository (`atomic init`)
- [Pi](https://pi.dev) installed

## Usage

```bash
cd my-project
atomic init              # if not already an atomic repo
pi                       # start Pi — the Atomic agent activates automatically
```

The Atomic agent:

1. Creates an intent for each prompt (`atomic vault intent create`)
2. Reframes your request as a problem statement with success criteria
3. Writes the plan into the intent file before coding
4. Executes the tasks
5. Hooks automatically record with provenance when the turn ends

You never need to run `atomic add` or `atomic record` — the hooks handle it.

## Viewing provenance

```bash
# Show the causal decision graph (goals → tool calls → patch)
atomic change -p <hash>

# Show inline AI attestation (model, tokens, cost)
atomic change -a <hash>

# Show session-level attestations
atomic agent attest
```

## What's in the package

| File | Purpose |
|------|---------|
| `extensions/atomic-hooks.ts` | Pi extension — session lifecycle, turn recording, tool tracking |
| `agents/atomic.md` | Agent prompt — intent-per-turn workflow |
| `skills/atomic-vault/SKILL.md` | Vault reference (goals, intents, memory) |
| `skills/atomic-vcs/SKILL.md` | VCS inspection reference (status, log, change, diff) |
| `skills/code-intelligence/SKILL.md` | Knowledge graph query patterns |
| `install.js` | Links agent + skills + extension into `~/.config/pi/` |
| `install.sh` | Development install (symlinks from local checkout) |

## Uninstall

```bash
atomic agent disable --agent pi
```

For a development checkout registered via `pi install`:

```bash
pi remove /path/to/atomic-pi
```

## Architecture

```
Pi session start
  │
  ├── Extension fires session-start → Rust creates haikunator-named draft view
  │
  ├── User sends prompt
  │   ├── Extension fires user-prompt → Rust saves prompt + model on session
  │   ├── Agent works (edits, bash, reads)
  │   │   ├── Extension fires before-tool → Rust tracks timing
  │   │   └── Extension fires after-tool → Rust appends to provenance graph
  │   └── Turn ends
  │       └── Extension fires stop → Rust adds files, records change with provenance
  │
  ├── User sends another prompt → repeat
  │
  └── Session ends
      └── Extension fires session-end → Rust creates attestation
```

## License

Apache-2.0 — same as [Atomic VCS](https://github.com/atomicdotdev/atomic).
