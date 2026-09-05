// ─────────────────────────────────────────────────────────────────────────────
//  notes.ts — the engineering log.
//
//  Single source for /notes/ and the three-entry excerpt on /work/studio, so
//  the two can never drift. Copy lives in the i18n dictionary under `note.N.*`;
//  this file carries only the ordering and the untranslated mono tags.
//
//  Entries are append-only and never renumbered — a note is a dated fact, and
//  /notes/ renders them newest-first so the log reads as a log.
// ─────────────────────────────────────────────────────────────────────────────
export interface Note {
  /** stable id, also the display number and the i18n namespace */
  n: number;
  /** short monospace label — deliberately not translated, like the rest of the UI's technical labels */
  tag: string;
}

export const notes: Note[] = [
  { n: 1, tag: "WEBGL / MOBILE GPU" },
  { n: 2, tag: "REDUCED MOTION" },
  { n: 3, tag: "I18N / ROUTING" },
  { n: 4, tag: "MEDIA / 12.75 MB" },
  { n: 5, tag: "SCROLL LOCK" },
  { n: 6, tag: "TYPOGRAPHY / ANDROID" },
  { n: 7, tag: "CODEC / DROPPED" },
  { n: 8, tag: "BUNDLING / REVERTED" },
];

/** Newest first — how the log page reads. */
export const notesNewestFirst = [...notes].reverse();

export const noteKey = (n: number, part: "title" | "text") => `note.${n}.${part}`;
