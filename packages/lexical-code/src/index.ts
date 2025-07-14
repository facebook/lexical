/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
} from './FlatStructureUtils';

export {PrismTokenizer, registerCodeHighlighting} from './CodeHighlighterPrism';
export {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  CodeHighlightNode,
} from './CodeHighlightNode';
export type {SerializedCodeNode} from './CodeNode';
export {
  $createCodeNode,
  $isCodeNode,
  CodeNode,
  DEFAULT_CODE_LANGUAGE,
  getDefaultCodeLanguage,
} from './CodeNode';
export {
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CODE_LANGUAGE_MAP,
  getCodeLanguageOptions,
  getCodeLanguages,
  getCodeThemeOptions,
  getLanguageFriendlyName,
  normalizeCodeLang,
  normalizeCodeLang as normalizeCodeLanguage,
} from './FacadePrism';
export {
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
} from './FlatStructureUtils';

/** @deprecated renamed to {@link $getFirstCodeNodeOfLine} by @lexical/eslint-plugin rules-of-lexical */
export const getFirstCodeNodeOfLine = $getFirstCodeNodeOfLine;
/** @deprecated renamed to {@link $getLastCodeNodeOfLine} by @lexical/eslint-plugin rules-of-lexical */
export const getLastCodeNodeOfLine = $getLastCodeNodeOfLine;
/** @deprecated renamed to {@link $getEndOfCodeInLine} by @lexical/eslint-plugin rules-of-lexical */
export const getEndOfCodeInLine = $getEndOfCodeInLine;
/** @deprecated renamed to {@link $getStartOfCodeInLine} by @lexical/eslint-plugin rules-of-lexical */
export const getStartOfCodeInLine = $getStartOfCodeInLine;
