'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = exports.ConsoleAPI = void 0;

var _selectorGenerator = require('../../injected/selectorGenerator');

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
class ConsoleAPI {
  constructor(injectedScript) {
    this._injectedScript = void 0;
    this._injectedScript = injectedScript;
    if (window.playwright) return;
    window.playwright = {
      $: (selector, strict) => this._querySelector(selector, !!strict),
      $$: (selector) => this._querySelectorAll(selector),
      inspect: (selector) => this._inspect(selector),
      selector: (element) => this._selector(element),
      resume: () => this._resume(),
    };
  }

  _querySelector(selector, strict) {
    if (typeof selector !== 'string')
      throw new Error(`Usage: playwright.query('Playwright >> selector').`);

    const parsed = this._injectedScript.parseSelector(selector);

    return this._injectedScript.querySelector(parsed, document, strict);
  }

  _querySelectorAll(selector) {
    if (typeof selector !== 'string')
      throw new Error(`Usage: playwright.$$('Playwright >> selector').`);

    const parsed = this._injectedScript.parseSelector(selector);

    return this._injectedScript.querySelectorAll(parsed, document);
  }

  _inspect(selector) {
    if (typeof selector !== 'string')
      throw new Error(`Usage: playwright.inspect('Playwright >> selector').`);
    window.inspect(this._querySelector(selector, false));
  }

  _selector(element) {
    if (!(element instanceof Element))
      throw new Error(`Usage: playwright.selector(element).`);
    return (0, _selectorGenerator.generateSelector)(
      this._injectedScript,
      element,
    ).selector;
  }

  _resume() {
    window._playwrightResume().catch(() => {});
  }
}

exports.ConsoleAPI = ConsoleAPI;
var _default = ConsoleAPI;
exports.default = _default;
