/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AnyImportStateConfigPairOrUpdater,
  ContextPairOrUpdater,
  ContextRecord,
  DOMImportContextFinalizer,
  DOMTextWrapMode,
  DOMWhiteSpaceCollapse,
  ImportStateConfig,
} from './types';

import {
  $getEditor,
  type ArtificialNode__DO_NOT_USE,
  type DOMChildConversion,
  type ElementFormatType,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
  type TextNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {DOMImportContextSymbol} from './constants';
import {
  createContextState,
  getContextRecord,
  getContextValue,
  getOwnContextValue,
  setContextValue,
  updateContextValue,
} from './ContextRecord';

/**
 * Create a context state to be used during import.
 *
 * Note that to support the ValueOrUpdater pattern you can not use a
 * function for V (but you may wrap it in an array or object).
 *
 * @__NO_SIDE_EFFECTS__
 */
export function createImportState<V>(
  name: string,
  getDefaultValue: () => V,
  isEqual?: (a: V, b: V) => boolean,
): ImportStateConfig<V> {
  return createContextState(
    DOMImportContextSymbol,
    name,
    getDefaultValue,
    isEqual,
  );
}

export function $getImportContextValue<V>(
  cfg: ImportStateConfig<V>,
  editor: LexicalEditor = $getEditor(),
): V {
  return getContextValue(getContextRecord(DOMImportContextSymbol, editor), cfg);
}

function getImportContextOrThrow(
  editor: LexicalEditor,
): ContextRecord<typeof DOMImportContextSymbol> {
  const ctx = getContextRecord(DOMImportContextSymbol, editor);
  invariant(
    ctx !== undefined,
    'getImportContextOrThrow: Import context used outside of DOM import',
  );
  return ctx;
}

export function $setImportContextValue<V>(
  cfg: ImportStateConfig<V>,
  value: V,
  editor: LexicalEditor = $getEditor(),
): V {
  return setContextValue(getImportContextOrThrow(editor), cfg, value);
}

export function $updateImportContextValue<V>(
  cfg: ImportStateConfig<V>,
  updater: (prev: V) => V,
  editor: LexicalEditor = $getEditor(),
): V {
  return updateContextValue(getImportContextOrThrow(editor), cfg, updater);
}

export const ImportContextDOMNode = createImportState(
  'domNode',
  (): null | Node => null,
);

const NO_FORMATS: {readonly [K in TextFormatType]?: undefined | boolean} =
  Object.create(null);

export const ImportContextTextAlign = createImportState(
  'textAlign',
  (): undefined | ElementFormatType => undefined,
);

export function $applyTextAlignToElement<T extends ElementNode>(node: T): T {
  const align = $getImportContextValue(ImportContextTextAlign);
  return align ? node.setFormat(align) : node;
}

export const ImportContextTextFormats = createImportState(
  'textFormats',
  () => NO_FORMATS,
);

export function $applyTextFormatsFromContext<T extends TextNode>(node: T): T {
  const fmt = $getImportContextValue(ImportContextTextFormats);
  for (const k in fmt) {
    const textFormat = k as keyof typeof fmt;
    if (fmt[textFormat]) {
      node = node.toggleFormat(textFormat);
    }
  }
  return node;
}

export const ImportChildContext = createImportState(
  'childContext',
  (): undefined | AnyImportStateConfigPairOrUpdater[] => undefined,
);

export function $addImportChildContext<V>(
  pairOrUpdater: ContextPairOrUpdater<typeof DOMImportContextSymbol, V>,
  editor: LexicalEditor = $getEditor(),
): void {
  const ctx = getImportContextOrThrow(editor);
  const childPairs = getOwnContextValue(ctx, ImportChildContext) || [];
  childPairs.push(pairOrUpdater);
  setContextValue(ctx, ImportChildContext, childPairs);
}

export const ImportContextFinalizers = createImportState(
  'finalizers',
  (): undefined | DOMImportContextFinalizer[] => undefined,
);

export function $addImportContextFinalizer(
  finalizer: DOMImportContextFinalizer,
  editor: LexicalEditor = $getEditor(),
): void {
  const ctx = getImportContextOrThrow(editor);
  const finalizers = getOwnContextValue(ctx, ImportContextFinalizers) || [];
  finalizers.push(finalizer);
  setContextValue(ctx, ImportContextFinalizers, finalizers);
}

export const ImportContextWhiteSpaceCollapse = createImportState(
  'whiteSpaceCollapse',
  (): DOMWhiteSpaceCollapse => 'collapse',
);

export const ImportContextTextWrapMode = createImportState(
  'textWrapMode',
  (): DOMTextWrapMode => 'wrap',
);

export const ImportContextParentLexicalNode = createImportState(
  'parentLexicalNode',
  (): null | LexicalNode => null,
);
export const ImportContextHasBlockAncestorLexicalNode = createImportState(
  'hasBlockAncestorLexicalNode',
  Boolean,
);

export const ImportContextForChildMap = createImportState(
  'forChildMap',
  (): null | Map<string, DOMChildConversion> => null,
);

export const ImportContextArtificialNodes = createImportState(
  'ArtificialNodes',
  (): null | ArtificialNode__DO_NOT_USE[] => null,
);
