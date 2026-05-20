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
  DOMPreprocessContext,
  DOMPreprocessFn,
  GenerateNodesFromDOMOptions,
  ImportContextPairOrUpdater,
  ImportSession,
  ImportStateConfig,
} from './types';

import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
  shallowMergeConfig,
} from 'lexical';

import {DOMImportExtensionName} from '../constants';
import {contextFromPairs, contextValue} from '../ContextRecord';
import {type CompiledDispatch, compileImportRules} from './compileImportRules';
import {defineImportRule} from './defineImportRule';
import {$withImportContext, ImportSessionImpl} from './ImportContext';
import {$inlineStylesFromStyleSheets} from './inlineStylesFromStyleSheets';
import {$runImport} from './runImport';
import {selBase} from './sel';

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
  /**
   * Functions run in order on the DOM before walking begins, mutating in
   * place. The default config registers
   * {@link $inlineStylesFromStyleSheets} (resolves `<style>` rules to
   * inline styles so the rules' style-driven matchers see them); apps
   * append additional preprocessors (e.g. strip unsafe elements,
   * normalize attributes, resolve relative URLs).
   *
   * `mergeConfig` appends, so each contributing extension's preprocessors
   * run in dependency order. Per-call preprocessors registered via
   * {@link GenerateNodesFromDOMOptions.preprocess} run AFTER these.
   */
  readonly preprocess: readonly DOMPreprocessFn[];
}

/**
 * Drive a stack of {@link DOMPreprocessFn}s top-to-bottom: the highest-
 * index fn runs first and may call `$next()` to defer to the next-lower
 * one. Matches the export-side `callExportMimeTypeFunctionStack` shape.
 */
function $runPreprocessStack(
  stack: readonly DOMPreprocessFn[],
  dom: Document | ParentNode,
  ctx: DOMPreprocessContext,
): void {
  let i = stack.length - 1;
  const $next = () => {
    while (i >= 0) {
      const cur = stack[i--];
      cur(dom, ctx, $next);
      return;
    }
  };
  $next();
}

/**
 * Lowest-priority catch-all rule used as the default `config.rules` entry
 * for {@link DOMImportExtension}: descends into the element's children
 * and returns whatever they produced. With no other matching rule, an
 * element vanishes and its contents are inserted in its place — the
 * legacy `$createNodesFromDOM` hoisting behavior, but now expressed as a
 * regular rule that apps can override (e.g. with a `sel.any()` rule that
 * captures and discards unknown elements).
 *
 * @experimental
 */
export const DefaultHoistRule = defineImportRule({
  $import: (ctx, el) => ctx.$importChildren(el),
  match: selBase.any(),
  name: '@lexical/html/default-hoist',
});

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
    const configPreprocess = config.preprocess;
    return {
      $generateNodesFromDOM: (
        dom: Document | ParentNode,
        options?: GenerateNodesFromDOMOptions,
      ) => {
        const session: ImportSession = new ImportSessionImpl();
        // Collected context pairs from preprocess-time setContext calls.
        // Applied (on top of options.context) before the walk so the
        // accumulated context is visible everywhere downstream.
        const fromPreprocess: ImportContextPairOrUpdater[] = [];
        const preprocessCtx: DOMPreprocessContext = {
          editor,
          session,
          setContext<V>(cfg: ImportStateConfig<V>, value: V) {
            fromPreprocess.push(contextValue(cfg, value));
          },
        };
        // Stack of preprocessors: config-level first, then per-call.
        // Top of stack (last in array) runs first; `next()` defers to
        // the next-lower one. Matches the GetClipboardDataExtension
        // convention so app-registered preprocessors can wrap built-in
        // ones via `next()`.
        const stack: readonly DOMPreprocessFn[] =
          options && options.preprocess
            ? [...configPreprocess, ...options.preprocess]
            : configPreprocess;
        $runPreprocessStack(stack, dom, preprocessCtx);
        const accumulatedContext: readonly ImportContextPairOrUpdater[] =
          options && options.context
            ? [...options.context, ...fromPreprocess]
            : fromPreprocess;
        const $run = () => $runImport(dispatch, editor, dom, session);
        return accumulatedContext.length > 0
          ? $withImportContext(accumulatedContext, editor)($run)
          : $run();
      },
      defaults,
    };
  },
  config: {
    contextDefaults: [],
    preprocess: [$inlineStylesFromStyleSheets],
    rules: [DefaultHoistRule],
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
    if (partial.preprocess) {
      (merged.preprocess as unknown[]) = [
        ...config.preprocess,
        ...partial.preprocess,
      ];
    }
    return merged;
  },
  name: DOMImportExtensionName,
});

/**
 * Look up the editor's {@link DOMImportExtension} and run its
 * `$generateNodesFromDOM`. Designed as a drop-in replacement for the
 * legacy `$generateNodesFromDOM(editor, dom)` signature so it can be
 * supplied to `ClipboardImportExtension.$generateNodesFromDOM` (or any
 * other consumer that wants to route through the extension pipeline).
 *
 * Throws if the editor was not built with {@link DOMImportExtension} as a
 * dependency.
 *
 * @experimental
 */
export function $generateNodesFromDOMViaExtension(
  editor: LexicalEditor,
  dom: Document | ParentNode,
  options?: GenerateNodesFromDOMOptions,
): LexicalNode[] {
  const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
  return dep.output.$generateNodesFromDOM(dom, options);
}
