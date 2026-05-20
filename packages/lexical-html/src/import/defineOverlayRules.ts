/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {AnyDOMImportRule} from './types';

import {type CompiledDispatch, compileImportRules} from './compileImportRules';

/**
 * Opaque handle for a pre-compiled set of overlay rules. Produce one with
 * {@link defineOverlayRules} and pass it to
 * {@link DOMImportContext.$importChildren} via
 * {@link ImportChildrenOpts.rules}.
 *
 * The internal shape is intentionally not part of the public API: it's a
 * compiled dispatch table tagged with `__type` so callers cannot pass a
 * raw rule array where a compiled overlay is expected.
 *
 * @experimental
 */
export interface CompiledOverlayRules {
  readonly __type: 'CompiledOverlayRules';
  /** @internal */
  readonly dispatch: CompiledDispatch;
}

/**
 * Pre-compile a set of {@link DOMImportRule}s into a {@link CompiledOverlayRules}
 * handle that can be installed via
 * `ctx.$importChildren(el, {rules: …})`.
 *
 * Overlay rules installed as a raw array would be re-compiled on every
 * `$importChildren` call. For overlays that are reused (e.g. a GitHub
 * code-table rule that wraps every matching table), call this once at
 * module scope so the dispatch table is built up front.
 *
 * @experimental
 */
export function defineOverlayRules(
  rules: readonly AnyDOMImportRule[],
): CompiledOverlayRules {
  return {
    __type: 'CompiledOverlayRules',
    dispatch: compileImportRules(rules),
  };
}
