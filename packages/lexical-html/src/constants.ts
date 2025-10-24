/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export const DOMRenderExtensionName = '@lexical/html/DOM';
export const DOMImportExtensionName = '@lexical/html/DOMImport';
export const IGNORE_TAGS = new Set(['STYLE', 'SCRIPT']);
export const DOMImportNextSymbol = Symbol.for('@lexical/html/DOMImportNext');
export const DOMImportContextSymbol = Symbol.for(
  '@lexical/html/DOMImportContext',
);
export const DOMRenderContextSymbol = Symbol.for(
  '@lexical/html/DOMExportContext',
);

// https://drafts.csswg.org/css-text-4/#white-space-collapsing
export const DOMWhiteSpaceCollapseKeys = {
  'break-spaces': 'break-spaces',
  collapse: 'collapse',
  discard: 'discard',
  preserve: 'preserve',
  'preserve-breaks': 'preserve-breaks',
  'preserve-spaces': 'preserve-spaces',
} as const;

export const DOMTextWrapModeKeys = {
  nowrap: 'nowrap',
  wrap: 'wrap',
} as const;

export const EMPTY_ARRAY = [] as const;

export const ALWAYS_TRUE = () => true as const;
