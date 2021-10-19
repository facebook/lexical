"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserDispatcher = void 0;

var _browser = require("../server/browser");

var _browserContextDispatcher = require("./browserContextDispatcher");

var _cdpSessionDispatcher = require("./cdpSessionDispatcher");

var _dispatcher = require("./dispatcher");

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
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
class BrowserDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, browser) {
    super(scope, browser, 'Browser', {
      version: browser.version(),
      name: browser.options.name
    }, true);
    browser.on(_browser.Browser.Events.Disconnected, () => this._didClose());
  }

  _didClose() {
    this._dispatchEvent('close');

    this._dispose();
  }

  async newContext(params, metadata) {
    const context = await this._object.newContext(params);
    if (params.storageState) await context.setStorageState(metadata, params.storageState);
    return {
      context: new _browserContextDispatcher.BrowserContextDispatcher(this._scope, context)
    };
  }

  async close() {
    await this._object.close();
  }

  async killForTests() {
    await this._object.killForTests();
  }

  async newBrowserCDPSession() {
    if (!this._object.options.isChromium) throw new Error(`CDP session is only available in Chromium`);
    const crBrowser = this._object;
    return {
      session: new _cdpSessionDispatcher.CDPSessionDispatcher(this._scope, await crBrowser.newBrowserCDPSession())
    };
  }

  async startTracing(params) {
    if (!this._object.options.isChromium) throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    await crBrowser.startTracing(params.page ? params.page._object : undefined, params);
  }

  async stopTracing() {
    if (!this._object.options.isChromium) throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    const buffer = await crBrowser.stopTracing();
    return {
      binary: buffer.toString('base64')
    };
  }

}

exports.BrowserDispatcher = BrowserDispatcher;