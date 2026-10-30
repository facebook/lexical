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

// CommonMark counts every character in the Unicode P (punctuation) and S
// (symbol) general categories as punctuation, which includes all of the ASCII
// punctuation characters. Its Unicode whitespace is Zs plus tab, line feed,
// form feed and carriage return; JavaScript's `\s` adds others, such as
// U+FEFF. Delimiter flanking depends on both.
// https://spec.commonmark.org/0.31.2/#unicode-punctuation-character
// https://spec.commonmark.org/0.31.2/#unicode-whitespace-character
export const PUNCTUATION = /[\p{P}\p{S}]/u;
export const WHITESPACE = /[\p{Zs}\t\n\f\r]/u;
export const PUNCTUATION_OR_SPACE = /[\p{P}\p{S}\p{Zs}\t\n\f\r]/u;

/**
 * Whether a delimiter run with `primary` on the side it faces (after it for
 * left-flanking, before it for right-flanking) and `secondary` on the other
 * side is flanking. `undefined` is the edge of the line.
 * https://spec.commonmark.org/0.31.2/#left-flanking-delimiter-run
 */
export function isFlankedBy(
  primary: string | undefined,
  secondary: string | undefined,
): boolean {
  if (primary === undefined || WHITESPACE.test(primary)) {
    return false;
  }
  return (
    !PUNCTUATION.test(primary) ||
    secondary === undefined ||
    WHITESPACE.test(secondary) ||
    PUNCTUATION.test(secondary)
  );
}

/** The character (code point) that starts at `index`, if any. */
export function characterAt(text: string, index: number): string | undefined {
  const codePoint = text.codePointAt(index);
  return codePoint === undefined ? undefined : String.fromCodePoint(codePoint);
}

/** The character (code point) that ends just before `index`, if any. */
export function characterBefore(
  text: string,
  index: number,
): string | undefined {
  const codePoint = index >= 2 ? text.codePointAt(index - 2) : undefined;
  return codePoint !== undefined && codePoint > 0xffff
    ? String.fromCodePoint(codePoint)
    : text[index - 1];
}

export function toCharacterReference(character: string): string {
  return `&#${character.codePointAt(0)};`;
}

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

// Numeric references have one to seven decimal or one to six hexadecimal digits.
// A reference that names
// U+0000, a surrogate or a number past U+10FFFF reads as U+FFFD instead of
// making `String.fromCodePoint` throw.
// https://spec.commonmark.org/0.31.2/#decimal-numeric-character
function decodeCharacterReference(
  digits: string | undefined,
  hex: string | undefined,
): string {
  const codePoint = digits !== undefined ? Number(digits) : parseInt(hex!, 16);
  return codePoint === 0 ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
    codePoint > 0x10ffff
    ? '\uFFFD'
    : String.fromCodePoint(codePoint);
}

export function unescapeText(value: string): string {
  // Do not decode an escaped ampersand or revisit a decoded reference.
  return value.replace(
    /\\([!-/:-@[-`{-~])|&#(?:(\d{1,7})|[xX]([\da-fA-F]{1,6}));/g,
    (
      _match,
      escaped: string | undefined,
      digits: string | undefined,
      hex: string | undefined,
    ) => escaped ?? decodeCharacterReference(digits, hex),
  );
}

export function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    backslashes++;
  }
  return backslashes % 2 === 1;
}
