"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseSelector = parseSelector;
exports.customCSSNames = void 0;

var _cssParser = require("./cssParser");

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const customCSSNames = new Set(['not', 'is', 'where', 'has', 'scope', 'light', 'visible', 'text', 'text-matches', 'text-is', 'has-text', 'above', 'below', 'right-of', 'left-of', 'near', 'nth-match']);
exports.customCSSNames = customCSSNames;

function parseSelector(selector) {
  const result = parseSelectorString(selector);
  const parts = result.parts.map(part => {
    if (part.name === 'css' || part.name === 'css:light') {
      if (part.name === 'css:light') part.body = ':light(' + part.body + ')';
      const parsedCSS = (0, _cssParser.parseCSS)(part.body, customCSSNames);
      return {
        name: 'css',
        body: parsedCSS.selector
      };
    }

    return part;
  });
  return {
    selector,
    capture: result.capture,
    parts
  };
}

function parseSelectorString(selector) {
  let index = 0;
  let quote;
  let start = 0;
  const result = {
    parts: []
  };

  const append = () => {
    const part = selector.substring(start, index).trim();
    const eqIndex = part.indexOf('=');
    let name;
    let body;

    if (eqIndex !== -1 && part.substring(0, eqIndex).trim().match(/^[a-zA-Z_0-9-+:*]+$/)) {
      name = part.substring(0, eqIndex).trim();
      body = part.substring(eqIndex + 1);
    } else if (part.length > 1 && part[0] === '"' && part[part.length - 1] === '"') {
      name = 'text';
      body = part;
    } else if (part.length > 1 && part[0] === "'" && part[part.length - 1] === "'") {
      name = 'text';
      body = part;
    } else if (/^\(*\/\//.test(part) || part.startsWith('..')) {
      // If selector starts with '//' or '//' prefixed with multiple opening
      // parenthesis, consider xpath. @see https://github.com/microsoft/playwright/issues/817
      // If selector starts with '..', consider xpath as well.
      name = 'xpath';
      body = part;
    } else {
      name = 'css';
      body = part;
    }

    let capture = false;

    if (name[0] === '*') {
      capture = true;
      name = name.substring(1);
    }

    result.parts.push({
      name,
      body
    });

    if (capture) {
      if (result.capture !== undefined) throw new Error(`Only one of the selectors can capture using * modifier`);
      result.capture = result.parts.length - 1;
    }
  };

  if (!selector.includes('>>')) {
    index = selector.length;
    append();
    return result;
  }

  while (index < selector.length) {
    const c = selector[index];

    if (c === '\\' && index + 1 < selector.length) {
      index += 2;
    } else if (c === quote) {
      quote = undefined;
      index++;
    } else if (!quote && (c === '"' || c === '\'' || c === '`')) {
      quote = c;
      index++;
    } else if (!quote && c === '>' && selector[index + 1] === '>') {
      append();
      index += 2;
      start = index;
    } else {
      index++;
    }
  }

  append();
  return result;
}