/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as LexicalCodePrism from '@lexical/code-prism';

export type {SerializedCodeNode} from '@lexical/code-core';
export {
  $createCodeHighlightNode,
  $createCodeNode,
  $getCodeLineDirection,
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
  $isCodeHighlightNode,
  $isCodeNode,
  $outdentLeadingSpaces,
  CodeExtension,
  CodeHighlightNode,
  type CodeIndentConfig,
  CodeIndentExtension,
  CodeNode,
  DEFAULT_CODE_LANGUAGE,
  getDefaultCodeLanguage,
} from '@lexical/code-core';

/** @deprecated moved to `@lexical/code-prism` */
export const CODE_LANGUAGE_FRIENDLY_NAME_MAP =
  LexicalCodePrism.CODE_LANGUAGE_FRIENDLY_NAME_MAP;
/** @deprecated moved to `@lexical/code-prism` */
export const CODE_LANGUAGE_MAP = LexicalCodePrism.CODE_LANGUAGE_MAP;
/** @deprecated moved to `@lexical/code-prism` */
export const getCodeLanguageOptions = LexicalCodePrism.getCodeLanguageOptions;
/** @deprecated moved to `@lexical/code-prism` */
export const getCodeLanguages = LexicalCodePrism.getCodeLanguages;
/** @deprecated moved to `@lexical/code-prism` */
export const getCodeThemeOptions = LexicalCodePrism.getCodeThemeOptions;
/** @deprecated moved to `@lexical/code-prism` */
export const getLanguageFriendlyName = LexicalCodePrism.getLanguageFriendlyName;
/** @deprecated renamed to `normalizeCodeLanguage` and moved to `@lexical/code-prism` */
export const normalizeCodeLang = LexicalCodePrism.normalizeCodeLanguage;
/** @deprecated moved to `@lexical/code-prism` */
export const normalizeCodeLanguage = LexicalCodePrism.normalizeCodeLanguage;
/** @deprecated moved to `@lexical/code-prism` */
export const PrismTokenizer = LexicalCodePrism.PrismTokenizer;
/** @deprecated moved to `@lexical/code-prism` */
export const registerCodeHighlighting =
  LexicalCodePrism.registerCodeHighlighting;
