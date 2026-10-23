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
/** @experimental The layout version this binding reads and writes. */
export const LAYOUT_VERSION = 1;
/** The roots of the Yjs 13 bindings' layouts. */
export const LEGACY_ROOTS: readonly string[] = ['root', 'root-v2'];
