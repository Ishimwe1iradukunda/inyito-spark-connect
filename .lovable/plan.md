
# Live Video Editing with Real-Time Visual Preview

## Overview
Transform the current video editor from a "hidden video + canvas" model into a fully interactive, live-editing experience where every change (trim position, text overlays, filters) is immediately visible on the video canvas as it plays. The user will see exactly what the final export looks like at all times.

## Current State
- The video element is hidden; a canvas renders frames via `requestAnimationFrame`
- Filters and text overlays are drawn on canvas but the video is muted and looping silently
- There are no playback controls (play/pause/seek) in the editor
- The trim region is set via sliders but there's no visual feedback on the canvas (e.g., dimming outside trim bounds)
- Text overlays are positioned via sliders -- not draggable on the canvas itself

## What Will Change

### 1. Interactive Video Playback Controls
Add play/pause, seek bar, and time display directly in the editor preview area so users can scrub through the video and see live results.

- Play/Pause toggle button overlaid on the canvas
- Current time / total duration display
- Constrain playback to the trim region (auto-loop between trimStart and trimEnd)
- Playhead on the trim timeline syncs bi-directionally with the video

### 2. Real-Time Filter Visualization
Currently working but will be enhanced:
- When adjusting any filter slider, the canvas updates in real-time (already via RAF loop -- will ensure video is playing or paused on a visible frame)
- Add a split-screen "before/after" toggle: left half shows original, right half shows filtered -- rendered on the same canvas with a draggable divider line

### 3. Draggable Text Overlays on Canvas
Replace slider-based positioning with direct drag-and-drop on the canvas:
- Click a text overlay on the canvas to select it
- Drag to reposition (update x/y percentage in real-time)
- Selected overlay gets a visible bounding box with handles
- Keep slider controls as a secondary/precise input

### 4. Trim Region Visual Feedback
- When the playhead is outside the trim region, dim the canvas with a semi-transparent overlay and show "Outside trim range" indicator
- Playback auto-skips to trimStart if user hits play while outside the region
- Trim handles on the timeline become more interactive with frame-accurate snapping

### 5. Active Edit Indicator Panel
A small floating panel that shows what effects are currently active:
- List of applied filters with non-default values (e.g., "Brightness: 120%")
- Count of text overlays
- Trim duration vs. original duration
- Animates in/out as effects are added/removed

---

## Technical Plan

### Files to Create
1. **`src/components/studio/VideoPlaybackControls.tsx`**
   - Play/pause button, time display, seek slider
   - Props: `videoRef`, `trimStart`, `trimEnd`, `currentTime`, `duration`, `onSeek`
   - Constrains playback within trim bounds

2. **`src/components/studio/CanvasOverlay.tsx`**
   - Transparent overlay div positioned on top of the canvas
   - Handles mouse events for dragging text overlays
   - Renders selection boxes around active overlays
   - Shows "Outside trim" dimming when applicable

3. **`src/components/studio/ActiveEffectsIndicator.tsx`**
   - Small floating badge/panel showing active effect count
   - Lists non-default filter values and overlay count
   - Uses framer-motion for enter/exit animations

### Files to Modify
4. **`src/components/studio/VideoEditor.tsx`** (major refactor)
   - Add video playback state management (playing/paused)
   - Integrate `VideoPlaybackControls` below the canvas
   - Wrap canvas in a relative container with `CanvasOverlay` on top
   - Update `drawFrame` to render trim-region dimming when outside bounds
   - Add before/after split-view mode toggle
   - Wire up drag events from `CanvasOverlay` to update overlay positions
   - Pass play/pause state to constrain playback within trim region

5. **`src/components/studio/TextOverlayEditor.tsx`**
   - Add `selectedId` prop to highlight the currently selected overlay
   - Add `onSelect` callback so canvas clicks sync with the panel
   - Keep existing slider controls as precise fallback

6. **`src/components/studio/TrimTimeline.tsx`**
   - Add animated playhead that moves in real-time during playback
   - Add frame-preview tooltips on hover over the timeline track

### Architecture
```text
+------------------------------------------+
|          Canvas Preview Area              |
|  +------------------------------------+  |
|  |  <canvas> (video + filters + text) |  |
|  |  <CanvasOverlay> (drag handles,    |  |
|  |   selection boxes, trim dimming)   |  |
|  +------------------------------------+  |
|  [Play/Pause] --:-- / --:-- [Before/After]|
|  [ActiveEffectsIndicator]                 |
+------------------------------------------+
|  [Trim & Cut] [Text] [Filters] tabs       |
|  (existing panels, enhanced with sync)    |
+------------------------------------------+
|  [Export Edited Video]                    |
+------------------------------------------+
```

### Key Implementation Details
- **Playback loop**: The existing RAF loop in `drawFrame` already runs continuously. Add a `isPlaying` state; when true, let the video play naturally (constrained to trim bounds). When paused, keep drawing the current frame so filter/text changes are still visible.
- **Drag-on-canvas**: Use pointer events on the overlay div. On `pointerdown`, hit-test against overlay bounding boxes. On `pointermove`, update the overlay's x/y. On `pointerup`, finalize position.
- **Before/after split**: In `drawFrame`, draw the original (no filters) on the left half and the filtered version on the right half, separated by a vertical line. The divider position is controlled by a draggable handle.
- **Trim dimming**: After drawing the frame, if `currentTime < trimStart || currentTime > trimEnd`, draw a semi-transparent black rect over the canvas with centered text "Outside trim range".
