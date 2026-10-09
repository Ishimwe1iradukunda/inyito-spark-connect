# Fix black screen recordings

## What is likely happening
Screen recordings don't save your screen directly. The Studio first draws the screen (and camera, overlays) onto a hidden drawing surface, then records that surface. The code shows two weak spots that can produce a black video:

1. **The drawing stops when you leave the Studio tab.** The drawing loop only runs while the Studio tab is on screen. When you share another window or tab and switch to it, which is the normal way to record a screen, the browser pauses that loop. The recorder keeps saving an empty black surface.
2. **The screen picture is fed through a fully hidden video player.** Some browsers don't hand out frames from hidden players reliably. If no frames arrive, the Studio has nothing to draw, so the output is black.

I haven't confirmed which of these causes your recording. Step 1 below checks that first.

## Plan
1. **Reproduce it.** Use a test browser with a fake shared screen. Record once with the Studio tab in front and once with it in the background, and check whether each result is black.
2. **Keep drawing in the background.** Run the drawing loop on a timer the browser doesn't pause in background tabs, so recording continues when you switch to the window you're sharing.
3. **Make sure frames arrive.** Keep the helper players technically visible (tiny and transparent instead of hidden) and start them playing explicitly once the screen is shared.
4. **Direct recording for screen-only.** When you record only the screen, with no camera and no overlays, record the screen as-is, skipping the drawing surface. This is the most reliable path.
5. **Warn instead of recording black.** If no picture has been drawn for about 2 seconds while recording, show a warning: "Recording isn't receiving video — keep this tab open or reshare your screen."
6. **Re-test.** Repeat step 1 and confirm the saved file shows the screen content in both cases.

## Technical details
- `Compositor.tsx`: replace the `requestAnimationFrame` loop with a draw tick driven by a small Web Worker timer at the target FPS (workers aren't throttled in hidden tabs). Keep rAF only for the interactive preview handles. Track the last-drawn timestamp and expose it for the stall warning.
- `Studio.tsx`: change the helper `<video className="hidden">` to an offscreen style (1px, opacity 0, absolute). After setting `srcObject` in `acquireScreen` / `acquireCamera`, call `video.play()` and wait for `loadeddata` instead of the fixed 400ms delay.
- `buildCompositeStream`: if `sourceType === "screen"`, no overlays are enabled and the layout is unchanged, return a stream built from the screen's video track plus the mixed audio, skipping canvas capture.
- Close the `AudioContext` created in `buildCompositeStream` when recording stops, so it isn't leaked.
- Verification: Playwright with `--use-fake-ui-for-media-stream` and `--auto-select-desktop-capture-source`. Record a few seconds, toggle page visibility, then check frame brightness of the resulting blob via ffmpeg.
