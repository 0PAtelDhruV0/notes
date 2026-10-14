# Replace the UI and UX in four steps

The app deliberately ships with a **developer harness**, not a finished dashboard.

## 1. Make your screens

Replace `src/ui/developer-shell.js` with any architecture you want:

```text
Your Dashboard   ─┐
Subject Library   ├── use application services via `app`
Note Creator      │
Notebook Editor   │
Planner           │
Study/Flashcards  │
Files / Settings ─┘
```

Create components in `src/ui/` and your own styles in `src/styles/`. Use iPad-first measurements and minimum 44px touch targets for controls. Keep content scrolling inside editor panels rather than scrolling the whole interface if desired.

## 2. Connect data

`src/main.js` currently does:

```js
const notebook = await createNotebookApp();
mountDeveloperShell(notebook);
```

Replace it with:

```js
const notebook = await createNotebookApp();
mountMyBeautifulUI(notebook); // your new entrypoint
```

Useful data subscriptions:

```js
const stop = notebook.store.subscribe((workspace, status, error) => {
  // update save badge, note list, categories, planner indicators, etc.
});
```

The store snapshot is a detached copy. Never mutate it directly; call a service or `store.transact()`.

## 3. Implement subject / subsection selection

A new note **must** be classified. To populate subject suggestions:

```js
const matchedSubjects = notebook.catalog.search('machine learning');
const subsections = notebook.catalog.subsections('Computer Science');
```

At the bottom of both lists put **Other — create custom**. Pass custom strings to `notebook.notes.create()`; they become persisted classifications automatically.

## 4. Reuse the drawing engine

```js
const session = mountInkCanvas(canvasElement, {
  initialStrokes: page.strokes,
  getTool: () => selectedTool,
  getColor: () => selectedColor,
  getSize: () => penSize,
  pencilOnly: () => settings.pencilOnly,
  onCommit: (strokes) => notebook.notes.updatePage(note.id, page.id, {strokes})
});

// toolbar interactions
session.undo();
session.redo();
// component unmount
session.destroy();
```

Do not leave multiple pointer listeners attached when changing notes. Create a new session when changing the page and destroy the previous one.

## 5. Before shipping

- Design note creation, library, editing, tasks, flashcards, search, files, settings, Trash, and storage-error feedback.
- Offer explicit backup/download prompts and unmistakable feedback if a save fails.
- Restore the previous note/page after reopening the app.
- Test realistic large notes, offline mode, handwriting at device rotation, iPad split-screen, Safari and actual Apple Pencil.
- Implement real note migrations before replacing an older Notebook Studio deployment.
