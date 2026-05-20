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
 * Use {@link composeOverlayRules} to merge two or more overlays into a
 * single one for cases where libraries each ship their own overlay and
 * an app wants to install them together.
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
  /** @internal — kept so {@link composeOverlayRules} can recompile. */
  readonly rules: readonly AnyDOMImportRule[];
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
    rules,
  };
}

/**
 * Compose two or more {@link CompiledOverlayRules} into a single overlay.
 * Earlier arguments are higher priority — rules from `overlays[0]`
 * dispatch first, then `overlays[1]`, etc. The merged rule list is
 * recompiled once so the runtime cost matches a single overlay.
 *
 * This is the definition-time complement to runtime composition (one
 * overlay rule calling `ctx.$importChildren(el, {rules: another})` to
 * push a nested overlay): use this when you want a fixed merged
 * overlay across an entire subtree.
 *
 * @experimental
 */
export function composeOverlayRules(
  ...overlays: readonly CompiledOverlayRules[]
): CompiledOverlayRules {
  const rules: AnyDOMImportRule[] = [];
  for (const overlay of overlays) {
    for (const rule of overlay.rules) {
      rules.push(rule);
    }
  }
  return {
    __type: 'CompiledOverlayRules',
    dispatch: compileImportRules(rules),
    rules,
  };
}
