"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prepareBrowserContextParams = prepareBrowserContextParams;
exports.BrowserContext = void 0;

var _page = require("./page");

var _frame = require("./frame");

var network = _interopRequireWildcard(require("./network"));

var _fs = _interopRequireDefault(require("fs"));

var _channelOwner = require("./channelOwner");

var _clientHelper = require("./clientHelper");

var _browser = require("./browser");

var _worker = require("./worker");

var _events = require("./events");

var _timeoutSettings = require("../utils/timeoutSettings");

var _waiter = require("./waiter");

var _utils = require("../utils/utils");

var _errors = require("../utils/errors");

var _cdpSession = require("./cdpSession");

var _tracing = require("./tracing");

var _artifact = require("./artifact");

var _fetch = require("./fetch");

var _clientInstrumentation = require("./clientInstrumentation");

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
    this.tracing = new _tracing.Tracing(this);
    this.request = _fetch.FetchRequest.from(initializer.fetchRequest);

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
        if (routeHandler.handle(route, request)) {
          this._routes.splice(this._routes.indexOf(routeHandler), 1);

          if (!this._routes.length) this._wrapApiCall(channel => this._disableInterception(channel), undefined, true).catch(() => {});
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

    this._channel.setDefaultNavigationTimeoutNoReply({
      timeout
    });
  }

  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);

    this._channel.setDefaultTimeoutNoReply({
      timeout
    });
  }

  browser() {
    return this._browser;
  }

  pages() {
    return [...this._pages];
  }

  async newPage() {
    return this._wrapApiCall(async channel => {
      if (this._ownerPage) throw new Error('Please use browser.newContext()');
      return _page.Page.from((await channel.newPage()).page);
    });
  }

  async cookies(urls) {
    if (!urls) urls = [];
    if (urls && typeof urls === 'string') urls = [urls];
    return this._wrapApiCall(async channel => {
      return (await channel.cookies({
        urls: urls
      })).cookies;
    });
  }

  async addCookies(cookies) {
    return this._wrapApiCall(async channel => {
      await channel.addCookies({
        cookies
      });
    });
  }

  async clearCookies() {
    return this._wrapApiCall(async channel => {
      await channel.clearCookies();
    });
  }

  async grantPermissions(permissions, options) {
    return this._wrapApiCall(async channel => {
      await channel.grantPermissions({
        permissions,
        ...options
      });
    });
  }

  async clearPermissions() {
    return this._wrapApiCall(async channel => {
      await channel.clearPermissions();
    });
  }

  async setGeolocation(geolocation) {
    return this._wrapApiCall(async channel => {
      await channel.setGeolocation({
        geolocation: geolocation || undefined
      });
    });
  }

  async setExtraHTTPHeaders(headers) {
    return this._wrapApiCall(async channel => {
      network.validateHeaders(headers);
      await channel.setExtraHTTPHeaders({
        headers: (0, _utils.headersObjectToArray)(headers)
      });
    });
  }

  async setOffline(offline) {
    return this._wrapApiCall(async channel => {
      await channel.setOffline({
        offline
      });
    });
  }

  async setHTTPCredentials(httpCredentials) {
    if (!(0, _utils.isUnderTest)()) (0, _clientHelper.deprecate)(`context.setHTTPCredentials`, `warning: method |context.setHTTPCredentials()| is deprecated. Instead of changing credentials, create another browser context with new credentials.`);
    return this._wrapApiCall(async channel => {
      await channel.setHTTPCredentials({
        httpCredentials: httpCredentials || undefined
      });
    });
  }

  async addInitScript(script, arg) {
    return this._wrapApiCall(async channel => {
      const source = await (0, _clientHelper.evaluationScript)(script, arg);
      await channel.addInitScript({
        source
      });
    });
  }

  async exposeBinding(name, callback, options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.exposeBinding({
        name,
        needsHandle: options.handle
      });

      this._bindings.set(name, callback);
    });
  }

  async exposeFunction(name, callback) {
    return this._wrapApiCall(async channel => {
      await channel.exposeBinding({
        name
      });

      const binding = (source, ...args) => callback(...args);

      this._bindings.set(name, binding);
    });
  }

  async route(url, handler, options = {}) {
    return this._wrapApiCall(async channel => {
      this._routes.unshift(new network.RouteHandler(this._options.baseURL, url, handler, options.times));

      if (this._routes.length === 1) await channel.setNetworkInterceptionEnabled({
        enabled: true
      });
    });
  }

  async unroute(url, handler) {
    return this._wrapApiCall(async channel => {
      this._routes = this._routes.filter(route => route.url !== url || handler && route.handler !== handler);
      if (!this._routes.length) await this._disableInterception(channel);
    });
  }

  async _disableInterception(channel) {
    await channel.setNetworkInterceptionEnabled({
      enabled: false
    });
  }

  async waitForEvent(event, optionsOrPredicate = {}) {
    return this._wrapApiCall(async channel => {
      const timeout = this._timeoutSettings.timeout(typeof optionsOrPredicate === 'function' ? {} : optionsOrPredicate);

      const predicate = typeof optionsOrPredicate === 'function' ? optionsOrPredicate : optionsOrPredicate.predicate;

      const waiter = _waiter.Waiter.createForEvent(channel, event);

      waiter.rejectOnTimeout(timeout, `Timeout while waiting for event "${event}"`);
      if (event !== _events.Events.BrowserContext.Close) waiter.rejectOnEvent(this, _events.Events.BrowserContext.Close, new Error('Context closed'));
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }

  async storageState(options = {}) {
    return await this._wrapApiCall(async channel => {
      const state = await channel.storageState();

      if (options.path) {
        await (0, _utils.mkdirIfNeeded)(options.path);
        await _fs.default.promises.writeFile(options.path, JSON.stringify(state, undefined, 2), 'utf8');
      }

      return state;
    });
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
    return this._wrapApiCall(async channel => {
      const result = await channel.newCDPSession(page instanceof _page.Page ? {
        page: page._channel
      } : {
        frame: page._channel
      });
      return _cdpSession.CDPSession.from(result.session);
    });
  }

  _onClose() {
    var _this$_browserType, _this$_browserType$_c;

    if (this._browser) this._browser._contexts.delete(this);
    (_this$_browserType = this._browserType) === null || _this$_browserType === void 0 ? void 0 : (_this$_browserType$_c = _this$_browserType._contexts) === null || _this$_browserType$_c === void 0 ? void 0 : _this$_browserType$_c.delete(this);
    this.emit(_events.Events.BrowserContext.Close, this);
  }

  async close() {
    try {
      await this._wrapApiCall(async channel => {
        var _this$_browserType2, _this$_browserType2$_;

        await ((_this$_browserType2 = this._browserType) === null || _this$_browserType2 === void 0 ? void 0 : (_this$_browserType2$_ = _this$_browserType2._onWillCloseContext) === null || _this$_browserType2$_ === void 0 ? void 0 : _this$_browserType2$_.call(_this$_browserType2, this));

        if (this._options.recordHar) {
          const har = await this._channel.harExport();

          const artifact = _artifact.Artifact.from(har.artifact);

          await artifact.saveAs(this._options.recordHar.path);
          await artifact.delete();
        }

        await channel.close();
        await this._closedPromise;
      });
    } catch (e) {
      if ((0, _errors.isSafeCloseError)(e)) return;
      throw e;
    }
  }

  async _enableRecorder(params) {
    await this._channel.recorderSupplementEnable(params);
  }

}

exports.BrowserContext = BrowserContext;

async function prepareBrowserContextParams(options) {
  if (options.videoSize && !options.videosPath) throw new Error(`"videoSize" option requires "videosPath" to be specified`);
  if (options.extraHTTPHeaders) network.validateHeaders(options.extraHTTPHeaders);
  const contextParams = { ...options,
    viewport: options.viewport === null ? undefined : options.viewport,
    noDefaultViewport: options.viewport === null,
    extraHTTPHeaders: options.extraHTTPHeaders ? (0, _utils.headersObjectToArray)(options.extraHTTPHeaders) : undefined,
    storageState: typeof options.storageState === 'string' ? JSON.parse(await _fs.default.promises.readFile(options.storageState, 'utf8')) : options.storageState
  };

  if (!contextParams.recordVideo && options.videosPath) {
    contextParams.recordVideo = {
      dir: options.videosPath,
      size: options.videoSize
    };
  }

  return contextParams;
}