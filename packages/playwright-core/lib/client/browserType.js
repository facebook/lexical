"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserType = void 0;
var _browser3 = require("./browser");
var _browserContext = require("./browserContext");
var _channelOwner = require("./channelOwner");
var _connection = require("./connection");
var _events = require("./events");
var _clientHelper = require("./clientHelper");
var _utils = require("../utils");
var _errors = require("../common/errors");
var _timeoutRunner = require("../utils/timeoutRunner");
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

class BrowserType extends _channelOwner.ChannelOwner {
  constructor(...args) {
    super(...args);
    this._serverLauncher = void 0;
    this._contexts = new Set();
    this._playwright = void 0;
    this._defaultContextOptions = void 0;
    this._defaultLaunchOptions = void 0;
    this._defaultConnectOptions = void 0;
    this._onDidCreateContext = void 0;
    this._onWillCloseContext = void 0;
  }
  static from(browserType) {
    return browserType._object;
  }
  executablePath() {
    if (!this._initializer.executablePath) throw new Error('Browser is not supported on current platform');
    return this._initializer.executablePath;
  }
  name() {
    return this._initializer.name;
  }
  async launch(options = {}) {
    var _this$_defaultLaunchO;
    if (this._defaultConnectOptions) return await this._connectInsteadOfLaunching();
    const logger = options.logger || ((_this$_defaultLaunchO = this._defaultLaunchOptions) === null || _this$_defaultLaunchO === void 0 ? void 0 : _this$_defaultLaunchO.logger);
    (0, _utils.assert)(!options.userDataDir, 'userDataDir option is not supported in `browserType.launch`. Use `browserType.launchPersistentContext` instead');
    (0, _utils.assert)(!options.port, 'Cannot specify a port without launching as a server.');
    options = {
      ...this._defaultLaunchOptions,
      ...options
    };
    const launchOptions = {
      ...options,
      ignoreDefaultArgs: Array.isArray(options.ignoreDefaultArgs) ? options.ignoreDefaultArgs : undefined,
      ignoreAllDefaultArgs: !!options.ignoreDefaultArgs && !Array.isArray(options.ignoreDefaultArgs),
      env: options.env ? (0, _clientHelper.envObjectToArray)(options.env) : undefined
    };
    return await this._wrapApiCall(async () => {
      const browser = _browser3.Browser.from((await this._channel.launch(launchOptions)).browser);
      browser._logger = logger;
      browser._setBrowserType(this);
      return browser;
    });
  }
  async _connectInsteadOfLaunching() {
    var _connectOptions$timeo;
    const connectOptions = this._defaultConnectOptions;
    return this._connect(connectOptions.wsEndpoint, {
      headers: {
        'x-playwright-browser': this.name(),
        'x-playwright-launch-options': JSON.stringify(this._defaultLaunchOptions || {}),
        ...connectOptions.headers
      },
      timeout: (_connectOptions$timeo = connectOptions.timeout) !== null && _connectOptions$timeo !== void 0 ? _connectOptions$timeo : 3 * 60 * 1000 // 3 minutes
    });
  }

  async launchServer(options = {}) {
    if (!this._serverLauncher) throw new Error('Launching server is not supported');
    options = {
      ...this._defaultLaunchOptions,
      ...options
    };
    return this._serverLauncher.launchServer(options);
  }
  async launchPersistentContext(userDataDir, options = {}) {
    var _this$_defaultLaunchO2;
    const logger = options.logger || ((_this$_defaultLaunchO2 = this._defaultLaunchOptions) === null || _this$_defaultLaunchO2 === void 0 ? void 0 : _this$_defaultLaunchO2.logger);
    (0, _utils.assert)(!options.port, 'Cannot specify a port without launching as a server.');
    options = {
      ...this._defaultLaunchOptions,
      ...this._defaultContextOptions,
      ...options
    };
    const contextParams = await (0, _browserContext.prepareBrowserContextParams)(options);
    const persistentParams = {
      ...contextParams,
      ignoreDefaultArgs: Array.isArray(options.ignoreDefaultArgs) ? options.ignoreDefaultArgs : undefined,
      ignoreAllDefaultArgs: !!options.ignoreDefaultArgs && !Array.isArray(options.ignoreDefaultArgs),
      env: options.env ? (0, _clientHelper.envObjectToArray)(options.env) : undefined,
      channel: options.channel,
      userDataDir
    };
    return await this._wrapApiCall(async () => {
      var _this$_onDidCreateCon;
      const result = await this._channel.launchPersistentContext(persistentParams);
      const context = _browserContext.BrowserContext.from(result.context);
      context._options = contextParams;
      context._logger = logger;
      context._setBrowserType(this);
      await ((_this$_onDidCreateCon = this._onDidCreateContext) === null || _this$_onDidCreateCon === void 0 ? void 0 : _this$_onDidCreateCon.call(this, context));
      return context;
    });
  }
  async connect(optionsOrWsEndpoint, options) {
    if (typeof optionsOrWsEndpoint === 'string') return this._connect(optionsOrWsEndpoint, options);
    (0, _utils.assert)(optionsOrWsEndpoint.wsEndpoint, 'options.wsEndpoint is required');
    return this._connect(optionsOrWsEndpoint.wsEndpoint, optionsOrWsEndpoint);
  }
  async _connect(wsEndpoint, params = {}) {
    const logger = params.logger;
    return await this._wrapApiCall(async () => {
      const deadline = params.timeout ? (0, _utils.monotonicTime)() + params.timeout : 0;
      const headers = {
        'x-playwright-browser': this.name(),
        ...params.headers
      };
      const localUtils = this._connection.localUtils();
      const connectParams = {
        wsEndpoint,
        headers,
        slowMo: params.slowMo,
        timeout: params.timeout
      };
      if (params.__testHookRedirectPortForwarding) connectParams.socksProxyRedirectPortForTest = params.__testHookRedirectPortForwarding;
      const {
        pipe
      } = await localUtils._channel.connect(connectParams);
      const closePipe = () => pipe.close().catch(() => {});
      const connection = new _connection.Connection(localUtils);
      connection.markAsRemote();
      connection.on('close', closePipe);
      let browser;
      let closeError;
      const onPipeClosed = () => {
        var _browser2;
        // Emulate all pages, contexts and the browser closing upon disconnect.
        for (const context of ((_browser = browser) === null || _browser === void 0 ? void 0 : _browser.contexts()) || []) {
          var _browser;
          for (const page of context.pages()) page._onClose();
          context._onClose();
        }
        (_browser2 = browser) === null || _browser2 === void 0 ? void 0 : _browser2._didClose();
        connection.close(closeError || _errors.kBrowserClosedError);
      };
      pipe.on('closed', onPipeClosed);
      connection.onmessage = message => pipe.send({
        message
      }).catch(onPipeClosed);
      pipe.on('message', ({
        message
      }) => {
        try {
          connection.dispatch(message);
        } catch (e) {
          closeError = e.toString();
          closePipe();
        }
      });
      const result = await (0, _timeoutRunner.raceAgainstTimeout)(async () => {
        // For tests.
        if (params.__testHookBeforeCreateBrowser) await params.__testHookBeforeCreateBrowser();
        const playwright = await connection.initializePlaywright();
        if (!playwright._initializer.preLaunchedBrowser) {
          closePipe();
          throw new Error('Malformed endpoint. Did you use BrowserType.launchServer method?');
        }
        playwright._setSelectors(this._playwright.selectors);
        browser = _browser3.Browser.from(playwright._initializer.preLaunchedBrowser);
        browser._logger = logger;
        browser._shouldCloseConnectionOnClose = true;
        browser._setBrowserType(this);
        browser.on(_events.Events.Browser.Disconnected, closePipe);
        return browser;
      }, deadline ? deadline - (0, _utils.monotonicTime)() : 0);
      if (!result.timedOut) {
        return result.result;
      } else {
        closePipe();
        throw new Error(`Timeout ${params.timeout}ms exceeded`);
      }
    });
  }
  connectOverCDP(endpointURLOrOptions, options) {
    if (typeof endpointURLOrOptions === 'string') return this._connectOverCDP(endpointURLOrOptions, options);
    const endpointURL = 'endpointURL' in endpointURLOrOptions ? endpointURLOrOptions.endpointURL : endpointURLOrOptions.wsEndpoint;
    (0, _utils.assert)(endpointURL, 'Cannot connect over CDP without wsEndpoint.');
    return this.connectOverCDP(endpointURL, endpointURLOrOptions);
  }
  async _connectOverCDP(endpointURL, params = {}) {
    if (this.name() !== 'chromium') throw new Error('Connecting over CDP is only supported in Chromium.');
    const headers = params.headers ? (0, _utils.headersObjectToArray)(params.headers) : undefined;
    const result = await this._channel.connectOverCDP({
      endpointURL,
      headers,
      slowMo: params.slowMo,
      timeout: params.timeout
    });
    const browser = _browser3.Browser.from(result.browser);
    if (result.defaultContext) browser._contexts.add(_browserContext.BrowserContext.from(result.defaultContext));
    browser._logger = params.logger;
    browser._setBrowserType(this);
    return browser;
  }
}
exports.BrowserType = BrowserType;