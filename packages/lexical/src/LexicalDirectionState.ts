/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createState} from './LexicalNodeState';

/**
 * Opt-in state backing `ElementNode.setDirection('auto')`. When `true`, the
 * element defers its direction to the browser's own bidi algorithm via
 * `dir="auto"` rather than pinning it to `'ltr'` or `'rtl'`.
 *
 * Kept out of `__dir` deliberately: `$getReconciledDirection` stops resolving
 * a child's direction as soon as an ancestor has a non-null `__dir`, so an
 * `'auto'` stored there would collapse every block's independent detection
 * into one document-wide result. It also keeps `SerializedElementNode.direction`
 * at its existing `'ltr' | 'rtl' | null` domain.
 *
 * Defaults to `false`, in which case nothing extra is serialized.
 */
export const directionAutoState = createState('dirAuto', {parse: Boolean});
