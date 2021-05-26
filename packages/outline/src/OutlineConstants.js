/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// Nodes
export const IS_IMMUTABLE = 1;
export const IS_SEGMENTED = 1 << 1;
export const IS_INERT = 1 << 2;
export const IS_DIRECTIONLESS = 1 << 3;

// Text nodes
export const IS_BOLD = 1 << 4;
export const IS_ITALIC = 1 << 5;
export const IS_STRIKETHROUGH = 1 << 6;
export const IS_UNDERLINE = 1 << 7;
export const IS_CODE = 1 << 8;
export const IS_LINK = 1 << 9;
export const IS_HASHTAG = 1 << 10;
export const IS_OVERFLOWED = 1 << 11;

// Block nodes
export const IS_LTR = 1 << 12;
export const IS_RTL = 1 << 13;

// Reconciliation

export const BYTE_ORDER_MARK = '\uFEFF';

const RTL = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const LTR =
  'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' +
  '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' +
  '\uFE00-\uFE6F\uFEFD-\uFFFF';

export const RTL_REGEX: RegExp = new RegExp('^[^' + LTR + ']*[' + RTL + ']');
export const LTR_REGEX: RegExp = new RegExp('^[^' + RTL + ']*[' + LTR + ']');
