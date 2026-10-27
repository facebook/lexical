/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function isSpace(character: string): boolean {
  return /[ \t\n\r\f]/.test(character);
}

// Read an inline tag without backtracking through attribute whitespace/quotes.
function htmlTagEnd(source: string, start: number): number {
  let index = start + 1;
  const closing = source[index] === '/';
  if (closing) index++;
  if (!/[a-z]/i.test(source[index] || '')) return -1;
  while (/[a-z\d-]/i.test(source[index] || '')) index++;
  while (index < source.length) {
    const beforeSpace = index;
    while (isSpace(source[index] || '')) index++;
    if (source[index] === '>') return index + 1;
    if (!closing && source[index] === '/' && source[index + 1] === '>')
      return index + 2;
    if (
      closing ||
      index === beforeSpace ||
      !/[a-z_:]/i.test(source[index] || '')
    )
      return -1;
    while (/[a-z\d_.:-]/i.test(source[index] || '')) index++;
    const afterName = index;
    while (isSpace(source[index] || '')) index++;
    if (source[index] !== '=') {
      index = afterName;
      continue;
    }
    index++;
    while (isSpace(source[index] || '')) index++;
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      const end = source.indexOf(quote, index + 1);
      if (end < 0) return -1;
      index = end + 1;
    } else {
      const valueStart = index;
      while (index < source.length && !/[ \t\n\r\f"'=<>`]/.test(source[index]))
        index++;
      if (index === valueStart) return -1;
    }
  }
  return -1;
}

function startsHtml(
  source: string,
  index: number,
  lineStart: boolean,
  endings: {
    comment: number;
    instruction: number;
    cdata: number;
    declaration: number;
  },
): boolean {
  const suffix = source.slice(index);
  if (htmlTagEnd(source, index) >= 0) return true;
  if (/^<!--/.test(suffix)) return lineStart || endings.comment >= index + 4;
  if (/^<\?/.test(suffix)) return lineStart || endings.instruction >= index + 2;
  if (/^<!\[CDATA\[/.test(suffix))
    return lineStart || endings.cdata >= index + 9;
  if (/^<![A-Z]/.test(suffix))
    return lineStart || endings.declaration >= index + 3;
  if (
    lineStart &&
    /^<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|pre|script|search|section|style|summary|table|tbody|td|textarea|tfoot|th|thead|title|tr|track|ul)(?=[ \t\r\n/>]|$)/i.test(
      suffix,
    )
  )
    return true;
  // Autolink destinations exclude ASCII controls.
  // eslint-disable-next-line no-control-regex
  return /^<(?:[a-z][a-z\d+.-]{1,31}:[^<>\x00-\x20\x7f]*|[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*)>/i.test(
    suffix,
  );
}

function bracketPairs(
  source: string,
  literal: Set<number>,
): {
  pairs: Map<number, number>;
  unmatched: Set<number>;
} {
  const stack: number[] = [];
  const pairs = new Map<number, number>();
  const unmatched = new Set<number>();
  for (let index = 0; index < source.length; index++) {
    if (
      source[index] === '\\' &&
      /[!-/:-@[-`{-~]/.test(source[index + 1] || '')
    ) {
      index++;
      continue;
    }
    if (source[index] === '<' && !literal.has(index)) {
      const end = htmlTagEnd(source, index);
      if (end >= 0) {
        index = end - 1;
        continue;
      }
    }
    if (source[index] === '`') {
      let end = index + 1;
      while (source[end] === '`') end++;
      const size = end - index;
      let cursor = end;
      while ((cursor = source.indexOf('`', cursor)) >= 0) {
        let runEnd = cursor + 1;
        while (source[runEnd] === '`') runEnd++;
        if (runEnd - cursor === size) {
          index = runEnd - 1;
          break;
        }
        cursor = runEnd;
      }
      if (cursor < 0) index = end - 1;
    } else if (source[index] === '[') stack.push(index);
    else if (source[index] === ']') {
      const opener = stack.pop();
      if (opener === undefined) unmatched.add(index);
      else {
        pairs.set(opener, index);
        pairs.set(index, opener);
      }
    }
  }
  for (const index of stack) unmatched.add(index);
  return {pairs, unmatched};
}

function inlineDestination(
  source: string,
  opener: number,
  parentheses: Map<number, number>,
  nextSpace: Int32Array,
): boolean {
  if (source[opener] !== '(') return false;
  let index = opener + 1;
  while (isSpace(source[index] || '')) index++;
  if (source[index] === '<') {
    index++;
    while (index < source.length && source[index] !== '>') {
      if (source[index] === '<' || /[\r\n]/.test(source[index])) return false;
      if (
        source[index] === '\\' &&
        /[!-/:-@[-`{-~]/.test(source[index + 1] || '')
      )
        index++;
      index++;
    }
    if (source[index] !== '>') return false;
    index++;
  } else {
    for (; index < source.length; index++) {
      const character = source[index];
      if (
        character === '\\' &&
        /[!-/:-@[-`{-~]/.test(source[index + 1] || '')
      ) {
        index++;
        continue;
      }
      if (isSpace(character)) break;
      if (character === '(') {
        const end = parentheses.get(index);
        if (end === undefined || end > nextSpace[index]) return false;
        index = end;
      } else if (character === ')') return true;
    }
  }
  const afterDestination = index;
  while (isSpace(source[index] || '')) index++;
  if (source[index] === ')') return true;
  if (index === afterDestination || !['"', "'", '('].includes(source[index]))
    return false;
  const quote = source[index] === '(' ? ')' : source[index];
  index++;
  while (index < source.length && source[index] !== quote) {
    if (quote === ')' && source[index] === '(') return false;
    if (
      source[index] === '\\' &&
      /[!-/:-@[-`{-~]/.test(source[index + 1] || '')
    )
      index++;
    index++;
  }
  if (source[index] !== quote) return false;
  index++;
  while (isSpace(source[index] || '')) index++;
  return source[index] === ')';
}

/** Narrow only escapes recorded in literal output; authored syntax is untouched. */
export function narrowLiteralEscapes(
  markdown: string,
  escapes: number[],
  inLink: boolean,
  conservativeBrackets: boolean,
): string {
  if (escapes.length === 0) return markdown;
  const chunks: string[] = [];
  let previous = 0;
  for (const escape of escapes) {
    chunks.push(markdown.slice(previous, escape));
    previous = escape + 1;
  }
  chunks.push(markdown.slice(previous));
  const source = chunks.join('');
  const endings = {
    cdata: source.lastIndexOf(']]>'),
    comment: source.lastIndexOf('-->'),
    declaration: source.lastIndexOf('>'),
    instruction: source.lastIndexOf('?>'),
  };
  const literal = new Set(escapes.map((escape, index) => escape - index));
  const {pairs, unmatched} = bracketPairs(source, literal);
  const parentheses = new Map<number, number>();
  const openParentheses: number[] = [];
  for (let index = 0; index < source.length; index++) {
    if (
      source[index] === '\\' &&
      /[!-/:-@[-`{-~]/.test(source[index + 1] || '')
    ) {
      index++;
      continue;
    }
    if (source[index] === '(') openParentheses.push(index);
    else if (source[index] === ')') {
      const opener = openParentheses.pop();
      if (opener !== undefined) parentheses.set(opener, index);
    }
  }
  const nextSpace = new Int32Array(source.length + 1);
  nextSpace[source.length] = source.length;
  for (let index = source.length - 1; index >= 0; index--)
    nextSpace[index] = isSpace(source[index]) ? index : nextSpace[index + 1];
  const keep = new Set<number>();
  let line = 0;
  let scanned = 0;
  let seenContent = false;
  let priorContent = false;
  for (let count = 0; count < escapes.length; count++) {
    const index = escapes[count] - count;
    const character = source[index];
    for (; scanned < index; scanned++) {
      if (source[scanned] === '\n') {
        line = scanned + 1;
        priorContent = seenContent;
      }
      if (!isSpace(source[scanned])) seenContent = true;
    }
    const lineStart =
      !inLink &&
      index - line <= 3 &&
      /^ {0,3}$/.test(source.slice(line, index));
    const suffix = source.slice(index);
    if (character === '&') {
      if (/^&(?:#\d+|#[xX][\da-fA-F]+|[a-zA-Z][\da-zA-Z]*);/.test(suffix))
        keep.add(index);
    } else if (character === '<') {
      if (startsHtml(source, index, lineStart, endings)) keep.add(index);
    } else if (character === '[') {
      if (conservativeBrackets) {
        keep.add(index);
        continue;
      }
      const closer = pairs.get(index);
      if (inLink && unmatched.has(index)) keep.add(index);
      if (closer !== undefined && closer > index) {
        if (inlineDestination(source, closer + 1, parentheses, nextSpace))
          keep.add(index);
        if (lineStart && source[closer + 1] === ':') {
          let destination = closer + 2;
          while (isSpace(source[destination] || '')) destination++;
          if (destination < source.length) keep.add(index);
        }
      }
    } else if (character === ']') {
      if (conservativeBrackets || (inLink && unmatched.has(index)))
        keep.add(index);
    } else if (lineStart) {
      const text = suffix.split('\n', 1)[0];
      if (
        character === '>' ||
        /^#{1,6}(?:[ \t]|$)/.test(text) ||
        /^[+-](?:[ \t]|$)/.test(text) ||
        /^(?:-[ \t]*){3,}$/.test(text)
      )
        keep.add(index);
      if (character === '=' && /^=+[ \t]*$/.test(text) && priorContent)
        keep.add(index);
    } else if (character === '.' || character === ')') {
      if (
        index - line <= 12 &&
        /^ {0,3}\d{1,9}$/.test(source.slice(line, index)) &&
        /^[.)](?:[ \t]|$)/.test(suffix)
      )
        keep.add(index);
    }
  }
  if (inLink) {
    for (const [opener, closer] of pairs) {
      if (opener < closer && keep.has(opener)) keep.add(closer);
    }
  }
  let result = '';
  previous = 0;
  for (let count = 0; count < escapes.length; count++) {
    const index = escapes[count] - count;
    if (keep.has(index)) {
      result += source.slice(previous, index) + '\\';
      previous = index;
    }
  }
  return result + source.slice(previous);
}
