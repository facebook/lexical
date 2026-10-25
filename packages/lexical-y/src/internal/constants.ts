/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The names and versions a document is recognized by: the shared root's
// default name, the layout record (see LAYOUT_PREFIX), and the older
// layouts' roots.

/**
 * @experimental The default name of the shared root, which `@lexical/yjs`
 * clients never write to (they use `root` and `root-v2`).
 */
export const DEFAULT_ROOT_NAME = 'lexical-y';
/**
 * Prefix of the root attributes that record the layout versions a document
 * needs (internal): `lexical-y:<version>` = true, one per version. The record
 * only grows: a writer records a version in the same transaction as, and
 * before, the first content that needs it, and the binding never deletes
 * one. A reader takes the highest version recorded, so two clients that
 * upgrade a document at once agree on it. Any change to how a stored shape
 * is read is a new version.
 */
export const LAYOUT_PREFIX = 'lexical-y:';
/**
 * @experimental The newest layout version this binding reads and writes.
 * A document records version 1; the first move record or lifted block
 * written into it also records 2 (clients that only know version 1 then go
 * read only instead of misreading them).
 */
export const LAYOUT_VERSION = 2;
/** The version a new document records. */
export const BASE_LAYOUT_VERSION = 1;
/** The version of a document holding move records or lifted blocks. */
export const MOVES_LAYOUT_VERSION = 2;
/** The roots of the Yjs 13 bindings' layouts. */
export const LEGACY_ROOTS: readonly string[] = ['root', 'root-v2'];
