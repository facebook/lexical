/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TextFormatType, TextModeType} from './nodes/base/LexicalTextNode';
import type {ElementFormatType} from './nodes/base/LexicalElementNode';

export const VERSION = '0.1.0';

// Reconciling
export const NO_DIRTY_NODES = 0;
export const HAS_DIRTY_NODES = 1;
export const FULL_RECONCILE = 2;

// Text node modes
export const IS_NORMAL = 0;
export const IS_TOKEN = 1;
export const IS_SEGMENTED = 2;
export const IS_INERT = 3;

// Text node formatting
export const IS_BOLD = 1;
export const IS_ITALIC = 1 << 1;
export const IS_STRIKETHROUGH = 1 << 2;
export const IS_UNDERLINE = 1 << 3;
export const IS_CODE = 1 << 4;
export const IS_SUBSCRIPT = 1 << 5;
export const IS_SUPERSCRIPT = 1 << 6;

// Text node details
export const IS_DIRECTIONLESS = 1;
export const IS_UNMERGEABLE = 1 << 1;

// Element node formatting
export const IS_ALIGN_LEFT = 1;
export const IS_ALIGN_CENTER = 2;
export const IS_ALIGN_RIGHT = 3;
export const IS_ALIGN_JUSTIFY = 4;

// Reconciliation
export const NO_BREAK_SPACE_CHAR = '\u00A0';

const RTL = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const LTR =
  'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' +
  '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' +
  '\uFE00-\uFE6F\uFEFD-\uFFFF';

export const RTL_REGEX: RegExp = new RegExp('^[^' + LTR + ']*[' + RTL + ']');
export const LTR_REGEX: RegExp = new RegExp('^[^' + RTL + ']*[' + LTR + ']');

export const TEXT_TYPE_TO_FORMAT: {[TextFormatType]: number} = {
  bold: IS_BOLD,
  underline: IS_UNDERLINE,
  strikethrough: IS_STRIKETHROUGH,
  italic: IS_ITALIC,
  code: IS_CODE,
  subscript: IS_SUBSCRIPT,
  superscript: IS_SUPERSCRIPT,
};

export const ELEMENT_TYPE_TO_FORMAT: {[ElementFormatType]: number} = {
  left: IS_ALIGN_LEFT,
  right: IS_ALIGN_RIGHT,
  center: IS_ALIGN_CENTER,
  justify: IS_ALIGN_JUSTIFY,
};

export const TEXT_MODE_TO_TYPE: {[TextModeType]: 0 | 1 | 2 | 3} = {
  normal: IS_NORMAL,
  token: IS_TOKEN,
  segmented: IS_SEGMENTED,
  inert: IS_INERT,
};
