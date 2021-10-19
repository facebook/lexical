"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Browser = void 0;

var _browserContext = require("./browserContext");

var _channelOwner = require("./channelOwner");

var _events = require("./events");

var _errors = require("../utils/errors");

var _cdpSession = require("./cdpSession");

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
class Browser extends _channelOwner.ChannelOwner {
  static from(browser) {
    return browser._object;
  }

  static fromNullable(browser) {
    return browser ? Browser.from(browser) : null;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._contexts = new Set();
    this._isConnected = true;
    this._closedPromise = void 0;
    this._shouldCloseConnectionOnClose = false;
    this._browserType = void 0;
    this._name = void 0;
    this._name = initializer.name;

    this._channel.on('close', () => this._didClose());

    this._closedPromise = new Promise(f => this.once(_events.Events.Browser.Disconnected, f));
  }

  _setBrowserType(browserType) {
    this._browserType = browserType;

    for (const context of this._contexts) context._setBrowserType(browserType);
  }

  async newContext(options = {}) {
    return this._wrapApiCall(async channel => {
      var _this$_browserType$_o, _this$_browserType;

      options = { ...this._browserType._defaultContextOptions,
        ...options
      };
      const contextOptions = await (0, _browserContext.prepareBrowserContextParams)(options);

      const context = _browserContext.BrowserContext.from((await channel.newContext(contextOptions)).context);

      context._options = contextOptions;

      this._contexts.add(context);

      context._logger = options.logger || this._logger;

      context._setBrowserType(this._browserType);

      await ((_this$_browserType$_o = (_this$_browserType = this._browserType)._onDidCreateContext) === null || _this$_browserType$_o === void 0 ? void 0 : _this$_browserType$_o.call(_this$_browserType, context));
      return context;
    });
  }

  contexts() {
    return [...this._contexts];
  }

  version() {
    return this._initializer.version;
  }

  async newPage(options = {}) {
    const context = await this.newContext(options);
    const page = await context.newPage();
    page._ownedContext = context;
    context._ownerPage = page;
    return page;
  }

  isConnected() {
    return this._isConnected;
  }

  async newBrowserCDPSession() {
    return this._wrapApiCall(async channel => {
      return _cdpSession.CDPSession.from((await channel.newBrowserCDPSession()).session);
    });
  }

  async startTracing(page, options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.startTracing({ ...options,
        page: page ? page._channel : undefined
      });
    });
  }

  async stopTracing() {
    return this._wrapApiCall(async channel => {
      return Buffer.from((await channel.stopTracing()).binary, 'base64');
    });
  }

  async close() {
    try {
      await this._wrapApiCall(async channel => {
        if (this._shouldCloseConnectionOnClose) this._connection.close(_errors.kBrowserClosedError);else await channel.close();
        await this._closedPromise;
      });
    } catch (e) {
      if ((0, _errors.isSafeCloseError)(e)) return;
      throw e;
    }
  }

  _didClose() {
    this._isConnected = false;
    this.emit(_events.Events.Browser.Disconnected, this);
  }

}

exports.Browser = Browser;