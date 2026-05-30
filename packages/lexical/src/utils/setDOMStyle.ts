/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const IMPORTANT_FLAG = '!important';

/**
 * Parses inline CSS text into an object that is compatible with
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
export function getStyleObjectFromCSS(css: string): Record<string, string> {
  const styles: Record<string, string> = {};

  if (!css) {
    return styles;
  }

  let currentProperty = '';
  let currentValue = '';
  let currentQuote: '"' | "'" | null = null;
  let inComment = false;
  let isEscaped = false;
  let isParsingValue = false;
  let parenthesisDepth = 0;

  for (let i = 0; i < css.length; i++) {
    const char = css[i];

    if (inComment) {
      if (char === '*' && css[i + 1] === '/') {
        inComment = false;
        i++;
      }
      continue;
    }

    if (isEscaped) {
      if (isParsingValue) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      isEscaped = false;
      continue;
    }

    if (currentQuote !== null) {
      if (isParsingValue) {
        currentValue += char;
      } else {
        currentProperty += char;
      }

      if (char === '\\') {
        isEscaped = true;
      } else if (char === currentQuote) {
        currentQuote = null;
      }

      continue;
    }

    if (char === '/' && css[i + 1] === '*') {
      inComment = true;
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      currentQuote = char;
      if (isParsingValue) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      continue;
    }

    if (char === '(') {
      parenthesisDepth++;
      if (isParsingValue) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      continue;
    }

    if (char === ')') {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      if (isParsingValue) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      continue;
    }

    if (!isParsingValue && char === ':' && parenthesisDepth === 0) {
      isParsingValue = true;
      continue;
    }

    if (char === ';' && parenthesisDepth === 0) {
      const property = currentProperty.trim();
      const value = currentValue.trim();

      if (property !== '' && value !== '') {
        styles[property] = value;
      }

      currentProperty = '';
      currentValue = '';
      isParsingValue = false;
      continue;
    }

    if (isParsingValue) {
      currentValue += char;
    } else {
      currentProperty += char;
    }
  }

  const property = currentProperty.trim();
  const value = currentValue.trim();

  if (property !== '' && value !== '') {
    styles[property] = value;
  }

  return styles;
}

function setDOMStyleProperty(
  domStyle: CSSStyleDeclaration,
  property: string,
  value: string,
): void {
  // Detect (and strip) a trailing `!important` flag using plain string
  // operations. A regexp such as `/\s*!important\s*$/i` runs in O(n^2) time on
  // whitespace-heavy values (the leading `\s*` backtracks from every starting
  // offset), whereas `trimEnd` + `slice` is linear.
  const trimmedValue = value.trimEnd();
  const flagStart = trimmedValue.length - IMPORTANT_FLAG.length;
  const hasImportant =
    flagStart >= 0 &&
    trimmedValue.slice(flagStart).toLowerCase() === IMPORTANT_FLAG;

  if (hasImportant) {
    domStyle.setProperty(
      property,
      trimmedValue.slice(0, flagStart).trim(),
      'important',
    );
  } else {
    domStyle.setProperty(property, value, '');
  }
}

/**
 * Applies a style object to a DOM style declaration using
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
export function setDOMStyleObject(
  domStyle: CSSStyleDeclaration,
  styleObject: Record<string, string | null | undefined>,
): void {
  for (const property in styleObject) {
    const value = styleObject[property];
    if (value == null) {
      domStyle.removeProperty(property);
    } else {
      setDOMStyleProperty(domStyle, property, value);
    }
  }
}

/**
 * Applies inline CSS text to a DOM style declaration using
 * `CSSStyleDeclaration.setProperty()`.
 *
 * Property names are expected to be kebab-case, such as `font-size`, and
 * values are expected to include explicit units where needed, such as `12px`.
 */
export function setDOMStyleFromCSS(
  domStyle: CSSStyleDeclaration,
  cssText: string,
  prevCSSText: string = '',
): void {
  if (cssText === prevCSSText) {
    return;
  }

  const prevCSS = getStyleObjectFromCSS(prevCSSText);
  const nextCSS = getStyleObjectFromCSS(cssText);

  for (const property in nextCSS) {
    delete prevCSS[property];
    setDOMStyleProperty(domStyle, property, nextCSS[property]);
  }

  for (const property in prevCSS) {
    domStyle.removeProperty(property);
  }
}
