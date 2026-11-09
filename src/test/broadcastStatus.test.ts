import { describe, expect, it } from "vitest";
import { isBroadcastActive, isBroadcastOnAir } from "@/lib/broadcastStatus";

describe("real broadcast status", () => {
  it("does not label an unconnected broadcast ON AIR", () => {
    for (const status of ["connecting", "idle", "reconnecting", "ended", "error", "failed", "disconnected"]) {
      expect(isBroadcastOnAir(status)).toBe(false);
    }
  });
  it("shows ON AIR for confirmed connected states", () => {
    expect(isBroadcastOnAir("connected")).toBe(true);
    expect(isBroadcastOnAir("live")).toBe(true);
  });
  it("does not select ended or failed sessions as current", () => {
    for (const status of ["ended", "error", "failed", "disconnected"]) {
      expect(isBroadcastActive(status)).toBe(false);
    }
    expect(isBroadcastActive("connecting")).toBe(true);
    expect(isBroadcastActive("connected")).toBe(true);
  });
});