# Book import and export

Open **Books > Import / export** (`/books/transfer`).

- **Export full backup (JSON)** downloads every saved book and the mood/genre tag library. Filters on the Books screen do not limit the export. The file includes IDs, categories (including custom categories), copies/formats, progress mode and values, ratings, dates, series, reviews, flags and cover URLs. Reading goals and downloaded image files are not part of the book backup.
- **Export summary (CSV)** downloads a spreadsheet-friendly summary. CSV is export-only; JSON is the full-fidelity restore format.
- **Import** accepts a version 1 LifeOS JSON export, validates it and shows the proposed changes before writing. The file limit is 20 MB. Other file formats are rejected.
- Imports automatically enrich existing books by ID, ISBN, or normalized title/author when ISBNs do not conflict. Missing metadata is filled, Other categories can become specific, and tags/copy formats are combined. Existing non-empty details, reviews, ratings and reading history are preserved. Ambiguous matches are skipped.
- Matching books retain their existing IDs. Different ISBN editions remain separate. Re-importing a backup does not duplicate matched books, tags or copy formats.
- Matching tag names/types reuse the existing tag ID. Conflicting tag IDs are remapped without overwriting existing tags. Imported custom categories remain available in the book editor.
- Imports do not delete books outside the backup. Writes use the signed-in account and existing private Firestore rules. New records use create-only preconditions; updates use the version read immediately before importing to detect concurrent changes.
- Large imports use bounded batches. If a later batch fails, earlier batches remain saved. The error reports how many books were saved, the library reloads, and a retry merges additional information into saved records.

Validation: 76 book-related tests passed, including complete JSON round trips, invalid-file rejection, ID merging, tag remapping, custom categories, guarded batched writes, partial failures, CSV escaping and existing book editing/progress tests. Production build and Angular type/template checks passed. Live account imports were not run from the development workspace.
