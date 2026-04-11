/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export {
  type CodePrismConfig,
  CodePrismExtension,
  PrismTokenizer,
  registerCodeHighlighting,
  type Tokenizer,
} from './CodeHighlighterPrism';
export {
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CODE_LANGUAGE_MAP,
  getCodeLanguageOptions,
  getCodeLanguages,
  getCodeThemeOptions,
  getLanguageFriendlyName,
  isCodeLanguageLoaded,
  loadCodeLanguage,
  normalizeCodeLanguage,
} from './FacadePrism';
