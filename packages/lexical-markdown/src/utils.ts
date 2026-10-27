/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementTransformer,
  MultilineElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
} from './MarkdownTransformers';

import {$isParagraphNode, $isTextNode, type LexicalNode} from 'lexical';

export function indexBy<T>(
  list: T[],
  callback: (arg0: T) => string | undefined,
): Readonly<Record<string, T[]>> {
  const index: Record<string, T[]> = {};

  for (const item of list) {
    const key = callback(item);

    if (!key) {
      continue;
    }

    if (index[key]) {
      index[key].push(item);
    } else {
      index[key] = [item];
    }
  }

  return index;
}

export function transformersByType(transformers: Transformer[]): Readonly<{
  element: ElementTransformer[];
  multilineElement: MultilineElementTransformer[];
  textFormat: TextFormatTransformer[];
  textMatch: TextMatchTransformer[];
}> {
  const byType = indexBy(transformers, t => t.type);

  return {
    element: (byType.element || []) as ElementTransformer[],
    multilineElement: (byType['multiline-element'] ||
      []) as MultilineElementTransformer[],
    textFormat: (byType['text-format'] || []) as TextFormatTransformer[],
    textMatch: (byType['text-match'] || []) as TextMatchTransformer[],
  };
}

export const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/;
export const WHITESPACE = /\s/;
export const PUNCTUATION = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/;

const MARKDOWN_EMPTY_LINE_REG_EXP = /^\s{0,3}$/;

export function isEmptyParagraph(node: LexicalNode): boolean {
  if (!$isParagraphNode(node)) {
    return false;
  }

  const firstChild = node.getFirstChild();
  return (
    firstChild == null ||
    (node.getChildrenSize() === 1 &&
      $isTextNode(firstChild) &&
      MARKDOWN_EMPTY_LINE_REG_EXP.test(firstChild.getTextContent()))
  );
}

// A numeric character reference naming U+0000, a surrogate or a number past
// U+10FFFF reads as U+FFFD instead of making `String.fromCodePoint` throw.
// https://spec.commonmark.org/0.31.2/#entity-and-numeric-character-references
function decodeCharacterReferenceCodePoint(codePoint: number): string {
  return codePoint === 0 ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
    codePoint > 0x10ffff
    ? '\uFFFD'
    : String.fromCodePoint(codePoint);
}

function unescapeTextMatch(
  _: string,
  escaped: string | undefined,
  decimalDigits: string | undefined,
  hexDigits: string | undefined,
): string {
  if (escaped !== undefined) {
    return escaped;
  }
  const codePoint =
    decimalDigits !== undefined
      ? Number(decimalDigits)
      : Number.parseInt(hexDigits ?? '', 16);
  return decodeCharacterReferenceCodePoint(codePoint);
}

export function unescapeText(value: string): string {
  return value.replace(
    /\\([!-/:-@[-`{-~])|&#(\d{1,7});|&#[Xx]([\dA-Fa-f]{1,6});/g,
    unescapeTextMatch,
  );
}
