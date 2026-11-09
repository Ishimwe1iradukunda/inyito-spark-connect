/** Build public watch URLs from a saved channel handle/URL. Returns null if not set. */
export function youtubeWatchUrl(channel?: string | null): string | null {
  const v = (channel ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    const base = v.replace(/\/+$/, "");
    return /\/live$/.test(base) || /watch\?v=/.test(base) ? base : `${base}/live`;
  }
  const handle = v.startsWith("@") ? v : `@${v}`;
  return `https://www.youtube.com/${handle}/live`;
}

export function twitchWatchUrl(channel?: string | null): string | null {
  const v = (channel ?? "").trim();
  if (!v) return null;
  const m = v.match(/twitch\.tv\/([A-Za-z0-9_]+)/i);
  const name = m ? m[1] : v.replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{3,25}$/.test(name)) return null;
  return `https://www.twitch.tv/${name.toLowerCase()}`;
}
