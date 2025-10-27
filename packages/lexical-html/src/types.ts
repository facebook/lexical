/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMImportContextSymbol,
  DOMRenderContextSymbol,
  DOMTextWrapModeKeys,
  DOMWhiteSpaceCollapseKeys,
} from './constants';
import type {
  BaseSelection,
  DOMExportOutput,
  ElementDOMSlot,
  Klass,
  LexicalEditor,
  LexicalNode,
  StateConfig,
} from 'lexical';

export type AnyContextSymbol =
  | typeof DOMImportContextSymbol
  | typeof DOMRenderContextSymbol;

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

export type ImportStateConfig<V> = ContextConfig<
  typeof DOMImportContextSymbol,
  V
>;

export type RenderStateConfig<V> = ContextConfig<
  typeof DOMRenderContextSymbol,
  V
>;

export type AnyImportStateConfigPairOrUpdater = AnyContextConfigPairOrUpdater<
  typeof DOMImportContextSymbol
>;
export type AnyRenderStateConfigPairOrUpdater = AnyContextConfigPairOrUpdater<
  typeof DOMRenderContextSymbol
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRenderStateConfig = RenderStateConfig<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyImportStateConfig = ImportStateConfig<any>;

export interface DOMImportOutput {
  node: null | LexicalNode | LexicalNode[];
  childNodes?: NodeListOf<ChildNode> | readonly ChildNode[];
  $appendChild?: (node: LexicalNode, dom: ChildNode) => void;
}

export type DOMImportFunction<T extends Node> = (
  node: T,
  $next: () => null | undefined | DOMImportOutput,
  editor: LexicalEditor,
) => null | undefined | DOMImportOutput;

export interface NodeNameMap extends HTMLElementTagNameMap {
  '*': Node;
  '#text': Text;
  '#document': Document;
  '#comment': Comment;
  '#cdata-section': CDATASection;
}

export type NodeNameToType<T extends string> = T extends keyof NodeNameMap
  ? NodeNameMap[T]
  : Node;

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

/** @internal @experimental */
export interface DOMImportConfig {
  overrides: DOMImportConfigMatch[];
  compileLegacyImportNode: (
    editor: LexicalEditor,
  ) => DOMImportExtensionOutput['$importNode'];
}
export interface DOMImportConfigMatch {
  readonly tag: '*' | '#text' | '#cdata-section' | '#comment' | (string & {});
  readonly selector?: string;
  readonly priority?: 0 | 1 | 2 | 3 | 4;
  readonly $import: DOMImportFunction<Node>;
}

export interface DOMImportExtensionOutput {
  $importNode: (node: Node) => null | undefined | DOMImportOutput;
  $importNodes: (root: ParentNode | Document) => LexicalNode[];
}

export type DOMWhiteSpaceCollapse = keyof typeof DOMWhiteSpaceCollapseKeys;
export type DOMTextWrapMode = keyof typeof DOMTextWrapModeKeys;

export type DOMImportContextFinalizer = (
  node: null | LexicalNode | LexicalNode[],
) => null | LexicalNode | LexicalNode[];
