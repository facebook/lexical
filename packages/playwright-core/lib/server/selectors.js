"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Selectors = void 0;

var _selectorParser = require("./common/selectorParser");

var _utils = require("../utils/utils");

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
class Selectors {
  constructor() {
    this._builtinEngines = void 0;
    this._builtinEnginesInMainWorld = void 0;
    this._engines = void 0;
    this.guid = `selectors@${(0, _utils.createGuid)()}`;
    // Note: keep in sync with InjectedScript class.
    this._builtinEngines = new Set(['css', 'css:light', 'xpath', 'xpath:light', '_react', '_vue', 'text', 'text:light', 'id', 'id:light', 'data-testid', 'data-testid:light', 'data-test-id', 'data-test-id:light', 'data-test', 'data-test:light', 'nth', 'visible']);
    this._builtinEnginesInMainWorld = new Set(['_react', '_vue']);
    this._engines = new Map();
  }

  async register(name, source, contentScript = false) {
    if (!name.match(/^[a-zA-Z_0-9-]+$/)) throw new Error('Selector engine name may only contain [a-zA-Z0-9_] characters'); // Note: we keep 'zs' for future use.

    if (this._builtinEngines.has(name) || name === 'zs' || name === 'zs:light') throw new Error(`"${name}" is a predefined selector engine`);
    if (this._engines.has(name)) throw new Error(`"${name}" selector engine has been already registered`);

    this._engines.set(name, {
      source,
      contentScript
    });
  }

  unregisterAll() {
    this._engines.clear();
  }

  async query(frame, selector, options, scope) {
    const info = frame._page.parseSelector(selector, options);

    const context = await frame._context(info.world);
    const injectedScript = await context.injectedScript();
    const handle = await injectedScript.evaluateHandle((injected, {
      parsed,
      scope,
      strict
    }) => {
      return injected.querySelector(parsed, scope || document, strict);
    }, {
      parsed: info.parsed,
      scope,
      strict: info.strict
    });
    const elementHandle = handle.asElement();

    if (!elementHandle) {
      handle.dispose();
      return null;
    }

    const mainContext = await frame._mainContext();
    return this._adoptIfNeeded(elementHandle, mainContext);
  }

  async _queryArray(frame, selector, scope) {
    const info = this.parseSelector(selector, false);
    const context = await frame._mainContext();
    const injectedScript = await context.injectedScript();
    const arrayHandle = await injectedScript.evaluateHandle((injected, {
      parsed,
      scope
    }) => {
      return injected.querySelectorAll(parsed, scope || document);
    }, {
      parsed: info.parsed,
      scope
    });
    return arrayHandle;
  }

  async _queryAll(frame, selector, scope, adoptToMain) {
    const info = this.parseSelector(selector, false);
    const context = await frame._context(info.world);
    const injectedScript = await context.injectedScript();
    const arrayHandle = await injectedScript.evaluateHandle((injected, {
      parsed,
      scope
    }) => {
      return injected.querySelectorAll(parsed, scope || document);
    }, {
      parsed: info.parsed,
      scope
    });
    const properties = await arrayHandle.getProperties();
    arrayHandle.dispose(); // Note: adopting elements one by one may be slow. If we encounter the issue here,
    // we might introduce 'useMainContext' option or similar to speed things up.

    const targetContext = adoptToMain ? await frame._mainContext() : context;
    const result = [];

    for (const property of properties.values()) {
      const elementHandle = property.asElement();
      if (elementHandle) result.push(this._adoptIfNeeded(elementHandle, targetContext));else property.dispose();
    }

    return Promise.all(result);
  }

  async _adoptIfNeeded(handle, context) {
    if (handle._context === context) return handle;

    const adopted = handle._page._delegate.adoptElementHandle(handle, context);

    handle.dispose();
    return adopted;
  }

  parseSelector(selector, strict) {
    const parsed = (0, _selectorParser.parseSelector)(selector);
    let needsMainWorld = false;

    for (const part of parsed.parts) {
      const custom = this._engines.get(part.name);

      if (!custom && !this._builtinEngines.has(part.name)) throw new Error(`Unknown engine "${part.name}" while parsing selector ${selector}`);
      if (custom && !custom.contentScript) needsMainWorld = true;
      if (this._builtinEnginesInMainWorld.has(part.name)) needsMainWorld = true;
    }

    return {
      parsed,
      selector,
      world: needsMainWorld ? 'main' : 'utility',
      strict
    };
  }

}

exports.Selectors = Selectors;