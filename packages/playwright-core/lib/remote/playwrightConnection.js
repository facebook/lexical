"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PlaywrightConnection = void 0;

var _server = require("../server");

var _browser = require("../server/browser");

var _instrumentation = require("../server/instrumentation");

var _processLauncher = require("../utils/processLauncher");

var _socksProxy = require("../common/socksProxy");

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
class PlaywrightConnection {
  constructor(ws, enableSocksProxy, browserAlias, headless, browser, log, onClose) {
    this._ws = void 0;
    this._onClose = void 0;
    this._dispatcherConnection = void 0;
    this._cleanups = [];
    this._debugLog = void 0;
    this._disconnected = false;
    this._ws = ws;
    this._onClose = onClose;
    this._debugLog = log;
    this._dispatcherConnection = new _server.DispatcherConnection();

    this._dispatcherConnection.onmessage = message => {
      if (ws.readyState !== ws.CLOSING) ws.send(JSON.stringify(message));
    };

    ws.on('message', message => {
      this._dispatcherConnection.dispatch(JSON.parse(Buffer.from(message).toString()));
    });
    ws.on('close', () => this._onDisconnect());
    ws.on('error', error => this._onDisconnect(error));
    new _server.Root(this._dispatcherConnection, async scope => {
      if (browser) return await this._initPreLaunchedBrowserMode(scope, browser);
      if (!browserAlias) return await this._initPlaywrightConnectMode(scope, enableSocksProxy);
      return await this._initLaunchBrowserMode(scope, enableSocksProxy, browserAlias, headless);
    });
  }

  async _initPlaywrightConnectMode(scope, enableSocksProxy) {
    this._debugLog(`engaged playwright.connect mode`);

    const playwright = (0, _server.createPlaywright)('javascript'); // Close all launched browsers on disconnect.

    this._cleanups.push(() => (0, _processLauncher.gracefullyCloseAll)());

    const socksProxy = enableSocksProxy ? await this._enableSocksProxy(playwright) : undefined;
    return new _server.PlaywrightDispatcher(scope, playwright, socksProxy);
  }

  async _initLaunchBrowserMode(scope, enableSocksProxy, browserAlias, headless) {
    this._debugLog(`engaged launch mode for "${browserAlias}"`);

    const executable = _server.registry.findExecutable(browserAlias);

    if (!executable || !executable.browserName) throw new Error(`Unsupported browser "${browserAlias}`);
    const playwright = (0, _server.createPlaywright)('javascript');
    const socksProxy = enableSocksProxy ? await this._enableSocksProxy(playwright) : undefined;
    const browser = await playwright[executable.browserName].launch((0, _instrumentation.serverSideCallMetadata)(), {
      channel: executable.type === 'browser' ? undefined : executable.name,
      headless
    }); // Close the browser on disconnect.
    // TODO: it is technically possible to launch more browsers over protocol.

    this._cleanups.push(() => browser.close());

    browser.on(_browser.Browser.Events.Disconnected, () => {
      // Underlying browser did close for some reason - force disconnect the client.
      this.close({
        code: 1001,
        reason: 'Browser closed'
      });
    });
    return new _server.PlaywrightDispatcher(scope, playwright, socksProxy, browser);
  }

  async _initPreLaunchedBrowserMode(scope, browser) {
    this._debugLog(`engaged pre-launched mode`);

    browser.on(_browser.Browser.Events.Disconnected, () => {
      // Underlying browser did close for some reason - force disconnect the client.
      this.close({
        code: 1001,
        reason: 'Browser closed'
      });
    });
    const playwright = browser.options.rootSdkObject;
    const playwrightDispatcher = new _server.PlaywrightDispatcher(scope, playwright, undefined, browser); // In pre-launched mode, keep the browser and just cleanup new contexts.
    // TODO: it is technically possible to launch more browsers over protocol.

    this._cleanups.push(() => playwrightDispatcher.cleanup());

    return playwrightDispatcher;
  }

  async _enableSocksProxy(playwright) {
    const socksProxy = new _socksProxy.SocksProxy();
    playwright.options.socksProxyPort = await socksProxy.listen(0);

    this._debugLog(`started socks proxy on port ${playwright.options.socksProxyPort}`);

    this._cleanups.push(() => socksProxy.close());

    return socksProxy;
  }

  async _onDisconnect(error) {
    this._disconnected = true;

    this._debugLog(`disconnected. error: ${error}`); // Avoid sending any more messages over closed socket.


    this._dispatcherConnection.onmessage = () => {};

    this._debugLog(`starting cleanup`);

    for (const cleanup of this._cleanups) await cleanup().catch(() => {});

    this._onClose();

    this._debugLog(`finished cleanup`);
  }

  async close(reason) {
    if (this._disconnected) return;

    this._debugLog(`force closing connection: ${(reason === null || reason === void 0 ? void 0 : reason.reason) || ''} (${(reason === null || reason === void 0 ? void 0 : reason.code) || 0})`);

    try {
      this._ws.close(reason === null || reason === void 0 ? void 0 : reason.code, reason === null || reason === void 0 ? void 0 : reason.reason);
    } catch (e) {}
  }

}

exports.PlaywrightConnection = PlaywrightConnection;