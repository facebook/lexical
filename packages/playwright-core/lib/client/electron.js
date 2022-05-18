"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ElectronApplication = exports.Electron = void 0;

var _timeoutSettings = require("../common/timeoutSettings");

var _utils = require("../utils");

var _browserContext = require("./browserContext");

var _channelOwner = require("./channelOwner");

var _clientHelper = require("./clientHelper");

var _events = require("./events");

var _jsHandle = require("./jsHandle");

var _waiter = require("./waiter");

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
class Electron extends _channelOwner.ChannelOwner {
  static from(electron) {
    return electron._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
  }

  async launch(options = {}) {
    const params = { ...options,
      extraHTTPHeaders: options.extraHTTPHeaders && (0, _utils.headersObjectToArray)(options.extraHTTPHeaders),
      env: (0, _clientHelper.envObjectToArray)(options.env ? options.env : process.env)
    };
    const app = ElectronApplication.from((await this._channel.launch(params)).electronApplication);
    app._context._options = params;
    return app;
  }

}

exports.Electron = Electron;

class ElectronApplication extends _channelOwner.ChannelOwner {
  static from(electronApplication) {
    return electronApplication._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._context = void 0;
    this._windows = new Set();
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings();
    this._context = _browserContext.BrowserContext.from(initializer.context);

    for (const page of this._context._pages) this._onPage(page);

    this._context.on(_events.Events.BrowserContext.Page, page => this._onPage(page));

    this._channel.on('close', () => this.emit(_events.Events.ElectronApplication.Close));
  }

  process() {
    return this._toImpl().process();
  }

  _onPage(page) {
    this._windows.add(page);

    this.emit(_events.Events.ElectronApplication.Window, page);
    page.once(_events.Events.Page.Close, () => this._windows.delete(page));
  }

  windows() {
    // TODO: add ElectronPage class inherting from Page.
    return [...this._windows];
  }

  async firstWindow() {
    if (this._windows.size) return this._windows.values().next().value;
    return this.waitForEvent('window');
  }

  context() {
    return this._context;
  }

  async close() {
    await this._channel.close();
  }

  async waitForEvent(event, optionsOrPredicate = {}) {
    return this._wrapApiCall(async () => {
      const timeout = this._timeoutSettings.timeout(typeof optionsOrPredicate === 'function' ? {} : optionsOrPredicate);

      const predicate = typeof optionsOrPredicate === 'function' ? optionsOrPredicate : optionsOrPredicate.predicate;

      const waiter = _waiter.Waiter.createForEvent(this, event);

      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== _events.Events.ElectronApplication.Close) waiter.rejectOnEvent(this, _events.Events.ElectronApplication.Close, new Error('Electron application closed'));
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }

  async browserWindow(page) {
    const result = await this._channel.browserWindow({
      page: page._channel
    });
    return _jsHandle.JSHandle.from(result.handle);
  }

  async evaluate(pageFunction, arg) {
    const result = await this._channel.evaluateExpression({
      expression: String(pageFunction),
      isFunction: typeof pageFunction === 'function',
      arg: (0, _jsHandle.serializeArgument)(arg)
    });
    return (0, _jsHandle.parseResult)(result.value);
  }

  async evaluateHandle(pageFunction, arg) {
    const result = await this._channel.evaluateExpressionHandle({
      expression: String(pageFunction),
      isFunction: typeof pageFunction === 'function',
      arg: (0, _jsHandle.serializeArgument)(arg)
    });
    return _jsHandle.JSHandle.from(result.handle);
  }

}

exports.ElectronApplication = ElectronApplication;