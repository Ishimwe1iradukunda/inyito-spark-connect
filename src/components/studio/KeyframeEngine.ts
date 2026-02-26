/* ------------------------------------------------------------------ */
/*  Keyframe Engine — data types & interpolation                       */
/* ------------------------------------------------------------------ */

export type EasingType = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface Keyframe {
  id: string;
  time: number; // seconds
  value: number;
  easing: EasingType;
}

export interface KeyframeTrack {
  id: string;
  label: string;
  property: string;
  targetId?: string; // for per-overlay tracks
  keyframes: Keyframe[];
  min: number;
  max: number;
  step: number;
  unit: string;
}

/* ---- Easing functions ---- */
function easingFn(t: number, type: EasingType): number {
  switch (type) {
    case "ease-in":
      return t * t;
    case "ease-out":
      return 1 - (1 - t) * (1 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t; // linear
  }
}

/* ---- Interpolate value at a given time ---- */
export function interpolateAt(track: KeyframeTrack, time: number): number | null {
  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
  if (kfs.length === 0) return null;
  if (kfs.length === 1) return kfs[0].value;

  // Before first keyframe
  if (time <= kfs[0].time) return kfs[0].value;
  // After last keyframe
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  // Find surrounding keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const dt = b.time - a.time;
      if (dt === 0) return a.value;
      const t = (time - a.time) / dt;
      const eased = easingFn(t, b.easing);
      return a.value + (b.value - a.value) * eased;
    }
  }

  return kfs[kfs.length - 1].value;
}

/* ---- Create default filter keyframe tracks ---- */
export function createFilterTracks(): KeyframeTrack[] {
  return [
    { id: "kf-brightness", label: "Brightness", property: "brightness", keyframes: [], min: 0, max: 200, step: 1, unit: "%" },
    { id: "kf-contrast", label: "Contrast", property: "contrast", keyframes: [], min: 0, max: 200, step: 1, unit: "%" },
    { id: "kf-saturation", label: "Saturation", property: "saturation", keyframes: [], min: 0, max: 200, step: 1, unit: "%" },
    { id: "kf-blur", label: "Blur", property: "blur", keyframes: [], min: 0, max: 10, step: 0.1, unit: "px" },
    { id: "kf-opacity", label: "Opacity", property: "opacity", keyframes: [], min: 0, max: 100, step: 1, unit: "%" },
  ];
}

/* ---- Create overlay keyframe tracks ---- */
export function createOverlayTracks(overlayId: string, label: string): KeyframeTrack[] {
  return [
    { id: `kf-${overlayId}-x`, label: `${label} X`, property: "x", targetId: overlayId, keyframes: [], min: 0, max: 100, step: 1, unit: "%" },
    { id: `kf-${overlayId}-y`, label: `${label} Y`, property: "y", targetId: overlayId, keyframes: [], min: 0, max: 100, step: 1, unit: "%" },
    { id: `kf-${overlayId}-opacity`, label: `${label} Opacity`, property: "overlayOpacity", targetId: overlayId, keyframes: [], min: 0, max: 100, step: 1, unit: "%" },
    { id: `kf-${overlayId}-size`, label: `${label} Size`, property: "fontSize", targetId: overlayId, keyframes: [], min: 12, max: 96, step: 1, unit: "px" },
  ];
}

/* ---- Add keyframe to track ---- */
export function addKeyframe(
  track: KeyframeTrack,
  time: number,
  value: number,
  easing: EasingType = "linear"
): KeyframeTrack {
  const existing = track.keyframes.findIndex(
    (k) => Math.abs(k.time - time) < 0.05
  );
  const newKf: Keyframe = {
    id: crypto.randomUUID(),
    time,
    value: Math.max(track.min, Math.min(track.max, value)),
    easing,
  };

  if (existing >= 0) {
    const updated = [...track.keyframes];
    updated[existing] = newKf;
    return { ...track, keyframes: updated };
  }
  return { ...track, keyframes: [...track.keyframes, newKf] };
}

/* ---- Remove keyframe ---- */
export function removeKeyframe(
  track: KeyframeTrack,
  keyframeId: string
): KeyframeTrack {
  return {
    ...track,
    keyframes: track.keyframes.filter((k) => k.id !== keyframeId),
  };
}
