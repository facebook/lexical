/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const IMPORTANT_REG_EXP = /\s*!important\s*$/i;
const CSS_TO_STYLE_OBJECT_CACHE_MAX_SIZE = 100;
const CSS_TO_STYLE_OBJECT_CACHE: Map<
  string,
  Record<string, string>
> = new Map();

function getCachedStyleObjectFromCSS(
  css: string,
): Record<string, string> | undefined {
  const cachedStyleObject = CSS_TO_STYLE_OBJECT_CACHE.get(css);

  if (cachedStyleObject !== undefined) {
    CSS_TO_STYLE_OBJECT_CACHE.delete(css);
    CSS_TO_STYLE_OBJECT_CACHE.set(css, cachedStyleObject);
    return {...cachedStyleObject};
  }

  return undefined;
}

function setCachedStyleObjectFromCSS(
  css: string,
  styleObject: Record<string, string>,
): void {
  CSS_TO_STYLE_OBJECT_CACHE.set(css, styleObject);

  if (CSS_TO_STYLE_OBJECT_CACHE.size > CSS_TO_STYLE_OBJECT_CACHE_MAX_SIZE) {
    const oldestKey = CSS_TO_STYLE_OBJECT_CACHE.keys().next().value;

    if (oldestKey !== undefined) {
      CSS_TO_STYLE_OBJECT_CACHE.delete(oldestKey);
    }
  }
}

function getStyleDeclarations(css: string): Array<string> {
  const declarations: Array<string> = [];

  if (!css) {
    return declarations;
  }

  let currentDeclaration = '';
  let currentQuote: '"' | "'" | null = null;
  let inComment = false;
  let isEscaped = false;
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
      currentDeclaration += char;
      isEscaped = false;
      continue;
    }

    if (currentQuote !== null) {
      currentDeclaration += char;

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
      currentDeclaration += char;
      continue;
    }

    if (char === '(') {
      parenthesisDepth++;
      currentDeclaration += char;
      continue;
    }

    if (char === ')') {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      currentDeclaration += char;
      continue;
    }

    if (char === ';' && parenthesisDepth === 0) {
      const declaration = currentDeclaration.trim();

      if (declaration !== '') {
        declarations.push(declaration);
      }

      currentDeclaration = '';
      continue;
    }

    currentDeclaration += char;
  }

  const declaration = currentDeclaration.trim();

  if (declaration !== '') {
    declarations.push(declaration);
  }

  return declarations;
}

function getStylePropertyAndValue(
  styleDeclaration: string,
): [string, string] | null {
  let currentQuote: '"' | "'" | null = null;
  let inComment = false;
  let isEscaped = false;
  let parenthesisDepth = 0;

  for (let i = 0; i < styleDeclaration.length; i++) {
    const char = styleDeclaration[i];

    if (inComment) {
      if (char === '*' && styleDeclaration[i + 1] === '/') {
        inComment = false;
        i++;
      }
      continue;
    }

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (currentQuote !== null) {
      if (char === '\\') {
        isEscaped = true;
      } else if (char === currentQuote) {
        currentQuote = null;
      }

      continue;
    }

    if (char === '/' && styleDeclaration[i + 1] === '*') {
      inComment = true;
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      currentQuote = char;
      continue;
    }

    if (char === '(') {
      parenthesisDepth++;
      continue;
    }

    if (char === ')') {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      continue;
    }

    if (char === ':' && parenthesisDepth === 0) {
      const property = styleDeclaration.slice(0, i).trim();
      const value = styleDeclaration.slice(i + 1).trim();

      return property !== '' && value !== '' ? [property, value] : null;
    }
  }

  return null;
}

export function getStyleObjectFromCSS(css: string): Record<string, string> {
  const cachedStyleObject = getCachedStyleObjectFromCSS(css);

  if (cachedStyleObject !== undefined) {
    return cachedStyleObject;
  }

  const styleObject: Record<string, string> = {};

  for (const styleDeclaration of getStyleDeclarations(css)) {
    const propertyAndValue = getStylePropertyAndValue(styleDeclaration);

    if (propertyAndValue !== null) {
      const [property, value] = propertyAndValue;
      styleObject[property] = value;
    }
  }

  if (__DEV__) {
    Object.freeze(styleObject);
  }

  setCachedStyleObjectFromCSS(css, styleObject);

  return {...styleObject};
}

function setDOMStyleProperty(
  domStyle: CSSStyleDeclaration,
  property: string,
  value: string,
): void {
  const priority = IMPORTANT_REG_EXP.test(value) ? 'important' : '';
  const nextValue =
    priority === '' ? value : value.replace(IMPORTANT_REG_EXP, '').trim();

  domStyle.setProperty(property, nextValue, priority);
}

export function setDOMStyleObject(
  domStyle: CSSStyleDeclaration,
  styleObject: Record<string, string | null | undefined>,
): void {
  for (const [property, value] of Object.entries(styleObject)) {
    if (value == null) {
      domStyle.removeProperty(property);
    } else {
      setDOMStyleProperty(domStyle, property, value);
    }
  }
}

export function setDOMStyleFromCSS(
  domStyle: CSSStyleDeclaration,
  cssText: string,
  prevCSSText: string = '',
): void {
  if (cssText === prevCSSText) {
    return;
  }

  for (const property in getStyleObjectFromCSS(prevCSSText)) {
    domStyle.removeProperty(property);
  }

  setDOMStyleObject(domStyle, getStyleObjectFromCSS(cssText));
}
