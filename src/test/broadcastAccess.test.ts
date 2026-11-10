import { describe, expect, it } from "vitest";
import { isOwnedBroadcastSession } from "../../supabase/functions/_shared/broadcastAccess";

describe("broadcast session ownership", () => {
  it("allows the session owner to control the broadcast", () => {
    expect(isOwnedBroadcastSession({ user_id: "owner-id" }, "owner-id")).toBe(true);
  });

  it("denies a different signed-in user", () => {
    expect(isOwnedBroadcastSession({ user_id: "owner-id" }, "other-user-id")).toBe(false);
  });

  it("denies a missing session", () => {
    expect(isOwnedBroadcastSession(null, "owner-id")).toBe(false);
  });
});
