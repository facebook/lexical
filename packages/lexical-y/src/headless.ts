/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The implementation lives under ./internal and is bundled into this entry;
// `@lexical/y` stays an external sibling.
import {type Doc, encodeStateAsUpdate, mergeUpdates} from '@y/y';
import {$getRoot, type LexicalWarning} from 'lexical';

import {DEFAULT_ROOT_NAME} from '.';
import {
  EDITOR_WARNING,
  FOLLOW_UPS_EXHAUSTED_WARNING,
  type HeadlessYConfig,
  type OpenedHeadlessYEditor,
  openHeadlessYEditor,
  YHeadlessError,
  type YHeadlessErrorCode,
} from './internal/HeadlessEditor';
import {inspectUpdateRoots} from './internal/UpdateRoots';

export type {HeadlessYConfig, YHeadlessErrorCode};
export {EDITOR_WARNING, FOLLOW_UPS_EXHAUSTED_WARNING, YHeadlessError};

/** @experimental The result of {@link editYState}. */
export interface EditYStateResult {
  /**
   * Everything the edit wrote, as one merged update, or null when it changed
   * nothing. Includes what opening the document wrote (repairs and
   * refreshes a client would also write), which the edit may depend on.
   */
  update: Uint8Array | null;
  /** `state` with `update` merged in. */
  state: Uint8Array;
  /**
   * Warnings reported while opening and editing, oldest first (also passed
   * to `config.onWarn`).
   */
  warnings: LexicalWarning[];
}

/** @experimental */
export interface EditYStateOptions {
  /**
   * The shared roots the update may write to; anything else refuses the
   * edit. Default: the layout root only.
   */
  allowedRoots?: Iterable<string>;
  /**
   * Writes to other shared types of the document (for example an activity
   * log), run in one Yjs transaction after the edit. Their roots must be in
   * `allowedRoots`.
   */
  transact?: (doc: Doc) => void;
  /** Update tag(s) of the edit's editor update. */
  tag?: string | string[];
}

function requireInitialized(opened: OpenedHeadlessYEditor): void {
  if (opened.handle.binding.status !== 'active') {
    throw new YHeadlessError(
      'not-initialized',
      '@lexical/y: the state has no layout record; seed the document first.',
    );
  }
}

/**
 * @experimental The state of a new document whose content `$build` writes
 * into an empty root: the documented way to seed a document (from a
 * template, an import, or a converter's editor). The content is written the
 * way a client's `initialize()` writes it: with a client id derived from the
 * content (53 bits under `'uint53'`, 32 under `'uint32'`) and outside any
 * undo history. Seeding identical content twice gives the same bytes, and
 * the two seeds merge into one copy; content with random parts (such as ids
 * an extension draws for new blocks) is not identical. The state only holds
 * the layout root, so a converter merges it into the stored document next
 * to an older layout's root.
 */
export function seedYState(
  config: HeadlessYConfig,
  $build: () => void,
): Uint8Array {
  const opened = openHeadlessYEditor(config);
  try {
    opened.runUpdate(() => {
      $getRoot().clear();
      $build();
    });
    opened.handle.binding.initialize();
    requireInitialized(opened);
    return encodeStateAsUpdate(opened.handle.doc);
  } finally {
    opened.handle.dispose();
  }
}

/**
 * @experimental Run `$edit` (one discrete editor update, plus the updates it
 * makes listeners schedule) on the document at `state` and return the update
 * it makes. The update is checked to write only to `allowedRoots`. Throws a
 * {@link YHeadlessError} when the document is not initialized or is read
 * only, or when the update writes elsewhere; an error thrown by `$edit` is
 * rethrown and nothing is written. Warnings (`LexicalWarning`s) are
 * returned in `warnings` and passed to `config.onWarn`; they never refuse
 * the edit.
 *
 * With `$edit` a no-op, the update is what opening the document writes (ids
 * an extension gives blocks that have none, repairs): store it once before
 * relying on {@link readYState} for such values.
 */
export function editYState(
  state: Uint8Array,
  config: HeadlessYConfig,
  $edit: () => void,
  options: EditYStateOptions = {},
): EditYStateResult {
  // What opening writes is recorded too: the edit may build on it.
  const opened = openHeadlessYEditor({...config, state}, true);
  const {doc, warnings} = opened.handle;
  const updates = opened.writes;
  try {
    requireInitialized(opened);
    opened.runUpdate($edit, options.tag);
    if (options.transact) {
      const transact = options.transact;
      doc.transact(() => transact(doc));
    }
    if (updates.length === 0) {
      return {state, update: null, warnings: [...warnings]};
    }
    const update = updates.length === 1 ? updates[0] : mergeUpdates(updates);
    const allowed = new Set(
      options.allowedRoots || [config.root || DEFAULT_ROOT_NAME],
    );
    // Resolved against the headless document, which holds every parent and
    // every deleted item (it does not garbage collect).
    const {roots, unresolved} = inspectUpdateRoots(update, doc);
    const foreign = [...roots].filter(root => !allowed.has(root));
    if (foreign.length > 0 || unresolved > 0) {
      throw new YHeadlessError(
        'foreign-roots',
        `@lexical/y: the update writes outside the allowed roots (${
          foreign.length > 0 ? foreign.join(', ') : `${unresolved} unresolved`
        }).`,
      );
    }
    return {
      state: mergeUpdates([state, update] as Uint8Array<ArrayBuffer>[]),
      update,
      warnings: [...warnings],
    };
  } finally {
    opened.handle.dispose();
  }
}

/**
 * @experimental The value `$read` returns from the document at `state` (for
 * example its Markdown or `$getEditor().getEditorState().toJSON()`).
 * Nothing is written. Throws a {@link YHeadlessError} when the document is
 * not initialized or is read only.
 *
 * What opening the document writes is discarded: a value an extension
 * assigns on open (an id for a block stored without one) is read here but
 * never stored, so two reads can disagree. Store the update of a no-op
 * {@link editYState} first.
 */
export function readYState<T>(
  state: Uint8Array,
  config: HeadlessYConfig,
  $read: () => T,
): T {
  const opened = openHeadlessYEditor({...config, state});
  try {
    requireInitialized(opened);
    return opened.handle.editor.read($read);
  } finally {
    opened.handle.dispose();
  }
}
