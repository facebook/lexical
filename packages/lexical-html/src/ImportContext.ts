/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMTextWrapMode,
  DOMWhiteSpaceCollapse,
  ImportStateConfig,
} from './types';

import {
  $getEditor,
  type ArtificialNode__DO_NOT_USE,
  type DOMChildConversion,
  ElementFormatType,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {DOMImportContextSymbol} from './constants';
import {
  createContextState,
  getContextRecord,
  getContextValue,
  setContextValue,
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

export function $setImportContextValue<V>(
  cfg: ImportStateConfig<V>,
  value: V,
  editor: LexicalEditor = $getEditor(),
): V {
  const ctx = getContextRecord(DOMImportContextSymbol, editor);
  invariant(
    ctx !== undefined,
    '$setImportContextValue used outside of DOM import',
  );
  return setContextValue(ctx, cfg, value);
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
