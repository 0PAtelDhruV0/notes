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
- Create a note: choose a subject and subsection from the offline worldwide directory, or enter a custom subject/subsection. Choose a page template and paper.
- Open any note: dashboard and navigation disappear, leaving a **full-viewport writing canvas**.
- Floating toolbar: drag the dotted grip to move it; position is remembered locally. Pen, highlighter, eraser, text, line, rectangle, ink color, pen size, undo/redo, and paper selection.
- Pages and attachments: use **Pages** in the editor header to show the compact page-management popover.
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