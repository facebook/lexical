/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @experimental The default name of the shared root (not v1's or v2's). */
export const DEFAULT_ROOT_NAME = 'lexical-y';
/** @experimental Root attribute holding the layout version. */
export const LAYOUT_KEY = 'lexical-y';
/**
 * @experimental The newest layout version this binding reads and writes.
 * A document starts at version 1; the first move record or lifted block
 * written into it marks it 2 (clients that only know version 1 then go read
 * only instead of misreading them).
 */
export const LAYOUT_VERSION = 2;
/** The version a new document is marked with. */
export const BASE_LAYOUT_VERSION = 1;
/** The version of a document holding move records. */
export const MOVES_LAYOUT_VERSION = 2;
/** The roots of the Yjs 13 bindings' layouts. */
export const LEGACY_ROOTS: readonly string[] = ['root', 'root-v2'];
