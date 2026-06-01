/**
 * Atomic VCS Hooks Extension for Pi
 *
 * Integrates Pi with Atomic's agent hook system by translating
 * Pi lifecycle events into `atomic agent hooks pi <verb>`
 * CLI calls — the same pattern used by Claude Code, Gemini CLI, and OpenCode.
 *
 * 1 session = 1 view. Each turn records with provenance.
 *
 * Installed by: atomic-pi's install (`pi install` or install.sh), which
 *               symlinks this extension into ~/.pi/agent/extensions/.
 * Remove with:  node install.js --uninstall (or remove the symlink from
 *               ~/.pi/agent/extensions/).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const EDIT_TOOLS = new Set(["edit", "write", "bash"]);

interface SessionState {
  startTime: number;
  turnCount: number;
  model?: string;
  provider?: string;
  lastPrompt?: string;
  toolStartTimes: Map<string, number>;
}

let session: SessionState = {
  startTime: Date.now(),
  turnCount: 0,
  toolStartTimes: new Map(),
};

let cwd = process.cwd();
let available = false;

function escapeShellSingleQuote(s: string): string {
  return s.replace(/'/g, "'\\''");
}

async function invokeHook(
  pi: ExtensionAPI,
  verb: string,
  payload: Record<string, unknown>,
) {
  if (!available) return;
  const json = JSON.stringify(payload);
  const escaped = escapeShellSingleQuote(json);
  try {
    await pi.exec("sh", [
      "-c",
      `echo '${escaped}' | atomic agent hooks pi ${verb}`,
    ]);
  } catch {
    // Silently ignore hook failures — don't disrupt the agent
  }
}

async function checkAtomicAvailable(pi: ExtensionAPI): Promise<boolean> {
  try {
    const { code: vCode } = await pi.exec("atomic", ["--version"]);
    if (vCode !== 0) return false;
    const { code: dCode } = await pi.exec("test", ["-d", ".atomic"]);
    return dCode === 0;
  } catch {
    return false;
  }
}

/** Read model info from ctx.model and store on session state. */
function captureModel(ctx: { model?: { id?: string; provider?: string } }) {
  if (ctx.model) {
    if (ctx.model.id) session.model = ctx.model.id;
    if (ctx.model.provider) session.provider = ctx.model.provider;
  }
}

export default function (pi: ExtensionAPI) {
  // Capture model whenever the user switches models (via /model, Ctrl+P, or session restore)
  pi.on("model_select", async (event, _ctx) => {
    if (event.model) {
      if (event.model.id) session.model = event.model.id;
      if (event.model.provider) session.provider = event.model.provider;
    }
  });

  pi.on("session_start", async (event, ctx) => {
    available = await checkAtomicAvailable(pi);
    if (!available) return;

    session = {
      startTime: Date.now(),
      turnCount: 0,
      toolStartTimes: new Map(),
    };

    // Capture initial model from context (set before session_start fires)
    captureModel(ctx);

    // Only fire session-start for new sessions, not reloads/resumes
    if (event.reason === "startup" || event.reason === "new") {
      await invokeHook(pi, "session-start", {
        session_id: Date.now().toString(36),
        source: event.reason,
        model: session.model,
        provider: session.provider,
        cwd,
        timestamp: new Date().toISOString(),
      });
    }
  });

  pi.on("session_shutdown", async () => {
    await invokeHook(pi, "session-end", {
      session_id: session.startTime.toString(36),
      reason: "shutdown",
      cwd,
      timestamp: new Date().toISOString(),
    });
  });

  pi.on("before_agent_start", async (event, ctx) => {
    // Refresh model from context each turn — it may have changed
    captureModel(ctx);

    const prompt = typeof event.prompt === "string" ? event.prompt : undefined;
    if (prompt) session.lastPrompt = prompt;

    await invokeHook(pi, "user-prompt", {
      session_id: session.startTime.toString(36),
      prompt,
      model: session.model,
      provider: session.provider,
      cwd,
      timestamp: new Date().toISOString(),
    });
  });

  pi.on("turn_end", async (_event, ctx) => {
    session.turnCount++;

    // Refresh model — may have been set/changed during this turn
    captureModel(ctx);

    const metadata: Record<string, unknown> = {
      session_id: session.startTime.toString(36),
      turn_number: session.turnCount,
      model: session.model,
      provider: session.provider,
      cwd,
      timestamp: new Date().toISOString(),
    };

    await invokeHook(pi, "stop", metadata);
  });

  pi.on("tool_call", async (event) => {
    const callId = `${event.toolName}-${Date.now()}`;
    session.toolStartTimes.set(callId, Date.now());

    await invokeHook(pi, "before-tool", {
      session_id: session.startTime.toString(36),
      tool_name: event.toolName,
      tool_call_id: callId,
      tool_input: event.input,
      cwd,
      timestamp: new Date().toISOString(),
    });
  });

  pi.on("tool_result", async (event) => {
    // Find the matching start time
    let callId: string | undefined;
    let duration: number | undefined;
    for (const [id, startTime] of session.toolStartTimes) {
      if (id.startsWith(`${event.toolName}-`)) {
        callId = id;
        duration = Date.now() - startTime;
        session.toolStartTimes.delete(id);
        break;
      }
    }

    await invokeHook(pi, "after-tool", {
      session_id: session.startTime.toString(36),
      tool_name: event.toolName,
      tool_call_id: callId,
      status: "completed",
      duration,
      modified_files: EDIT_TOOLS.has(event.toolName),
      cwd,
      timestamp: new Date().toISOString(),
    });
  });
}
