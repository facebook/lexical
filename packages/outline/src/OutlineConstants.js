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
export const HAS_DIRECTION = 1 << 2;

// Text nodes
export const IS_BOLD = 1 << 3;
export const IS_ITALIC = 1 << 4;
export const IS_STRIKETHROUGH = 1 << 5;
export const IS_UNDERLINE = 1 << 6;
export const IS_CODE = 1 << 7;
export const IS_LINK = 1 << 8;
export const IS_HASHTAG = 1 << 9;

// Formatting
export const FORMAT_BOLD = 0;
export const FORMAT_ITALIC = 1;
export const FORMAT_STRIKETHROUGH = 2;
export const FORMAT_UNDERLINE = 3;
export const FORMAT_CODE = 4;
export const FORMAT_LINK = 5;
export const FORMAT_HASHTAG = 6;
