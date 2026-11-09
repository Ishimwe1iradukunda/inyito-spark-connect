import { describe, it, expect } from "vitest";
import { youtubeWatchUrl, twitchWatchUrl } from "@/lib/platformLinks";

describe("platform watch links", () => {
  it("builds YouTube live URL from a handle", () => {
    expect(youtubeWatchUrl("mychannel")).toBe("https://www.youtube.com/@mychannel/live");
  });
  it("builds Twitch URL from a channel URL", () => {
    expect(twitchWatchUrl("https://twitch.tv/MyName")).toBe("https://www.twitch.tv/myname");
  });
  it("returns null when no channel saved", () => {
    expect(youtubeWatchUrl("")).toBeNull();
    expect(twitchWatchUrl(null)).toBeNull();
  });
});
