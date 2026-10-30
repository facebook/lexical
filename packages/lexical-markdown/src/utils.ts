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

// CJK characters for the CJK-friendly amendment to emphasis flanking:
// East Asian Width W, F or H and not emoji, or Hangul (generated ranges), plus
// the ideographic variation selectors, which flank as a CJK character does.
// https://github.com/tats-u/markdown-cjk-friendly/blob/main/specification.md
const CJK =
  // Some ranges start or end at a combining mark, which is not misleading.
  // eslint-disable-next-line no-misleading-character-class
  /[\u1100-\u11ff\u20a9\u2329-\u232a\u2630-\u2637\u268a-\u268f\u2e80-\u2e99\u2e9b-\u2ef3\u2f00-\u2fd5\u2ff0-\u303e\u3041-\u3096\u3099-\u30ff\u3105-\u312f\u3131-\u318e\u3190-\u31e5\u31ef-\u321e\u3220-\u3247\u3250-\ua48c\ua490-\ua4c6\ua960-\ua97c\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe52\ufe54-\ufe66\ufe68-\ufe6b\uff01-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\uffe0-\uffe6\uffe8-\uffee\u{16fe0}-\u{16fe4}\u{16ff0}-\u{16ff6}\u{17000}-\u{18cda}\u{18cff}-\u{18d20}\u{18d80}-\u{18df2}\u{18e00}-\u{19191}\u{191a0}-\u{191d2}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}-\u{1b128}\u{1b132}\u{1b150}-\u{1b152}\u{1b155}\u{1b164}-\u{1b168}\u{1b170}-\u{1b2fb}\u{1d300}-\u{1d356}\u{1d360}-\u{1d376}\u{1f1ae}\u{1f200}\u{1f202}\u{1f210}-\u{1f219}\u{1f21b}-\u{1f22e}\u{1f230}-\u{1f231}\u{1f237}\u{1f23b}\u{1f240}-\u{1f248}\u{1f260}-\u{1f265}\u{1f7da}\u{20000}-\u{3fffd}\u{e0100}-\u{e01ef}]/u;
// Variation selectors other than the emoji one, which join the character
// before them.
const TEXT_VARIATION_SELECTOR = /[\ufe00-\ufe0e]/;

const WHITESPACE_CLASS = 0;
const PUNCTUATION_CLASS = 1;
const OTHER_CLASS = 2;

function classifyByCategory(character: string): number {
  return WHITESPACE.test(character)
    ? WHITESPACE_CLASS
    : PUNCTUATION.test(character)
      ? PUNCTUATION_CLASS
      : OTHER_CLASS;
}

// ASCII classes, filled from the categories on first use so that the common
// case needs no regular expression.
let asciiClasses: Uint8Array | undefined;

/** How flanking sees `character`; the edge of the line is whitespace. */
function classify(character: string | undefined): number {
  if (character === undefined) {
    return WHITESPACE_CLASS;
  }
  const code = character.charCodeAt(0);
  if (code >= 0x80) {
    return classifyByCategory(character);
  }
  if (asciiClasses === undefined) {
    asciiClasses = new Uint8Array(0x80);
    for (let c = 0; c < 0x80; c++) {
      asciiClasses[c] = classifyByCategory(String.fromCharCode(c));
    }
  }
  return asciiClasses[code];
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
  return isFlankedByClass(classify(primary), classify(secondary));
}

function isFlankedByClass(primary: number, secondary: number): boolean {
  return (
    primary === OTHER_CLASS ||
    (primary === PUNCTUATION_CLASS && secondary !== OTHER_CLASS)
  );
}

function isCJK(character: string | undefined): boolean {
  return (
    character !== undefined &&
    character.charCodeAt(0) >= 0x1100 &&
    CJK.test(character)
  );
}

// Under the CJK-friendly amendment, CJK punctuation on the side a run faces
// flanks as a letter does, and a CJK character on its other side lets it
// flank as punctuation there does.
function facingClass(character: string | undefined, isCJKFriendly: boolean) {
  const characterClass = classify(character);
  return isCJKFriendly &&
    characterClass === PUNCTUATION_CLASS &&
    isCJK(character)
    ? OTHER_CLASS
    : characterClass;
}

function awayClass(character: string | undefined, isCJKFriendly: boolean) {
  const characterClass = classify(character);
  return isCJKFriendly && characterClass === OTHER_CLASS && isCJK(character)
    ? PUNCTUATION_CLASS
    : characterClass;
}

/**
 * Whether a delimiter run of `marker` between `before` and `after` can open
 * and close emphasis; `_` opens or closes inside a word only beside
 * punctuation. With `isCJKFriendly`, it follows the CJK-friendly amendment,
 * so that `**你好。**世界` is strong as it is in CJK-friendly readers.
 * https://spec.commonmark.org/0.31.2/#can-open-emphasis
 */
export function getEmphasisSides(
  marker: string,
  before: string | undefined,
  after: string | undefined,
  isCJKFriendly = false,
): {canOpen: boolean; canClose: boolean} {
  const isLeft = isFlankedByClass(
    facingClass(after, isCJKFriendly),
    awayClass(before, isCJKFriendly),
  );
  const isRight = isFlankedByClass(
    facingClass(before, isCJKFriendly),
    awayClass(after, isCJKFriendly),
  );
  return marker === '_'
    ? {
        canClose: isRight && (!isLeft || classify(after) === PUNCTUATION_CLASS),
        canOpen: isLeft && (!isRight || classify(before) === PUNCTUATION_CLASS),
      }
    : {canClose: isRight, canOpen: isLeft};
}

/**
 * The character before `index`, read with a variation selector other than
 * the emoji one as the character it follows, as the CJK-friendly amendment
 * does.
 */
export function characterBeforeRun(
  text: string,
  index: number,
): string | undefined {
  const character = characterBefore(text, index);
  return character !== undefined &&
    index > 1 &&
    TEXT_VARIATION_SELECTOR.test(character)
    ? characterBefore(text, index - 1)
    : character;
}

export function isPunctuationOrSpace(character: string): boolean {
  return classify(character) !== OTHER_CLASS;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

/** The character (code point) that starts at `index`, if any. */
export function characterAt(text: string, index: number): string | undefined {
  return isHighSurrogate(text.charCodeAt(index)) &&
    isLowSurrogate(text.charCodeAt(index + 1))
    ? text.slice(index, index + 2)
    : text[index];
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
