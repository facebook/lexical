/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The codes of the warnings `@lexical/y` passes to the editor's `onWarn`, as
// `LexicalWarning`s (see YWarningCode).

/**
 * @experimental The document's layout record is missing (its root has
 * content, or the record was removed), newer than this version supports or
 * malformed, or an older layout's root has content: the binding is read
 * only. `data`: `{layout: number | undefined, legacyRoots: string[]}` (the
 * layout version the record names when it is newer, otherwise `undefined`,
 * and the older layouts' roots that hold content).
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
 * @experimental A node holds named slots where the document cannot store
 * them: on a node stored as a line, a format or a group (a slot set on a
 * paragraph, a link or a list), or on the root. The change is not written
 * and the binding is read only. `data`: `{types: string[]}` (the types of
 * those nodes).
 */
export const UNSUPPORTED_SLOTS_WARNING = '@lexical/y/unsupported-slots';

/**
 * @experimental The editor is configured in a way the binding cannot write
 * safely: `BlockIdExtension` with `repairTransforms: true` (`YCollabExtension`
 * sets `false`; an app overrode it, or a `YBinding` used directly runs with
 * the extension's default). Nothing is written and the binding is read only.
 * `data`: `{options: string[]}` (`'<extension>.<option>'`).
 */
export const UNSUPPORTED_CONFIG_WARNING = '@lexical/y/unsupported-config';

/**
 * @experimental The codes of the `LexicalWarning`s `@lexical/y` passes to the
 * editor's `onWarn` (`error.code` when `error instanceof LexicalWarning`).
 * Codes are public API: a code is never renamed, and never reused for
 * another condition; new codes may be added in any release, so a `switch`
 * over `error.code` needs a `default` branch.
 */
export type YWarningCode =
  | typeof UNSUPPORTED_LAYOUT_WARNING
  | typeof UNKNOWN_NODE_TYPES_WARNING
  | typeof STORAGE_MISMATCH_WARNING
  | typeof SELF_CHECK_WARNING
  | typeof RECOVERED_READ_WARNING
  | typeof RECOVERED_WRITE_WARNING
  | typeof NESTED_FALLBACK_WARNING
  | typeof UNSYNCED_VALUE_WARNING
  | typeof UNSUPPORTED_SLOTS_WARNING
  | typeof UNSUPPORTED_CONFIG_WARNING;

/** A warning found outside a binding's own state (class derivation, values). */
interface WarningNote {
  readonly code: YWarningCode;
  readonly message: string;
  readonly data: unknown;
}

const noted = new Set<string>();
const notes: WarningNote[] = [];

/**
 * Note a warning about a class or a value, once per message in the process
 * (what is found about a class is cached with it, so it is found once): every
 * binding reports it once (see `notesSince`).
 */
export function noteOnce(
  code: YWarningCode,
  message: string,
  data: unknown,
): void {
  if (!noted.has(message)) {
    noted.add(message);
    notes.push({code, data, message});
  }
}

/**
 * The notes made since a binding last took them (`seen` of them, oldest
 * first), and the new count. The list only grows by distinct messages, so it
 * stays as small as the set of classes and properties warned about.
 */
export function notesSince(
  seen: number,
): [notes: readonly WarningNote[], seen: number] {
  return [notes.slice(seen), notes.length];
}
