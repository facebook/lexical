/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The codes of the warnings `@lexical/y` passes to the editor's `onWarn`, as
// `LexicalWarning`s. Codes are public API: never renamed or reused, only
// added (each one is also listed in `LexicalWarningCode` in `lexical`).

/**
 * @experimental The document's layout version is missing (its root has
 * content), newer than this version supports or malformed, or an older
 * layout's root has content: the binding is read only. `data`:
 * `{layout: unknown, legacyRoots: string[]}` (the layout record found, and
 * the older layouts' roots that hold content).
 */
export const UNSUPPORTED_LAYOUT_WARNING = '@lexical/y/unsupported-layout';
/**
 * @experimental The document has node types the editor does not register:
 * the binding is read only. `data`: `{types: string[]}`.
 */
export const UNKNOWN_NODE_TYPES_WARNING = '@lexical/y/unknown-node-types';
/**
 * @experimental The document stores node types in a way this editor's
 * classes cannot (another storage kind or group identity): the binding is
 * read only. `data`: `{types: string[]}`.
 */
export const STORAGE_MISMATCH_WARNING = '@lexical/y/storage-mismatch';
/**
 * @experimental The self-check (`selfCheck`, off by default) found the editor
 * and the document disagree. `data`: `{problems: string[], remote: boolean}`
 * (`remote`: found reading a peer's change, which the binding then reads
 * again in full).
 */
export const SELF_CHECK_WARNING = '@lexical/y/self-check';
/**
 * @experimental A remote change could not be read: the editor was rebuilt
 * from the document. `data`: `{error: unknown}` (what the reader threw).
 */
export const RECOVERED_READ_WARNING = '@lexical/y/recovered-read';
/**
 * @experimental A local change could not be written: the document was
 * rewritten from the editor. `data`: `{error: unknown}` (what the writer
 * threw).
 */
export const RECOVERED_WRITE_WARNING = '@lexical/y/recovered-write';
/**
 * @experimental A node class's declarations make it a line, format or group,
 * but something the class does prevents it (an incomplete schema, an
 * overridden merge method, slots): it is stored as a nested node. Reported
 * once per class and reason. `data`: `{type: string}`.
 */
export const NESTED_FALLBACK_WARNING = '@lexical/y/nested-fallback';

/**
 * @experimental A node property or NodeState value is not plain JSON (for
 * example a nested editor instance), so it is not synchronized. Reported
 * once per property. `data`: `{property: string}` (`'<type>.<field>'` or
 * `'NodeState <key>'`).
 */
export const UNSYNCED_VALUE_WARNING = '@lexical/y/unsynced-value';

/**
 * The codes a `YBinding` reports (internal: apps switch over
 * `LexicalWarningCode`, which stays open to new codes).
 */
export type YBindingWarningCode =
  | typeof UNSUPPORTED_LAYOUT_WARNING
  | typeof UNKNOWN_NODE_TYPES_WARNING
  | typeof STORAGE_MISMATCH_WARNING
  | typeof SELF_CHECK_WARNING
  | typeof RECOVERED_READ_WARNING
  | typeof RECOVERED_WRITE_WARNING
  | typeof NESTED_FALLBACK_WARNING
  | typeof UNSYNCED_VALUE_WARNING;

/** A warning found outside a binding's own state (class derivation, values). */
export interface WarningNote {
  readonly code: YBindingWarningCode;
  readonly message: string;
  readonly data: unknown;
}

const noted = new Set<string>();
let notes: WarningNote[] = [];

/**
 * Note a warning about a class or a value, once per message in the process:
 * the next binding to pass on its warnings reports it (see `takeNotes`).
 */
export function noteOnce(
  code: YBindingWarningCode,
  message: string,
  data: unknown,
): void {
  if (!noted.has(message)) {
    noted.add(message);
    notes.push({code, data, message});
  }
}

/** The notes not reported yet, oldest first. */
export function takeNotes(): readonly WarningNote[] {
  const taken = notes;
  if (taken.length > 0) {
    notes = [];
  }
  return taken;
}
