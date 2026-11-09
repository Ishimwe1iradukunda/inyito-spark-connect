/** Only provider-confirmed connected sessions qualify as on air. */
export function isBroadcastOnAir(status: string): boolean {
  return status === "connected" || status === "live";
}

export function isBroadcastActive(status: string): boolean {
  return !["ended", "error", "failed", "disconnected"].includes(status);
}