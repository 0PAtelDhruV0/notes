# Notebook Foundation — your UI, your UX

A **clean, framework-independent foundation** for a student notebook iPad web app. It is not a clone of Goodnotes or Notability. The interface is deliberately basic: you build the visual design yourself.

> This is an **extensible engineering starter**, not a tested production replacement for a native note-taking app. Keep backups, and validate Pencil performance on physical iPads before relying on it for classes.

## Run it on Windows / macOS / Linux

Requirements: **Node.js 20+**. There are **no third-party npm dependencies**.

```bash
cd Notebook-Foundation
npm run dev
```

Visit http://localhost:5173 in your browser. To run the automated tests:

```bash
npm test
```

### Put it on iPad via GitHub Pages

1. Unzip `Notebook-Foundation.zip` and upload the contents of the **Notebook-Foundation** folder to the root of your GitHub repository. `index.html` must be at the root.
2. Go to repository **Settings → Pages**, select **Deploy from a branch**, `main`, `/ (root)`, and save.
3. Open the GitHub Pages HTTPS URL in iPad Safari. Use **Share → Add to Home Screen** to install the web app.
4. The service worker can cache the app shell for offline use after successful installation; actual notes live in IndexedDB **on that specific browser/device**.

GitHub Pages **does not store your private notes**. An uploaded GitHub repository should never contain personal notebook backups or lecture documents.

## What you can keep vs. replace

| Directory / file | Purpose | Edit while making UI? |
|---|---|---|
| `src/ui/developer-shell.js` | Temporary screens and buttons to exercise the code | **YES — replace entirely** |
| `src/styles/skeleton.css` | Basic usable layout, not a design system | **YES — replace entirely** |
| `index.html` | Main HTML shell; app mount points | **YES — alter markup** |
| `src/main.js` | Creates services and connects the UI | **YES — point it to your UI** |
| `src/app.js` | Service composition / dependency injection | Usually no |
| `src/core/*` | Stable schema and serialized state changes | Change only with a data migration |
| `src/storage/*` | IndexedDB storage, attachments and persistence | Keep stable or replace behind the same contract |
| `src/services/*` | Domain operations for subjects, notes, pages, tasks, attachments, backup | Reuse from any UI |
| `src/editor/ink.js` | Pointer ink engine / rendering / undo and redo | Reuse or upgrade |
| `catalog/worldwide-subjects.csv` | Offline topic directory (editable data) | Edit/add new subjects freely |
| `sw.js` | Static offline cache (no user data) | Update cache list when adding new modules |

## Core capabilities provided

- Offline-first IndexedDB with serialized writes and a visible save state
- Workspace schema, validation, stable IDs, explicit schema version
- Worldwide **261-subject / 1,408-row** searchable taxonomy, organized in 12 fields, plus unlimited custom subjects and subsections
- Mandatory Subject → Subsection classification for newly created notes
- Notes: titles, tags, star, lecture dates, due-for-review field, subcategories, Trash/restore/purge, page add/delete/reorder/duplicate
- Pages: ruled/grid/dot/Cornell/blank paper, typed content, normalized vector strokes, attached files
- Input: pointer pen/highlighter/eraser/line/rectangle, pressure sampling, stroke erase, undo and redo
- Assignments (tasks) and flashcards with a simple review scheduler
- PDF, PNG, JPEG, TXT attachments stored in IndexedDB, up to 25 MB each
- Full JSON export/restore including attached binary blobs
- Minimal PWA install shell and an automated test suite

## Architecture

```text
                     YOUR UI & UX (replaceable)
                      src/ui/  +  CSS
                              |
                      src/app.js  (API)
                              |
                +-------------+-------------+
                |             |             |
             Notes        Study        Attachments/Backup
                |             |             |
                +-------------+-------------+
                              |
                    WorkspaceStore  ←  schema
                              |
                        IndexedDB
                       +      +
                  Workspace  File Blobs

Catalog CSV → Catalog service → subject/subsection picker in your UI
Pointer events → Ink editor → saved vector strokes per page
```

## Example: your custom Create Note button

```js
// From src/main.js after createNotebookApp() or from any UI module with the app instance:
const note = app.notes.create({
  title: 'Week 1 — Forces',
  subjectName: 'Physics',
  subsectionName: 'Mechanics', // Or any custom subsection name
  template: 'lecture',
  paper: 'ruled',
  tags: ['semester-1']
});

// Save user text:
app.notes.updatePage(note.id, note.pages[0].id, {text: 'Newton’s first law…'});

// List and search:
const results = app.notes.list({query: 'Newton'});

// Save pending transactions before closing/switching contexts:
await app.store.flush();
```

## Data safety and limitations

- **Not native iPad software**: it runs in iPad Safari / a home-screen web app. It does not use Apple's native PencilKit. The pointer canvas is a usable foundation, not a claim of native Goodnotes-class latency or palm rejection.
- **No cloud sync or accounts yet**. Local data stays in the browser's IndexedDB; deleting website data can delete notes. Download a backup regularly and verify it can be restored.
- **No true PDF ink annotation or editable PDF export yet**. You can attach and view PDF files, but the writing canvas is a separate notebook page.
- **No handwriting recognition, OCR, AI models, recording-to-ink sync, collaboration, or encryption-at-rest layer** yet. These need independently designed implementations and tests.
- **Catalog is curated, not exhaustive**. Education classifications change and local subjects vary. Add rows or use custom subjects.
- **Previous Notebook Studio versions are not automatically migrated** into this clean foundation. Keep old backups and don't overwrite an existing deployed app before implementing a migration adapter.
- Browser storage quota is device dependent. Very large books and attachments need an improved per-document storage layer and streamed backups in a later version.
- The temporary interface is intentionally plain. It exists to verify services, not determine your visual design.

See `docs/ARCHITECTURE.md` for technical details, `docs/UI-INTEGRATION.md` for the UI replacement checklist, and `docs/NEXT-STEPS.md` for prioritized product engineering.
