/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AnyContextConfigPair,
  DOMTextWrapMode,
  DOMWhiteSpaceCollapse,
  ImportStateConfig,
} from './types';

import {
  $getEditor,
  type ArtificialNode__DO_NOT_USE,
  type DOMChildConversion,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
} from 'lexical';

import {DOMImportContextSymbol} from './constants';
import {
  $withContext,
  createContextStateFactory,
  getEditorContext,
  getEditorContextValue,
} from './ContextRecord';

/**
 * @__NO_SIDE_EFFECTS__
 */
export const createImportState: <V>(
  name: string,
  getDefaultValue: () => V,
  isEqual?: (a: V, b: V) => boolean,
) => ImportStateConfig<V> = /*@__PURE__*/ createContextStateFactory(
  DOMImportContextSymbol,
);

export const $withImportContext: (
  cfg: readonly AnyContextConfigPair<typeof DOMImportContextSymbol>[],
  editor?: LexicalEditor,
) => <T>(f: () => T) => T = /*@__PURE__*/ $withContext(DOMImportContextSymbol);

export function $getImportContextValue<V>(
  cfg: ImportStateConfig<V>,
  editor: LexicalEditor = $getEditor(),
): V {
  return getEditorContextValue(
    DOMImportContextSymbol,
    getEditorContext(editor),
    cfg,
  );
}

export const ImportContextDOMNode = createImportState(
  'domNode',
  (): null | Node => null,
);

export const ImportContextTextFormats = createImportState(
  'textFormats',
  (): null | {[K in TextFormatType]?: undefined | boolean} => null,
);

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
