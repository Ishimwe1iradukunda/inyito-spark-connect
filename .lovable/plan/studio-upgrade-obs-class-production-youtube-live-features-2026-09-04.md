# Studio Upgrade: OBS-Class Production + YouTube Live Features

## What exists today
Recording with device/quality selection, skip markers, a full editor (trim, text, filters, transitions, keyframes, presets), scenes/sources, audio mixer, stream destinations (RTMP config), chat, templates, recordings dashboard, payments, auth.

## What's missing (and worth adding)
Grouped into three phases so you can stop after any one of them.

---

## Phase 1 — Live production essentials (biggest impact)

1. **Real compositing engine**
   A single canvas that actually composes the scene sources (screen, camera, image, text, colour) with position, size, opacity and z-order, instead of a single-source preview. Recording and streaming both capture this composed canvas.
   - Drag/resize handles on the preview for each source
   - Camera picture-in-picture over screen share, with corner snapping
   - 16:9 safe-area guides

2. **Studio Mode (OBS-style)**
   Side-by-side Preview and Program. Edit the hidden scene, then hit "Transition" to push it live, with cut/fade/stinger choice and duration.

3. **Stream health & telemetry bar**
   Live bitrate, dropped-frame estimate, FPS, CPU/encoder load hint, session timer, and a coloured health pill (Good / Degraded / Poor), the way OBS's status bar works.

4. **Hotkeys panel**
   Configurable keyboard shortcuts for start/stop recording, start/stop stream, mute mic, switch scene 1–9, transition. Saved per user.

---

## Phase 2 — YouTube-live-inspired viewer features

5. **Stream overlays / lower thirds**
   Reusable overlay widgets rendered onto the composed canvas: lower-third name card, live viewer count, running countdown ("starting soon"), ticker, on-screen alerts, and a BRB / Technical difficulties full-screen card.

6. **Chat improvements**
   Pinned message, moderator highlight, message-to-overlay ("show on stream"), slow-mode indicator, and simple word filter.

7. **Multi-destination simulcast list**
   Enable several configured destinations at once with per-destination ready/error state and a pre-flight checklist (key present, camera OK, mic level detected, disk space).

8. **Replay buffer & instant clips**
   Keep the last 30–60 s in memory while live/recording; a "Save Clip" button writes that window straight to the recordings library and offers a share link.

---

## Phase 3 — Post-production and library depth

9. **Multi-track timeline in the editor**
   Stack video, overlay and audio lanes with draggable clips, instead of a single trim range. Includes ripple delete of skipped scenes.

10. **Audio polish**
    Per-channel gain, noise gate, compressor and a simple 3-band EQ via Web Audio nodes, plus loudness (LUFS-ish) readout.

11. **Auto-captions**
    Speech-to-text on the recorded audio to generate a caption track, editable, burned in on export or downloadable as .srt.

12. **Chapters & thumbnails**
    Mark chapters on the timeline, auto-generate a thumbnail grid from frames, pick one as the recording's cover in the library.

---

## Technical notes
- Compositing: one `<canvas>` driven by a RAF loop drawing each visible source in z-order; `canvas.captureStream()` merged with a Web Audio `MediaStreamDestination` feeds both `MediaRecorder` and any future relay. New files: `src/components/studio/Compositor.tsx`, `src/hooks/useCompositor.ts`.
- Studio Mode: two scene states (`previewScene`, `programScene`) in Studio state; transition tween drawn on the program canvas.
- Hotkeys: `user_hotkeys` table (user-scoped RLS + grants) plus a `useHotkeys` hook.
- Overlays: JSONB overlay definitions on the scene record, drawn by the compositor; new `OverlayPanel.tsx`.
- Replay buffer: rolling array of `MediaRecorder` timeslice chunks trimmed to the buffer duration.
- Captions: audio extracted client-side and sent to a backend function using the built-in AI gateway speech-to-text; caption rows stored per recording.
- Telemetry: `RTCPeerConnection.getStats` where a relay exists, otherwise derived from recorder chunk sizes and RAF frame timing.

## Suggested order
Phase 1 first (items 1–3 are the ones that make it feel like OBS), then 5 and 7, then the rest.
