/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyDOMImportRule,
  DOMImportExtensionOutput,
  GenerateNodesFromDOMOptions,
  ImportContextPairOrUpdater,
} from './types';

import {defineExtension, shallowMergeConfig} from 'lexical';

import {DOMImportExtensionName} from '../constants';
import {contextFromPairs} from '../ContextRecord';
import {type CompiledDispatch, compileImportRules} from './compileImportRules';
import {$withImportContext} from './ImportContext';
import {$runImport} from './runImport';

/**
 * Configuration for {@link DOMImportExtension}.
 *
 * @experimental
 */
export interface DOMImportConfig {
  /**
   * The set of {@link DOMImportRule}s contributed by this extension and its
   * dependencies. Rules are dispatched in priority order: rules contributed
   * by extensions merged later (i.e. closer to the editor root) run first
   * and may call `$next()` to delegate to lower-priority rules.
   *
   * `mergeConfig` prepends `partial.rules` to existing `rules`, so later
   * configuration carries higher priority.
   */
  readonly rules: readonly AnyDOMImportRule[];
  /**
   * Default context pairs applied to every `$generateNodesFromDOM` call.
   * Per-call overrides can be supplied via
   * {@link GenerateNodesFromDOMOptions.context}.
   */
  readonly contextDefaults: readonly ImportContextPairOrUpdater[];
}

/**
 * @experimental
 *
 * Extension-based replacement for the legacy `importDOM` / `DOMConversion`
 * machinery. Rules are contributed via configuration (see
 * {@link DOMImportConfig.rules}), compiled into a tag-bucketed dispatcher at
 * editor build time, and consumed via the extension's
 * {@link DOMImportExtensionOutput.$generateNodesFromDOM} output.
 *
 * The legacy `$generateNodesFromDOM` continues to work in parallel; the
 * intent is to migrate node packages over to this extension incrementally.
 */
export const DOMImportExtension = defineExtension<
  DOMImportConfig,
  typeof DOMImportExtensionName,
  DOMImportExtensionOutput,
  void
>({
  build(editor, config) {
    const dispatch: CompiledDispatch = compileImportRules(config.rules);
    const defaults = contextFromPairs(config.contextDefaults, undefined);
    return {
      $generateNodesFromDOM: (
        dom: Document | ParentNode,
        options?: GenerateNodesFromDOMOptions,
      ) => {
        const ctx = options && options.context;
        const $run = () => $runImport(dispatch, editor, dom);
        return ctx ? $withImportContext(ctx, editor)($run) : $run();
      },
      defaults,
    };
  },
  config: {
    contextDefaults: [],
    rules: [],
  },
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    if (partial.rules) {
      (merged.rules as unknown[]) = [...partial.rules, ...config.rules];
    }
    if (partial.contextDefaults) {
      (merged.contextDefaults as unknown[]) = [
        ...config.contextDefaults,
        ...partial.contextDefaults,
      ];
    }
    return merged;
  },
  name: DOMImportExtensionName,
});
