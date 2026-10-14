# Prioritized milestones (after you finish UI/UX)

**Stage 1 — trustworthy personal notebook (foundation starts here)**
- UX design; full navigation; note creation; subject & subsection hierarchy
- iPad pointer canvas, page management, searching typed notes, recovery, download backups
- Save-failure reporting and true offline tests on physical devices

**Stage 2 — serious handwriting**
- Stroke segmentation, smoothing, geometric lasso select/move/resize, transform, layers, palm rejection
- Page thumbnail cache, zoom/pan, performance under thousands of strokes
- Gesture tests in landscape/portrait/split-screen on iPad hardware

**Stage 3 — PDF annotation and document workflows**
- PDF rendering and per-page ink overlays
- Flatten annotations into PDF on export, import many files, scans and large file handling
- Handwriting/search indexing via OCR, page/section merging

**Stage 4 — learning and revision tools**
- Class schedule, rich planner, spaced repetition improvements, link flashcards to page anchors
- Lecture recordings, bookmarks and optional synchronized audio timestamps
- Shared project/group notes with appropriate permissions

**Stage 5 — syncing and production readiness**
- Accounts, encrypted cloud backups, sync conflict resolution, multiple device support
- Schema migrations with tested backwards compatibility
- Observability, performance profiling, accessibility, security testing, disaster recovery

**Stage 6 — optional native iPad editor**
- Evaluate SwiftUI + PencilKit if web input is insufficient
- Keep common domain schema, write a native storage adapter and design migration/sync

> Don't advertise true PDF annotation, iCloud sync, searchable handwriting, AI or near-native Pencil performance before they are implemented and verified.
