# Technical architecture and data model

## Core principles

1. **UI-agnostic domain layer.** Future SwiftUI, React or native WebView interfaces can use the same business concepts without reimplementing note organization.
2. **Local-first.** IndexedDB holds all user content, with file binaries in a dedicated object store. The static service worker does not cache private data.
3. **Stable IDs.** Subjects, subsections, notes, pages and strokes use opaque IDs. Display order or names are never keys.
4. **Atomic logical edits.** `WorkspaceStore.transact()` clones a draft, runs a synchronous change, validates the workspace and queues a serialized write. It publishes status/errors via `subscribe`.
5. **Versioned data.** `SCHEMA_VERSION=1` in `src/core/model.js`. Add real migrations before changing persisted structure.
6. **Modular extension ports.** Cloud sync, AI, OCR, PDF rendering and native input are future adapters, not baked into the model.

## Persistence schema (illustrative)

```json
{
  "schemaVersion": 1,
  "id": "workspace_...",
  "revision": 8,
  "createdAt": "2026-10-13T00:00:00.000Z",
  "updatedAt": "2026-10-13T00:00:00.000Z",
  "subjects": [
    {"id":"subject_...","name":"Physics","field":"Natural Sciences","custom":false,
     "subsections":[{"id":"section_...","name":"Quantum mechanics","custom":false}]}
  ],
  "notes": [
    {"id":"note_...","title":"Lecture 1","subjectId":"subject_...","subsectionId":"section_...",
     "tags":["semester-1"],"starred":false,"lectureDate":null,"reviewAt":null,"deletedAt":null,
     "lastPageId":"page_...","createdAt":"...","updatedAt":"...",
     "pages":[{"id":"page_...","paper":"ruled","text":"...","strokes":[],"attachments":[],"createdAt":"...","updatedAt":"..."}]}
  ],
  "tasks":[],
  "flashcards":[],
  "settings":{"defaultPaper":"ruled","pencilOnly":false,"autosave":true,"lastNoteId":null}
}
```

### Stored stroke

```json
{"id":"stroke_...","tool":"pen","color":"#202020","size":3,
 "points":[{"x":0.15,"y":0.19,"p":0.5},{"x":0.16,"y":0.2,"p":0.75}]}
```

Normalized coordinates (`x`,`y` between 0 and 1) decouple note data from iPad size, orientation, zoom and viewport pixel density.

### Attachment record

A page's `attachments` contains only metadata: `{id,name,type,size,createdAt}`. Binary blobs are stored in IndexedDB `files` under attachment ID. A full backup includes metadata and base64-encoded binaries.

## Service interfaces

- `Catalog.search(query, field?, limit?)`, `Catalog.subsections(subjectName)`, `Catalog.findSubject(name)`
- `NotesService.ensureClassification(subjectName, subsectionName)`
- `NotesService.create({title,subjectName,subsectionName,template,paper,lectureDate,tags})`
- `NotesService.list({query,subjectId,subsectionId,starred,trash,due})`
- `NotesService.get(noteId)`, `update(noteId, patch)`, `reclassify(noteId, subjectName,subsectionName)`
- `NotesService.addPage`, `duplicatePage`, `reorderPage`, `deletePage`, `updatePage`, `page`, `setLastPage`
- `NotesService.trash`, `restore`, `purge`
- `StudyService.createTask`, `updateTask`, `deleteTask`, `listTasks`, `addFlashcard`, `dueCards`, `reviewCard`
- `AttachmentService.attach(noteId,pageId,file)`, `get(id)`, `remove(noteId,pageId,id)`
- `BackupService.export()`, `restore(parsedJSON)`
- `WorkspaceStore.snapshot`, `subscribe(cb)`, `transact(cb)`, `flush()`
- `mountInkCanvas(canvas,{initialStrokes,onCommit,getTool,getColor,getSize,pencilOnly})`

## Extensibility plan

- **File system / cloud adapter:** define `SyncProvider` with `pushOperations/pullOperations`; stable IDs and revision timestamps will not alone solve conflicts. Introduce per-note revisions, authenticated accounts, E2EE policies and a conflict strategy before deploying cloud sync.
- **High-performance editor:** move pages and large stroke arrays into separate IndexedDB object stores instead of rewriting the whole workspace per stroke. Keep vector format and add incremental object-level transactions.
- **PDF engine:** add PDF.js viewer as a separate module; model annotations per PDF page and implement actual flatten/export of annotations when ready.
- **Handwriting search:** add OCR results and text indexes as derived data, never replace original vector strokes.
- **Audio:** store recordings separately as blobs; synchronize ink timestamps to audio only when a time-based event schema exists.
- **iPad native option:** SwiftUI + PencilKit is appropriate if native input latency, advanced pressure and precise palm rejection are essential. The model and service concepts remain useful for a native redesign.

## Important correctness boundary

The included JSON validation covers schema structure and unique note IDs, not untrusted file scanning or comprehensive semantic validation. Before inviting users to trust this app with important school work: add schema migrations, duplicate attachment detection, streamed backup validation, quota checks, interruption recovery, more edge-case tests and real iPad device tests.
