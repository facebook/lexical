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
const PUNCTUATION = /[\p{P}\p{S}]/u;
const WHITESPACE = /[\p{Zs}\t\n\f\r]/u;

const WHITESPACE_CLASS = 0;
const PUNCTUATION_CLASS = 1;
const OTHER_CLASS = 2;

/** How flanking sees `character`; the edge of the line is whitespace. */
function classify(character: string | undefined): number {
  if (character === undefined) {
    return WHITESPACE_CLASS;
  }
  const code = character.charCodeAt(0);
  // ASCII, without a regular expression
  if (code < 0x80) {
    return code === 0x20 || (code >= 0x09 && code <= 0x0d && code !== 0x0b)
      ? WHITESPACE_CLASS
      : (code >= 0x21 && code <= 0x2f) ||
          (code >= 0x3a && code <= 0x40) ||
          (code >= 0x5b && code <= 0x60) ||
          (code >= 0x7b && code <= 0x7e)
        ? PUNCTUATION_CLASS
        : OTHER_CLASS;
  }
  return WHITESPACE.test(character)
    ? WHITESPACE_CLASS
    : PUNCTUATION.test(character)
      ? PUNCTUATION_CLASS
      : OTHER_CLASS;
}

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
  const primaryClass = classify(primary);
  return (
    primaryClass === OTHER_CLASS ||
    (primaryClass === PUNCTUATION_CLASS && classify(secondary) !== OTHER_CLASS)
  );
}

export function isPunctuationOrSpace(character: string): boolean {
  return classify(character) !== OTHER_CLASS;
}

export function isPunctuation(character: string | undefined): boolean {
  return classify(character) === PUNCTUATION_CLASS;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

/** The character (code point) that starts at `index`, if any. */
export function characterAt(text: string, index: number): string | undefined {
  const code = text.codePointAt(index);
  return code === undefined ? undefined : String.fromCodePoint(code);
}

/** The character (code point) that ends just before `index`, if any. */
export function characterBefore(
  text: string,
  index: number,
): string | undefined {
  return isLowSurrogate(text.charCodeAt(index - 1)) &&
    isHighSurrogate(text.charCodeAt(index - 2))
    ? text.slice(index - 2, index)
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
