"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserContext = void 0;
exports.prepareBrowserContextParams = prepareBrowserContextParams;

var _page = require("./page");

var _frame = require("./frame");

var network = _interopRequireWildcard(require("./network"));

var _fs = _interopRequireDefault(require("fs"));

var _channelOwner = require("./channelOwner");

var _clientHelper = require("./clientHelper");

var _browser = require("./browser");

var _worker = require("./worker");

var _events = require("./events");

var _timeoutSettings = require("../common/timeoutSettings");

var _waiter = require("./waiter");

var _utils = require("../utils");

var _fileUtils = require("../utils/fileUtils");

var _errors = require("../common/errors");

var _cdpSession = require("./cdpSession");

var _tracing = require("./tracing");

var _artifact = require("./artifact");

var _fetch = require("./fetch");

var _clientInstrumentation = require("./clientInstrumentation");

var _stackTrace = require("../utils/stackTrace");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Copyright 2017 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class BrowserContext extends _channelOwner.ChannelOwner {
  static from(context) {
    return context._object;
  }

  static fromNullable(context) {
    return context ? BrowserContext.from(context) : null;
  }

  constructor(parent, type, guid, initializer) {
    var _this$_browser;

    super(parent, type, guid, initializer, (0, _clientInstrumentation.createInstrumentation)());
    this._pages = new Set();
    this._routes = [];
    this._browser = null;
    this._browserType = void 0;
    this._bindings = new Map();
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings();
    this._ownerPage = void 0;
    this._closedPromise = void 0;
    this._options = {};
    this.request = void 0;
    this.tracing = void 0;
    this._backgroundPages = new Set();
    this._serviceWorkers = new Set();
    this._isChromium = void 0;
    if (parent instanceof _browser.Browser) this._browser = parent;
    this._isChromium = ((_this$_browser = this._browser) === null || _this$_browser === void 0 ? void 0 : _this$_browser._name) === 'chromium';
    this.tracing = _tracing.Tracing.from(initializer.tracing);
    this.request = _fetch.APIRequestContext.from(initializer.APIRequestContext);

    this._channel.on('bindingCall', ({
      binding
    }) => this._onBinding(_page.BindingCall.from(binding)));

    this._channel.on('close', () => this._onClose());

    this._channel.on('page', ({
      page
    }) => this._onPage(_page.Page.from(page)));

    this._channel.on('route', ({
      route,
      request
    }) => this._onRoute(network.Route.from(route), network.Request.from(request)));

    this._channel.on('backgroundPage', ({
      page
    }) => {
      const backgroundPage = _page.Page.from(page);

      this._backgroundPages.add(backgroundPage);

      this.emit(_events.Events.BrowserContext.BackgroundPage, backgroundPage);
    });

    this._channel.on('serviceWorker', ({
      worker
    }) => {
      const serviceWorker = _worker.Worker.from(worker);

      serviceWorker._context = this;

      this._serviceWorkers.add(serviceWorker);

      this.emit(_events.Events.BrowserContext.ServiceWorker, serviceWorker);
    });

    this._channel.on('request', ({
      request,
      page
    }) => this._onRequest(network.Request.from(request), _page.Page.fromNullable(page)));

    this._channel.on('requestFailed', ({
      request,
      failureText,
      responseEndTiming,
      page
    }) => this._onRequestFailed(network.Request.from(request), responseEndTiming, failureText, _page.Page.fromNullable(page)));

    this._channel.on('requestFinished', params => this._onRequestFinished(params));

    this._channel.on('response', ({
      response,
      page
    }) => this._onResponse(network.Response.from(response), _page.Page.fromNullable(page)));

    this._closedPromise = new Promise(f => this.once(_events.Events.BrowserContext.Close, f));
  }

  _setBrowserType(browserType) {
    this._browserType = browserType;

    browserType._contexts.add(this);
  }

  _onPage(page) {
    this._pages.add(page);

    this.emit(_events.Events.BrowserContext.Page, page);
    if (page._opener && !page._opener.isClosed()) page._opener.emit(_events.Events.Page.Popup, page);
  }

  _onRequest(request, page) {
    this.emit(_events.Events.BrowserContext.Request, request);
    if (page) page.emit(_events.Events.Page.Request, request);
  }

  _onResponse(response, page) {
    this.emit(_events.Events.BrowserContext.Response, response);
    if (page) page.emit(_events.Events.Page.Response, response);
  }

  _onRequestFailed(request, responseEndTiming, failureText, page) {
    request._failureText = failureText || null;
    if (request._timing) request._timing.responseEnd = responseEndTiming;
    this.emit(_events.Events.BrowserContext.RequestFailed, request);
    if (page) page.emit(_events.Events.Page.RequestFailed, request);
  }

  _onRequestFinished(params) {
    const {
      responseEndTiming
    } = params;
    const request = network.Request.from(params.request);
    const response = network.Response.fromNullable(params.response);

    const page = _page.Page.fromNullable(params.page);

    if (request._timing) request._timing.responseEnd = responseEndTiming;
    this.emit(_events.Events.BrowserContext.RequestFinished, request);
    if (page) page.emit(_events.Events.Page.RequestFinished, request);
    if (response) response._finishedPromise.resolve();
  }

  _onRoute(route, request) {
    for (const routeHandler of this._routes) {
      if (routeHandler.matches(request.url())) {
        try {
          routeHandler.handle(route, request);
        } finally {
          if (!routeHandler.isActive()) {
            this._routes.splice(this._routes.indexOf(routeHandler), 1);

            if (!this._routes.length) this._wrapApiCall(() => this._disableInterception(), true).catch(() => {});
          }
        }

        return;
      }
    } // it can race with BrowserContext.close() which then throws since its closed


    route._internalContinue();
  }

  async _onBinding(bindingCall) {
    const func = this._bindings.get(bindingCall._initializer.name);

    if (!func) return;
    await bindingCall.call(func);
  }

  setDefaultNavigationTimeout(timeout) {
    this._timeoutSettings.setDefaultNavigationTimeout(timeout);

    this._wrapApiCall(async () => {
      this._channel.setDefaultNavigationTimeoutNoReply({
        timeout
      });
    }, true);
  }

  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);

    this._wrapApiCall(async () => {
      this._channel.setDefaultTimeoutNoReply({
        timeout
      });
    }, true);
  }

  browser() {
    return this._browser;
  }

  pages() {
    return [...this._pages];
  }

  async newPage() {
    if (this._ownerPage) throw new Error('Please use browser.newContext()');
    return _page.Page.from((await this._channel.newPage()).page);
  }

  async cookies(urls) {
    if (!urls) urls = [];
    if (urls && typeof urls === 'string') urls = [urls];
    return (await this._channel.cookies({
      urls: urls
    })).cookies;
  }

  async addCookies(cookies) {
    await this._channel.addCookies({
      cookies
    });
  }

  async clearCookies() {
    await this._channel.clearCookies();
  }

  async grantPermissions(permissions, options) {
    await this._channel.grantPermissions({
      permissions,
      ...options
    });
  }

  async clearPermissions() {
    await this._channel.clearPermissions();
  }

  async setGeolocation(geolocation) {
    await this._channel.setGeolocation({
      geolocation: geolocation || undefined
    });
  }

  async setExtraHTTPHeaders(headers) {
    network.validateHeaders(headers);
    await this._channel.setExtraHTTPHeaders({
      headers: (0, _utils.headersObjectToArray)(headers)
    });
  }

  async setOffline(offline) {
    await this._channel.setOffline({
      offline
    });
  }

  async setHTTPCredentials(httpCredentials) {
    await this._channel.setHTTPCredentials({
      httpCredentials: httpCredentials || undefined
    });
  }

  async addInitScript(script, arg) {
    const source = await (0, _clientHelper.evaluationScript)(script, arg);
    await this._channel.addInitScript({
      source
    });
  }

  async _removeInitScripts() {
    await this._channel.removeInitScripts();
  }

  async exposeBinding(name, callback, options = {}) {
    await this._channel.exposeBinding({
      name,
      needsHandle: options.handle
    });

    this._bindings.set(name, callback);
  }

  async _removeExposedBindings() {
    for (const key of this._bindings.keys()) {
      if (!key.startsWith('__pw_')) this._bindings.delete(key);
    }

    await this._channel.removeExposedBindings();
  }

  async exposeFunction(name, callback) {
    await this._channel.exposeBinding({
      name
    });

    const binding = (source, ...args) => callback(...args);

    this._bindings.set(name, binding);
  }

  async route(url, handler, options = {}) {
    this._routes.unshift(new network.RouteHandler(this._options.baseURL, url, handler, options.times));

    if (this._routes.length === 1) await this._channel.setNetworkInterceptionEnabled({
      enabled: true
    });
  }

  async unroute(url, handler) {
    this._routes = this._routes.filter(route => route.url !== url || handler && route.handler !== handler);
    if (!this._routes.length) await this._disableInterception();
  }

  async _unrouteAll() {
    this._routes = [];
    await this._disableInterception();
  }

  async _disableInterception() {
    await this._channel.setNetworkInterceptionEnabled({
      enabled: false
    });
  }

  async waitForEvent(event, optionsOrPredicate = {}) {
    return this._wrapApiCall(async () => {
      const timeout = this._timeoutSettings.timeout(typeof optionsOrPredicate === 'function' ? {} : optionsOrPredicate);

      const predicate = typeof optionsOrPredicate === 'function' ? optionsOrPredicate : optionsOrPredicate.predicate;

      const waiter = _waiter.Waiter.createForEvent(this, event);

      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== _events.Events.BrowserContext.Close) waiter.rejectOnEvent(this, _events.Events.BrowserContext.Close, new Error('Context closed'));
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }

  async storageState(options = {}) {
    const state = await this._channel.storageState();

    if (options.path) {
      await (0, _fileUtils.mkdirIfNeeded)(options.path);
      await _fs.default.promises.writeFile(options.path, JSON.stringify(state, undefined, 2), 'utf8');
    }

    return state;
  }

  backgroundPages() {
    return [...this._backgroundPages];
  }

  serviceWorkers() {
    return [...this._serviceWorkers];
  }

  async newCDPSession(page) {
    // channelOwner.ts's validation messages don't handle the pseudo-union type, so we're explicit here
    if (!(page instanceof _page.Page) && !(page instanceof _frame.Frame)) throw new Error('page: expected Page or Frame');
    const result = await this._channel.newCDPSession(page instanceof _page.Page ? {
      page: page._channel
    } : {
      frame: page._channel
    });
    return _cdpSession.CDPSession.from(result.session);
  }

  _onClose() {
    var _this$_browserType, _this$_browserType$_c;

    if (this._browser) this._browser._contexts.delete(this);
    (_this$_browserType = this._browserType) === null || _this$_browserType === void 0 ? void 0 : (_this$_browserType$_c = _this$_browserType._contexts) === null || _this$_browserType$_c === void 0 ? void 0 : _this$_browserType$_c.delete(this);
    this.emit(_events.Events.BrowserContext.Close, this);
  }

  async close() {
    try {
      await this._wrapApiCall(async () => {
        var _this$_browserType2, _this$_browserType2$_;

        await ((_this$_browserType2 = this._browserType) === null || _this$_browserType2 === void 0 ? void 0 : (_this$_browserType2$_ = _this$_browserType2._onWillCloseContext) === null || _this$_browserType2$_ === void 0 ? void 0 : _this$_browserType2$_.call(_this$_browserType2, this));

        if (this._options.recordHar) {
          const har = await this._channel.harExport();

          const artifact = _artifact.Artifact.from(har.artifact);

          await artifact.saveAs(this._options.recordHar.path);
          await artifact.delete();
        }
      }, true);
      await this._channel.close();
      await this._closedPromise;
    } catch (e) {
      if ((0, _errors.isSafeCloseError)(e)) return;
      throw e;
    }
  }

  async _enableRecorder(params) {
    await this._channel.recorderSupplementEnable(params);
  }

  async _resetForReuse() {
    await this._unrouteAll();
    await this._removeInitScripts();
    await this._removeExposedBindings();
  }

}

exports.BrowserContext = BrowserContext;

async function prepareStorageState(options) {
  if (typeof options.storageState !== 'string') return options.storageState;

  try {
    return JSON.parse(await _fs.default.promises.readFile(options.storageState, 'utf8'));
  } catch (e) {
    (0, _stackTrace.rewriteErrorMessage)(e, `Error reading storage state from ${options.storageState}:\n` + e.message);
    throw e;
  }
}

async function prepareBrowserContextParams(options) {
  if (options.videoSize && !options.videosPath) throw new Error(`"videoSize" option requires "videosPath" to be specified`);
  if (options.extraHTTPHeaders) network.validateHeaders(options.extraHTTPHeaders);
  const contextParams = { ...options,
    viewport: options.viewport === null ? undefined : options.viewport,
    noDefaultViewport: options.viewport === null,
    extraHTTPHeaders: options.extraHTTPHeaders ? (0, _utils.headersObjectToArray)(options.extraHTTPHeaders) : undefined,
    storageState: await prepareStorageState(options)
  };

  if (!contextParams.recordVideo && options.videosPath) {
    contextParams.recordVideo = {
      dir: options.videosPath,
      size: options.videoSize
    };
  }

  return contextParams;
}