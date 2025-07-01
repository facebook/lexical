/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerCodeHighlighting as registerCodePrismHighlighting} from './CodeHighlighterPrism';
import {
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
} from './FlatStructureUtils';

export {
  PrismTokenizer,
  registerCodeHighlighting as registerCodePrismHighlighting,
} from './CodeHighlighterPrism';
export {registerCodeHighlighting as registerCodeShikiHighlighting} from './CodeHighlighterShiki';
export {
  //getCodeLanguageOptions,
  //getCodeThemeOptions,
  registerCodeHighlighting as registerCodeHighlightingShiki,
} from './CodeHighlighterShiki';
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
  getCodeLanguages,
  getCodeLanguageOptions as getCodePrismLanguageOptions,
  getCodeThemeOptions as getCodePrismThemeOptions,
  getLanguageFriendlyName,
  normalizeCodeLang,
  normalizeCodeLang as normalizeCodePrismLanguage,
} from './FacadePrism';
export {
  getCodeLanguageOptions as getCodeShikiLanguageOptions,
  getCodeThemeOptions as getCodeShikiThemeOptions,
  isCodeLanguageLoaded,
  loadCodeLanguage,
  loadCodeTheme,
  normalizeCodeLanguage as normalizeCodeShikiLanguage,
} from './FacadeShiki';
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
/** @deprecated renamed to {@link registerCodePrismHighlighting} by @lexical/eslint-plugin rules-of-lexical */
export const registerCodeHighlighting = registerCodePrismHighlighting;
