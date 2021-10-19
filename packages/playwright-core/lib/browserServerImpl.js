"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserServerLauncherImpl = void 0;

var _browser = require("./server/browser");

var _ws = require("ws");

var _dispatcher = require("./dispatchers/dispatcher");

var _browserContextDispatcher = require("./dispatchers/browserContextDispatcher");

var _clientHelper = require("./client/clientHelper");

var _utils = require("./utils/utils");

var _selectorsDispatcher = require("./dispatchers/selectorsDispatcher");

var _selectors = require("./server/selectors");

var _instrumentation = require("./server/instrumentation");

var _playwright = require("./server/playwright");

var _playwrightDispatcher = require("./dispatchers/playwrightDispatcher");

var _playwrightServer = require("./remote/playwrightServer");

var _browserContext = require("./server/browserContext");

var _cdpSessionDispatcher = require("./dispatchers/cdpSessionDispatcher");

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
class BrowserServerLauncherImpl {
  constructor(browserName) {
    this._browserName = void 0;
    this._browserName = browserName;
  }

  async launchServer(options = {}) {
    const playwright = (0, _playwright.createPlaywright)('javascript'); // 1. Pre-launch the browser

    const browser = await playwright[this._browserName].launch((0, _instrumentation.internalCallMetadata)(), { ...options,
      ignoreDefaultArgs: Array.isArray(options.ignoreDefaultArgs) ? options.ignoreDefaultArgs : undefined,
      ignoreAllDefaultArgs: !!options.ignoreDefaultArgs && !Array.isArray(options.ignoreDefaultArgs),
      env: options.env ? (0, _clientHelper.envObjectToArray)(options.env) : undefined
    }, toProtocolLogger(options.logger));
    let path = `/${(0, _utils.createGuid)()}`;
    if (options.wsPath) path = options.wsPath.startsWith('/') ? options.wsPath : `/${options.wsPath}`; // 2. Start the server

    const delegate = {
      path,
      allowMultipleClients: true,
      onClose: () => {},
      onConnect: this._onConnect.bind(this, playwright, browser)
    };
    const server = new _playwrightServer.PlaywrightServer(delegate);
    const wsEndpoint = await server.listen(options.port); // 3. Return the BrowserServer interface

    const browserServer = new _ws.EventEmitter();

    browserServer.process = () => browser.options.browserProcess.process;

    browserServer.wsEndpoint = () => wsEndpoint;

    browserServer.close = () => browser.options.browserProcess.close();

    browserServer.kill = () => browser.options.browserProcess.kill();

    browserServer._disconnectForTest = () => server.close();

    browser.options.browserProcess.onclose = async (exitCode, signal) => {
      server.close();
      browserServer.emit('close', exitCode, signal);
    };

    return browserServer;
  }

  async _onConnect(playwright, browser, connection, forceDisconnect) {
    let browserDispatcher;
    new _dispatcher.Root(connection, async scope => {
      const selectors = new _selectors.Selectors();
      const selectorsDispatcher = new _selectorsDispatcher.SelectorsDispatcher(scope, selectors);
      browserDispatcher = new ConnectedBrowserDispatcher(scope, browser, selectors);
      browser.on(_browser.Browser.Events.Disconnected, () => {
        // Underlying browser did close for some reason - force disconnect the client.
        forceDisconnect();
      });
      return new _playwrightDispatcher.PlaywrightDispatcher(scope, playwright, selectorsDispatcher, browserDispatcher);
    });
    return () => {
      var _browserDispatcher;

      // Cleanup contexts upon disconnect.
      (_browserDispatcher = browserDispatcher) === null || _browserDispatcher === void 0 ? void 0 : _browserDispatcher.cleanupContexts().catch(e => {});
    };
  }

} // This class implements multiplexing browser dispatchers over a single Browser instance.


exports.BrowserServerLauncherImpl = BrowserServerLauncherImpl;

class ConnectedBrowserDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, browser, selectors) {
    super(scope, browser, 'Browser', {
      version: browser.version(),
      name: browser.options.name
    }, true);
    this._contexts = new Set();
    this._selectors = void 0;
    this._selectors = selectors;
  }

  async newContext(params, metadata) {
    if (params.recordVideo) params.recordVideo.dir = this._object.options.artifactsDir;
    const context = await this._object.newContext(params);

    this._contexts.add(context);

    context._setSelectors(this._selectors);

    context.on(_browserContext.BrowserContext.Events.Close, () => this._contexts.delete(context));
    if (params.storageState) await context.setStorageState(metadata, params.storageState);
    return {
      context: new _browserContextDispatcher.BrowserContextDispatcher(this._scope, context)
    };
  }

  async close() {// Client should not send us Browser.close.
  }

  async killForTests() {// Client should not send us Browser.killForTests.
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

  async cleanupContexts() {
    await Promise.all(Array.from(this._contexts).map(context => context.close((0, _instrumentation.internalCallMetadata)())));
  }

}

function toProtocolLogger(logger) {
  return logger ? (direction, message) => {
    if (logger.isEnabled('protocol', 'verbose')) logger.log('protocol', 'verbose', (direction === 'send' ? 'SEND ► ' : '◀ RECV ') + JSON.stringify(message), [], {});
  } : undefined;
}