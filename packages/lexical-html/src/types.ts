/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMRenderContextSymbol} from './constants';
import type {
  BaseSelection,
  DOMExportOutput,
  ElementDOMSlot,
  Klass,
  LexicalEditor,
  LexicalNode,
  StateConfig,
} from 'lexical';

/** @experimental */
export type AnyContextSymbol = typeof DOMRenderContextSymbol;

/** @experimental */
export type ContextRecord<_K extends symbol> = Record<string | symbol, unknown>;

/** @experimental */
export type ContextConfig<Sym extends symbol, V> = StateConfig<symbol, V> & {
  readonly [K in Sym]?: true;
};

/** @experimental */
export type ContextConfigUpdater<Ctx extends AnyContextSymbol, V> = {
  readonly cfg: ContextConfig<Ctx, V>;
  readonly updater: (prev: V) => V;
};
/** @experimental */
export type ContextConfigPair<Ctx extends AnyContextSymbol, V> = readonly [
  ContextConfig<Ctx, V>,
  V,
];

/** @experimental */
export type ContextPairOrUpdater<Ctx extends AnyContextSymbol, V> =
  | ContextConfigPair<Ctx, V>
  | ContextConfigUpdater<Ctx, V>;

/** @experimental */
export type AnyContextConfigPairOrUpdater<Ctx extends AnyContextSymbol> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContextPairOrUpdater<Ctx, any>;

/** @experimental */
export interface DOMRenderExtensionOutput {
  defaults: undefined | ContextRecord<typeof DOMRenderContextSymbol>;
}

/** @experimental */
export type RenderStateConfig<V> = ContextConfig<
  typeof DOMRenderContextSymbol,
  V
>;

/** @experimental */
export type AnyRenderStateConfigPairOrUpdater = AnyContextConfigPairOrUpdater<
  typeof DOMRenderContextSymbol
>;

/** @experimental */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRenderStateConfig = RenderStateConfig<any>;

/** @internal @experimental */
export interface DOMRenderConfig {
  overrides: AnyDOMRenderMatch[];
  contextDefaults: AnyRenderStateConfigPairOrUpdater[];
}

/** @internal @experimental */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDOMRenderMatch = DOMRenderMatch<any>;

/** @experimental */
export type NodeMatch<T extends LexicalNode> =
  | Klass<T>
  | ((node: LexicalNode) => node is T);

/** @internal @experimental */
export interface DOMRenderMatch<T extends LexicalNode> {
  readonly nodes: '*' | readonly NodeMatch<T>[];
  $getDOMSlot?: <N extends LexicalNode>(
    node: N,
    dom: HTMLElement,
    $next: () => ElementDOMSlot<HTMLElement>,
    editor: LexicalEditor,
  ) => ElementDOMSlot<HTMLElement>;
  $createDOM?: (
    node: T,
    $next: () => HTMLElement,
    editor: LexicalEditor,
  ) => HTMLElement;
  $updateDOM?: (
    nextNode: T,
    prevNode: T,
    dom: HTMLElement,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $exportDOM?: (
    node: T,
    $next: () => DOMExportOutput,
    editor: LexicalEditor,
  ) => DOMExportOutput;
  $shouldExclude?: (
    node: T,
    selection: null | BaseSelection,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $shouldInclude?: (
    node: T,
    selection: null | BaseSelection,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $extractWithChild?: (
    node: T,
    childNode: LexicalNode,
    selection: null | BaseSelection,
    destination: 'clone' | 'html',
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
}
