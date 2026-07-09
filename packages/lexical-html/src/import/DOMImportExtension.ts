/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ContextRecord} from '../types';
import type {
  DOMImportExtensionOutput,
  DOMPreprocessContext,
  DOMPreprocessFn,
  GenerateNodesFromDOMOptions,
  ImportContextPairOrUpdater,
} from './types';

import {$getExtensionOutput} from '@lexical/extension';
import {defineExtension, type LexicalNode, shallowMergeConfig} from 'lexical';

import {DOMImportContextSymbol, DOMImportExtensionName} from '../constants';
import {$withFullContext, contextFromPairs} from '../ContextRecord';
import {type CompiledDispatch, compileImportRules} from './compileImportRules';
import {defineImportRule} from './defineImportRule';
import {
  type DOMImportRuleEntry,
  flattenRuleEntries,
} from './defineOverlayRules';
import {ImportSessionImpl} from './ImportContext';
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
   * The set of rules contributed by this extension and its dependencies.
   * Entries can be raw {@link DOMImportRule}s or a
   * {@link CompiledOverlayRules} produced by {@link defineOverlayRules}
   * (the latter is inlined in priority order — useful for libraries
   * that already publish a compiled overlay).
   *
   * Rules are dispatched in priority order: rules contributed by
   * extensions merged later (i.e. closer to the editor root) run first
   * and may call `$next()` to delegate to lower-priority rules.
   *
   * `mergeConfig` prepends `partial.rules` to existing `rules`, so later
   * configuration carries higher priority.
   */
  readonly rules: readonly DOMImportRuleEntry[];
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
export const DefaultHoistRule = /* @__PURE__ */ defineImportRule({
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
export const DOMImportExtension = /* @__PURE__ */ defineExtension<
  DOMImportConfig,
  typeof DOMImportExtensionName,
  DOMImportExtensionOutput,
  void
>({
  build(editor, config) {
    const dispatch: CompiledDispatch = compileImportRules(
      flattenRuleEntries(config.rules),
    );
    const defaults = contextFromPairs(config.contextDefaults, undefined);
    const configPreprocess = config.preprocess;
    return {
      $generateNodesFromDOM: (
        dom: Document | ParentNode,
        options?: GenerateNodesFromDOMOptions,
      ) => {
        // The session record IS the root layer of the walk's context.
        // Start with per-call options.context applied on top of the
        // editor's contextDefaults, then ensure we have a *fresh*
        // mutable child (never the shared defaults record) so
        // session.set writes never leak into the editor's config.
        const fromOpts =
          options && options.context
            ? contextFromPairs(options.context, defaults)
            : defaults;
        const sessionRecord: ContextRecord<typeof DOMImportContextSymbol> =
          fromOpts !== undefined && fromOpts !== defaults
            ? fromOpts
            : Object.create(defaults || null);
        const session = new ImportSessionImpl(sessionRecord);
        const preprocessCtx: DOMPreprocessContext = {session};
        // Stack of preprocessors: config-level first, then per-call.
        // Top of stack (last in array) runs first; `next()` defers to
        // the next-lower one. Matches the GetClipboardDataExtension
        // convention so app-registered preprocessors can wrap built-in
        // ones via `next()`. Preprocess writes via `ctx.session.set`
        // mutate the session record directly.
        const stack: readonly DOMPreprocessFn[] =
          options && options.preprocess
            ? [...configPreprocess, ...options.preprocess]
            : configPreprocess;
        $runPreprocessStack(stack, dom, preprocessCtx);
        return $withFullContext(
          DOMImportContextSymbol,
          sessionRecord,
          () => $runImport(dispatch, editor, dom, session),
          editor,
        );
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
    return shallowMergeConfig(config, {
      ...partial,
      ...(partial.contextDefaults && {
        contextDefaults: [
          ...config.contextDefaults,
          ...partial.contextDefaults,
        ],
      }),
      ...(partial.preprocess && {
        preprocess: [...config.preprocess, ...partial.preprocess],
      }),
      ...(partial.rules && {
        rules: [...partial.rules, ...config.rules],
      }),
    });
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
  dom: Document | ParentNode,
  options?: GenerateNodesFromDOMOptions,
): LexicalNode[] {
  return $getExtensionOutput(DOMImportExtension).$generateNodesFromDOM(
    dom,
    options,
  );
}
