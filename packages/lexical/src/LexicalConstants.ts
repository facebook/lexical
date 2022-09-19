/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementFormatType} from './nodes/LexicalElementNode';
import type {TextDetailType, TextModeType} from './nodes/LexicalTextNode';

import {IS_FIREFOX, IS_IOS, IS_SAFARI} from 'shared/environment';

// DOM
export const DOM_ELEMENT_TYPE = 1;
export const DOM_TEXT_TYPE = 3;

// Reconciling
export const NO_DIRTY_NODES = 0;
export const HAS_DIRTY_NODES = 1;
export const FULL_RECONCILE = 2;

// Text node modes
export const IS_NORMAL = 0;
export const IS_TOKEN = 1;
export const IS_SEGMENTED = 2;
// IS_INERT = 3

// Text node formatting
export type TEXT_FORMAT_BOLD_TYPE = 1; // 1 << 0
export type TEXT_FORMAT_ITALIC_TYPE = 2; // 1 << 1
export type TEXT_FORMAT_STRIKETHROUGH_TYPE = 4; // 1 << 2
export type TEXT_FORMAT_UNDERLINE_TYPE = 8; // 1 << 3
export type TEXT_FORMAT_CODE_TYPE = 16; // 1 << 4
export type TEXT_FORMAT_SUBSCRIPT_TYPE = 32; // 1 << 5
export type TEXT_FORMAT_SUPERSCRIPT_TYPE = 64; // 1 << 6
export type TEXT_FORMAT_TYPE =
  | 0
  | TEXT_FORMAT_BOLD_TYPE
  | TEXT_FORMAT_ITALIC_TYPE
  | TEXT_FORMAT_STRIKETHROUGH_TYPE
  | TEXT_FORMAT_UNDERLINE_TYPE
  | TEXT_FORMAT_CODE_TYPE
  | TEXT_FORMAT_SUBSCRIPT_TYPE
  | TEXT_FORMAT_SUPERSCRIPT_TYPE;

export const TEXT_FORMAT_BOLD: TEXT_FORMAT_BOLD_TYPE = 1;
export const TEXT_FORMAT_ITALIC: TEXT_FORMAT_ITALIC_TYPE = 2;
export const TEXT_FORMAT_STRIKETHROUGH: TEXT_FORMAT_STRIKETHROUGH_TYPE = 4;
export const TEXT_FORMAT_UNDERLINE: TEXT_FORMAT_UNDERLINE_TYPE = 8;
export const TEXT_FORMAT_CODE: TEXT_FORMAT_CODE_TYPE = 16;
export const TEXT_FORMAT_SUBSCRIPT: TEXT_FORMAT_SUBSCRIPT_TYPE = 32;
export const TEXT_FORMAT_SUPERSCRIPT: TEXT_FORMAT_SUPERSCRIPT_TYPE = 64;

export const TEXT_FORMAT_ALL =
  TEXT_FORMAT_BOLD |
  TEXT_FORMAT_ITALIC |
  TEXT_FORMAT_STRIKETHROUGH |
  TEXT_FORMAT_UNDERLINE |
  TEXT_FORMAT_CODE |
  TEXT_FORMAT_SUBSCRIPT |
  TEXT_FORMAT_SUPERSCRIPT;

// Text node details
export const IS_DIRECTIONLESS = 1;
export const IS_UNMERGEABLE = 1 << 1;

// Element node formatting
export const IS_ALIGN_LEFT = 1;
export const IS_ALIGN_CENTER = 2;
export const IS_ALIGN_RIGHT = 3;
export const IS_ALIGN_JUSTIFY = 4;

// Reconciliation
export const NON_BREAKING_SPACE = '\u00A0';
const ZERO_WIDTH_SPACE = '\u200b';

// For iOS/Safari we use a non breaking space, otherwise the cursor appears
// overlapping the composed text.
export const COMPOSITION_SUFFIX: string =
  IS_SAFARI || IS_IOS ? NON_BREAKING_SPACE : ZERO_WIDTH_SPACE;
export const DOUBLE_LINE_BREAK = '\n\n';

// For FF, we need to use a non-breaking space, or it gets composition
// in a stuck state.
export const COMPOSITION_START_CHAR: string = IS_FIREFOX
  ? NON_BREAKING_SPACE
  : COMPOSITION_SUFFIX;
const RTL = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const LTR =
  'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' +
  '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' +
  '\uFE00-\uFE6F\uFEFD-\uFFFF';

// eslint-disable-next-line no-misleading-character-class
export const RTL_REGEX = new RegExp('^[^' + LTR + ']*[' + RTL + ']');
// eslint-disable-next-line no-misleading-character-class
export const LTR_REGEX = new RegExp('^[^' + RTL + ']*[' + LTR + ']');

export const TEXT_TYPE_TO_FORMAT: Record<string, TEXT_FORMAT_TYPE> = {
  bold: TEXT_FORMAT_BOLD,
  code: TEXT_FORMAT_CODE,
  italic: TEXT_FORMAT_ITALIC,
  strikethrough: TEXT_FORMAT_STRIKETHROUGH,
  subscript: TEXT_FORMAT_SUBSCRIPT,
  superscript: TEXT_FORMAT_SUPERSCRIPT,
  underline: TEXT_FORMAT_UNDERLINE,
};

export const DETAIL_TYPE_TO_DETAIL: Record<TextDetailType | string, number> = {
  directionless: IS_DIRECTIONLESS,
  unmergeable: IS_UNMERGEABLE,
};

export const ELEMENT_TYPE_TO_FORMAT: Record<
  Exclude<ElementFormatType, ''>,
  number
> = {
  center: IS_ALIGN_CENTER,
  justify: IS_ALIGN_JUSTIFY,
  left: IS_ALIGN_LEFT,
  right: IS_ALIGN_RIGHT,
};

export const ELEMENT_FORMAT_TO_TYPE: Record<number, ElementFormatType> = {
  [IS_ALIGN_CENTER]: 'center',
  [IS_ALIGN_JUSTIFY]: 'justify',
  [IS_ALIGN_LEFT]: 'left',
  [IS_ALIGN_RIGHT]: 'right',
};

export const TEXT_MODE_TO_TYPE: Record<TextModeType, 0 | 1 | 2> = {
  normal: IS_NORMAL,
  segmented: IS_SEGMENTED,
  token: IS_TOKEN,
};

export const TEXT_TYPE_TO_MODE: Record<number, TextModeType> = {
  [IS_NORMAL]: 'normal',
  [IS_SEGMENTED]: 'segmented',
  [IS_TOKEN]: 'token',
};
