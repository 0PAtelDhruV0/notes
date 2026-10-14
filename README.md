# Notes — iPad Study Space

A compact, dark-mode notebook web app built for iPad, with one movable writing toolbar and an offline-first data layer.

## Open on iPad

With GitHub Pages configured to serve the main branch from the repository root, open the published HTTPS address in Safari. Use **Share → Add to Home Screen** for a more app-like, full-viewport experience.

You can also run it on your computer with Node.js 20+:

```sh
npm run dev
```

Then open http://localhost:5173. No npm dependencies are required.

## Dashboard and note editor

- Dashboard: overview, recent notes, subjects, favorites, search, planner, flashcards, attachments and recently deleted.
- Create a note: choose a subject and subsection from the offline worldwide directory, or enter a custom subject/subsection. Every new note opens as a completely **blank white page**, with no prefilled template or ruled lines. Templates are planned for a later release.
- Open any note: dashboard, permanent page sidebar, and navigation disappear. The **white writing sheet fills the full iPad viewport**; only compact floating navigation buttons and the draggable tool palette remain.
- Floating toolbar: drag the dotted grip to move it; position is remembered locally. Pen, highlighter, eraser, text, line, rectangle, ink color, pen size, undo/redo, and paper selection.
- Pages, attachments, and optional paper styles: use **Pages** in the floating top-right control to open the compact page-management popover, including page switching. New pages default to white and blank.
- Text and ink autosave locally through the existing IndexedDB store. Paper styles: blank, ruled, grid, dots, Cornell.
- Touch, mouse, and Apple Pencil input are handled through browser Pointer Events. Native Pencil gestures and advanced PDF markup are not implemented.

## Your data and backups

All notes and attachments are stored **on this browser/device**, not in GitHub. Cross-device sync and cloud accounts have not been implemented. Export a JSON backup regularly with the Backup button, especially before clearing Safari data, switching browsers, or changing devices.

This release keeps the existing v1 workspace schema, IndexedDB database name and backup format; it **does not** replace user note storage with the localStorage format from the standalone prototype. The service worker caches the static app shell only.

## Developer notes

The current UI is wired through:
- `index.html`: iPad app shell
- `src/main.js`: initialization
- `src/ui/developer-shell.js`: working editor and application flows
- `src/ui/notes-enhance.js`: dark dashboard enhancement, full-screen editor and draggable toolbar
- `src/styles/notes.css`: visual design
- `src/core`, `src/services`, `src/storage`, `src/editor`: stable note engine
- `catalog/worldwide-subjects.csv`: offline subject options

Run `npm test` to check the note engine and `npm run check` for syntax and unit tests.

### Important limits

This is an iPad-friendly web app, not a replacement for native Goodnotes or Notability. Validate Apple Pencil behavior in Safari on your own iPad, particularly after iPadOS updates.
> Existing pages are never wiped by this UI update. Older notes that already contain lecture text or use ruled/grid paper retain their saved content and paper type. New notes and newly added pages default to blank white.

## iPad Pencil responsiveness

The v6 Pencil renderer no longer redraws every saved stroke for every pointer movement. It batches coalesced Pencil samples into animation frames and caches completed strokes. The ink layer blocks Safari selection/context-menu gestures in drawing mode; text selection remains available when the **Text** tool is active. Pen contact also suppresses nearby palm touches. For best results, install the site to the iPad Home Screen and choose **Pen** (not Text). Performance still varies with device and note size; native iPad Pencil latency isn't guaranteed by Safari.

## Four-position rounded toolbar

The iPad editor now uses a pill-shaped toolbar with four fixed positions. Tap the small four-way position button beside the drag grip to choose **Top**, **Bottom**, **Left** or **Right**. Top and Bottom are horizontal; Left and Right are vertical. You can also drag the grip and release it to snap to the nearest screen edge. The position is remembered on this browser/device. This does not change note contents, the ink engine, or the IndexedDB workspace schema.

## Apple Pencil-only ink and more shapes (v8)

Drawing starts only from a direct Apple Pencil `pointerdown` contact (`pointerType: pen`) in Safari. Finger and mouse input cannot add ink, erase, or create shapes; toolbar buttons still work with touch. The Text tool remains available for typing. Pencil strokes are rendered using smoother quadratic curves while retaining the original saved point format. Choose the new **Shapes** button for line, rectangle, rounded rectangle, ellipse, circle, triangle, arrow, diamond, pentagon, hexagon, star, parallelogram or heart. Shape previews are drawn from Pencil drag start/end points and saved like ordinary strokes. These features have not yet been benchmarked on a physical iPad.
