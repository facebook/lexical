/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * The placeholder an `htmlBlock`'s raw HTML holds for its `index`th
 * Markdown child.
 */
export function htmlBlockPlaceholder(index: number): string {
  return `<template data-mdast-child="${index}"></template>`;
}

const PLACEHOLDER_SPLIT_RE = /<template data-mdast-child="(\d+)"><\/template>/;

/**
 * An `htmlBlock`'s value split at its placeholders: the even entries are
 * raw HTML, and the odd ones the indices of the children they stand for.
 */
export function splitHtmlBlock(value: string): string[] {
  return value.split(PLACEHOLDER_SPLIT_RE);
}
