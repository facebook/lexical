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

export type AnyContextSymbol = typeof DOMRenderContextSymbol;

export type ContextRecord<_K extends symbol> = Record<string | symbol, unknown>;

export type ContextConfig<Sym extends symbol, V> = StateConfig<symbol, V> & {
  readonly [K in Sym]?: true;
};

export type ContextConfigUpdater<Ctx extends AnyContextSymbol, V> = {
  readonly cfg: ContextConfig<Ctx, V>;
  readonly updater: (prev: V) => V;
};
export type ContextConfigPair<Ctx extends AnyContextSymbol, V> = readonly [
  ContextConfig<Ctx, V>,
  V,
];

export type ContextPairOrUpdater<Ctx extends AnyContextSymbol, V> =
  | ContextConfigPair<Ctx, V>
  | ContextConfigUpdater<Ctx, V>;

export type AnyContextConfigPairOrUpdater<Ctx extends AnyContextSymbol> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContextPairOrUpdater<Ctx, any>;

export interface DOMRenderExtensionOutput {
  defaults: undefined | ContextRecord<typeof DOMRenderContextSymbol>;
}

export type RenderStateConfig<V> = ContextConfig<
  typeof DOMRenderContextSymbol,
  V
>;

export type AnyRenderStateConfigPairOrUpdater = AnyContextConfigPairOrUpdater<
  typeof DOMRenderContextSymbol
>;

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

