import { Response } from "express";
import { randomUUID } from "crypto";

type ProgressState = "running" | "completed" | "failed";

export interface ProgressUpdate {
  token: string;
  step: number;
  totalSteps: number;
  percent: number;
  status: string;
  detail?: string;
  state: ProgressState;
  timestamp: string;
}

type ProgressListener = (update: ProgressUpdate) => void;

const listeners = new Map<string, Set<ProgressListener>>();
const lastUpdate = new Map<string, ProgressUpdate>();
const cleanupTimers = new Map<string, NodeJS.Timeout>();

const STREAM_HEADERS = {
  "Cache-Control": "no-cache",
  "Content-Type": "text/event-stream",
  Connection: "keep-alive",
} as const;

const CLEANUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes

function ensureListenerSet(token: string): Set<ProgressListener> {
  if (!listeners.has(token)) {
    listeners.set(token, new Set());
  }
  return listeners.get(token)!;
}

function scheduleCleanup(token: string) {
  if (cleanupTimers.has(token)) {
    clearTimeout(cleanupTimers.get(token)!);
  }
  const timer = setTimeout(() => {
    listeners.delete(token);
    lastUpdate.delete(token);
    cleanupTimers.delete(token);
  }, CLEANUP_DELAY_MS);
  cleanupTimers.set(token, timer);
}

export function openProgressStream(token: string, res: Response): void {
  res.writeHead(200, STREAM_HEADERS);
  res.write(`event: open\ndata: {"token":"${token}"}\n\n`);

  const send = (update: ProgressUpdate) => {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  };

  const tokenListeners = ensureListenerSet(token);
  tokenListeners.add(send);

  if (lastUpdate.has(token)) {
    send(lastUpdate.get(token)!);
  }

  res.on("close", () => {
    tokenListeners.delete(send);
    if (tokenListeners.size === 0) {
      scheduleCleanup(token);
    }
  });
}

export function sendProgressUpdate(update: Omit<ProgressUpdate, "timestamp">): void {
  const payload: ProgressUpdate = {
    ...update,
    timestamp: new Date().toISOString(),
  };

  lastUpdate.set(update.token, payload);
  const tokenListeners = listeners.get(update.token);
  if (!tokenListeners) {
    scheduleCleanup(update.token);
    return;
  }

  tokenListeners.forEach((listener) => {
    listener(payload);
  });
}

export function initializeProgressToken(providedToken?: string): string {
  const token = providedToken || randomUUID();
  scheduleCleanup(token);
  return token;
}

export function completeProgress(token: string, detail?: string): void {
  if (!token) return;
  const last = lastUpdate.get(token);
  const totalSteps = last?.totalSteps ?? 1;
  sendProgressUpdate({
    token,
    step: totalSteps,
    totalSteps,
    percent: 100,
    status: detail ?? "Completed",
    detail,
    state: "completed",
  });
}

export function failProgress(token: string, detail?: string): void {
  if (!token) return;
  const previous = lastUpdate.get(token);
  const totalSteps = previous?.totalSteps ?? 1;
  const step = previous?.step ?? 0;
  sendProgressUpdate({
    token,
    step,
    totalSteps,
    percent: Math.min(99, Math.max(0, previous?.percent ?? 0)),
    status: detail ?? "Failed",
    detail,
    state: "failed",
  });
}
