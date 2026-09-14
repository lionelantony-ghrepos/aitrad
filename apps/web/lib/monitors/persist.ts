import { compileMonitorInstruction } from "@meridian/copilot";
import type {
  AlertThrottleState,
  Monitor,
  MonitorCompileResult,
  MonitorOwnerPatch,
} from "@meridian/schemas";

export function persistCompiledMonitor(input: {
  userId: string;
  sessionId?: string | null;
  name?: string;
  nl_instruction: string;
  compiled?: MonitorCompileResult | null;
  now?: Date;
}): Monitor {
  const compiled = input.compiled ?? compileMonitorInstruction(input.nl_instruction);
  if (!compiled) {
    throw new Error("MONITOR_COMPILE_FAILED");
  }
  const now = (input.now ?? new Date()).toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: input.userId,
    session_id: input.sessionId ?? null,
    name: input.name?.trim() || compiled.name || input.nl_instruction.slice(0, 72),
    nl_instruction: input.nl_instruction,
    compiled_condition: compiled.compiled_condition,
    scope: compiled.scope,
    cadence: compiled.cadence ?? "5m",
    last_run: null,
    active: true,
    throttle_state: {},
    propose_action: compiled.propose_action ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function ownerPausePatch(active: boolean, current: AlertThrottleState): MonitorOwnerPatch {
  return {
    active,
    throttle_state: { ...current, paused: !active },
  };
}

export function ownerThrottleResetPatch(): MonitorOwnerPatch {
  return { throttle_state: {} };
}
