/**
 * Central error logging + friendly message mapping.
 * Keeps technical detail in the console (and an in-memory ring buffer for
 * debugging) while the UI only ever shows human-readable text.
 */

export type ErrorScope =
  | "app"
  | "route"
  | "payment"
  | "network"
  | "auth"
  | "media"
  | "unknown";

export interface LoggedError {
  id: string;
  at: string;
  scope: ErrorScope;
  message: string;
  detail?: unknown;
  url: string;
}

const BUFFER_LIMIT = 50;
const buffer: LoggedError[] = [];

export function getErrorLog(): LoggedError[] {
  return [...buffer];
}

export function logError(scope: ErrorScope, error: unknown, context?: Record<string, unknown>) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  const entry: LoggedError = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    scope,
    message,
    detail: { context, stack: error instanceof Error ? error.stack : undefined },
    url: typeof window !== "undefined" ? window.location.href : "",
  };

  buffer.push(entry);
  if (buffer.length > BUFFER_LIMIT) buffer.shift();

  console.error(`[${scope}] ${message}`, entry.detail);
  return entry.id;
}

const FRIENDLY: Array<{ match: RegExp; scope: ErrorScope; text: string }> = [
  { match: /failed to fetch|networkerror|load failed/i, scope: "network", text: "We can't reach the server right now. Check your connection and try again." },
  { match: /insufficient|declined|card/i, scope: "payment", text: "Your payment was declined. Try another card or mobile money number." },
  { match: /cancel/i, scope: "payment", text: "The payment was cancelled before it finished. Nothing was charged." },
  { match: /timeout|timed out/i, scope: "network", text: "That took too long to respond. Please try again in a moment." },
  { match: /invalid login|credentials/i, scope: "auth", text: "That email and password don't match. Please try again." },
  { match: /permission|not allowed|denied/i, scope: "auth", text: "You don't have access to this. Try signing in again." },
  { match: /chunkloaderror|dynamically imported module/i, scope: "app", text: "A new version of the app is available. Refresh the page to continue." },
];

export function friendlyMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const hit = FRIENDLY.find((f) => f.match.test(raw));
  return hit ? hit.text : fallback;
}

/** Attach window-level handlers once, at app startup. */
export function installGlobalErrorHandlers(onError?: (message: string) => void) {
  if (typeof window === "undefined") return;
  const w = window as Window & { __inyitoErrorHandlers?: boolean };
  if (w.__inyitoErrorHandlers) return;
  w.__inyitoErrorHandlers = true;

  window.addEventListener("error", (event) => {
    if (event.target && event.target !== window) {
      // Broken image / script / stylesheet link
      const el = event.target as HTMLElement & { src?: string; href?: string };
      logError("route", `Failed to load resource: ${el.src ?? el.href ?? el.tagName}`, {
        tag: el.tagName,
      });
      return;
    }
    logError("app", event.error ?? event.message);
    onError?.(friendlyMessage(event.error ?? event.message));
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    logError("app", event.reason, { type: "unhandledrejection" });
    onError?.(friendlyMessage(event.reason));
  });

  window.addEventListener("offline", () => onError?.("You're offline. Some features won't work until you reconnect."));
}
