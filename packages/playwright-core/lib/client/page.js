"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Page = exports.BindingCall = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _errors = require("../common/errors");
var _netUtils = require("../common/netUtils");
var _timeoutSettings = require("../common/timeoutSettings");
var _serializers = require("../protocol/serializers");
var _utils = require("../utils");
var _fileUtils = require("../utils/fileUtils");
var _accessibility = require("./accessibility");
var _artifact = require("./artifact");
var _channelOwner = require("./channelOwner");
var _clientHelper = require("./clientHelper");
var _consoleMessage = require("./consoleMessage");
var _coverage = require("./coverage");
var _dialog = require("./dialog");
var _download = require("./download");
var _elementHandle = require("./elementHandle");
var _events = require("./events");
var _fileChooser = require("./fileChooser");
var _frame = require("./frame");
var _harRouter = require("./harRouter");
var _input = require("./input");
var _jsHandle = require("./jsHandle");
var _network = require("./network");
var _video = require("./video");
var _waiter = require("./waiter");
var _worker = require("./worker");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
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

class Page extends _channelOwner.ChannelOwner {
  static from(page) {
    return page._object;
  }
  static fromNullable(page) {
    return page ? Page.from(page) : null;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._browserContext = void 0;
    this._ownedContext = void 0;
    this._mainFrame = void 0;
    this._frames = new Set();
    this._workers = new Set();
    this._closed = false;
    this._closedOrCrashedPromise = void 0;
    this._viewportSize = void 0;
    this._routes = [];
    this.accessibility = void 0;
    this.coverage = void 0;
    this.keyboard = void 0;
    this.mouse = void 0;
    this.request = void 0;
    this.touchscreen = void 0;
    this._bindings = new Map();
    this._timeoutSettings = void 0;
    this._video = null;
    this._opener = void 0;
    this._browserContext = parent;
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings(this._browserContext._timeoutSettings);
    this.accessibility = new _accessibility.Accessibility(this._channel);
    this.keyboard = new _input.Keyboard(this);
    this.mouse = new _input.Mouse(this);
    this.request = this._browserContext.request;
    this.touchscreen = new _input.Touchscreen(this);
    this._mainFrame = _frame.Frame.from(initializer.mainFrame);
    this._mainFrame._page = this;
    this._frames.add(this._mainFrame);
    this._viewportSize = initializer.viewportSize || null;
    this._closed = initializer.isClosed;
    this._opener = Page.fromNullable(initializer.opener);
    this._channel.on('bindingCall', ({
      binding
    }) => this._onBinding(BindingCall.from(binding)));
    this._channel.on('close', () => this._onClose());
    this._channel.on('console', ({
      message
    }) => this.emit(_events.Events.Page.Console, _consoleMessage.ConsoleMessage.from(message)));
    this._channel.on('crash', () => this._onCrash());
    this._channel.on('dialog', ({
      dialog
    }) => {
      const dialogObj = _dialog.Dialog.from(dialog);
      if (!this.emit(_events.Events.Page.Dialog, dialogObj)) {
        if (dialogObj.type() === 'beforeunload') dialog.accept({}).catch(() => {});else dialog.dismiss().catch(() => {});
      }
    });
    this._channel.on('download', ({
      url,
      suggestedFilename,
      artifact
    }) => {
      const artifactObject = _artifact.Artifact.from(artifact);
      this.emit(_events.Events.Page.Download, new _download.Download(this, url, suggestedFilename, artifactObject));
    });
    this._channel.on('fileChooser', ({
      element,
      isMultiple
    }) => this.emit(_events.Events.Page.FileChooser, new _fileChooser.FileChooser(this, _elementHandle.ElementHandle.from(element), isMultiple)));
    this._channel.on('frameAttached', ({
      frame
    }) => this._onFrameAttached(_frame.Frame.from(frame)));
    this._channel.on('frameDetached', ({
      frame
    }) => this._onFrameDetached(_frame.Frame.from(frame)));
    this._channel.on('pageError', ({
      error
    }) => this.emit(_events.Events.Page.PageError, (0, _serializers.parseError)(error)));
    this._channel.on('route', ({
      route
    }) => this._onRoute(_network.Route.from(route)));
    this._channel.on('video', ({
      artifact
    }) => {
      const artifactObject = _artifact.Artifact.from(artifact);
      this._forceVideo()._artifactReady(artifactObject);
    });
    this._channel.on('webSocket', ({
      webSocket
    }) => this.emit(_events.Events.Page.WebSocket, _network.WebSocket.from(webSocket)));
    this._channel.on('worker', ({
      worker
    }) => this._onWorker(_worker.Worker.from(worker)));
    this.coverage = new _coverage.Coverage(this._channel);
    this._closedOrCrashedPromise = Promise.race([new Promise(f => this.once(_events.Events.Page.Close, f)), new Promise(f => this.once(_events.Events.Page.Crash, f))]);
    this._setEventToSubscriptionMapping(new Map([[_events.Events.Page.Request, 'request'], [_events.Events.Page.Response, 'response'], [_events.Events.Page.RequestFinished, 'requestFinished'], [_events.Events.Page.RequestFailed, 'requestFailed'], [_events.Events.Page.FileChooser, 'fileChooser']]));
  }
  _onFrameAttached(frame) {
    frame._page = this;
    this._frames.add(frame);
    if (frame._parentFrame) frame._parentFrame._childFrames.add(frame);
    this.emit(_events.Events.Page.FrameAttached, frame);
  }
  _onFrameDetached(frame) {
    this._frames.delete(frame);
    frame._detached = true;
    if (frame._parentFrame) frame._parentFrame._childFrames.delete(frame);
    this.emit(_events.Events.Page.FrameDetached, frame);
  }
  async _onRoute(route) {
    const routeHandlers = this._routes.slice();
    for (const routeHandler of routeHandlers) {
      if (!routeHandler.matches(route.request().url())) continue;
      if (routeHandler.willExpire()) this._routes.splice(this._routes.indexOf(routeHandler), 1);
      const handled = await routeHandler.handle(route);
      if (!this._routes.length) this._wrapApiCall(() => this._disableInterception(), true).catch(() => {});
      if (handled) return;
    }
    await this._browserContext._onRoute(route);
  }
  async _onBinding(bindingCall) {
    const func = this._bindings.get(bindingCall._initializer.name);
    if (func) {
      await bindingCall.call(func);
      return;
    }
    await this._browserContext._onBinding(bindingCall);
  }
  _onWorker(worker) {
    this._workers.add(worker);
    worker._page = this;
    this.emit(_events.Events.Page.Worker, worker);
  }
  _onClose() {
    this._closed = true;
    this._browserContext._pages.delete(this);
    this._browserContext._backgroundPages.delete(this);
    this.emit(_events.Events.Page.Close, this);
  }
  _onCrash() {
    this.emit(_events.Events.Page.Crash, this);
  }
  context() {
    return this._browserContext;
  }
  async opener() {
    if (!this._opener || this._opener.isClosed()) return null;
    return this._opener;
  }
  mainFrame() {
    return this._mainFrame;
  }
  frame(frameSelector) {
    const name = (0, _utils.isString)(frameSelector) ? frameSelector : frameSelector.name;
    const url = (0, _utils.isObject)(frameSelector) ? frameSelector.url : undefined;
    (0, _utils.assert)(name || url, 'Either name or url matcher should be specified');
    return this.frames().find(f => {
      if (name) return f.name() === name;
      return (0, _netUtils.urlMatches)(this._browserContext._options.baseURL, f.url(), url);
    }) || null;
  }
  frames() {
    return [...this._frames];
  }
  setDefaultNavigationTimeout(timeout) {
    this._timeoutSettings.setDefaultNavigationTimeout(timeout);
    this._wrapApiCall(async () => {
      this._channel.setDefaultNavigationTimeoutNoReply({
        timeout
      }).catch(() => {});
    }, true);
  }
  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);
    this._wrapApiCall(async () => {
      this._channel.setDefaultTimeoutNoReply({
        timeout
      }).catch(() => {});
    }, true);
  }
  _forceVideo() {
    if (!this._video) this._video = new _video.Video(this, this._connection);
    return this._video;
  }
  video() {
    // Note: we are creating Video object lazily, because we do not know
    // BrowserContextOptions when constructing the page - it is assigned
    // too late during launchPersistentContext.
    if (!this._browserContext._options.recordVideo) return null;
    return this._forceVideo();
  }
  async $(selector, options) {
    return this._mainFrame.$(selector, options);
  }
  async waitForSelector(selector, options) {
    return this._mainFrame.waitForSelector(selector, options);
  }
  async dispatchEvent(selector, type, eventInit, options) {
    return this._mainFrame.dispatchEvent(selector, type, eventInit, options);
  }
  async evaluateHandle(pageFunction, arg) {
    (0, _jsHandle.assertMaxArguments)(arguments.length, 2);
    return this._mainFrame.evaluateHandle(pageFunction, arg);
  }
  async $eval(selector, pageFunction, arg) {
    (0, _jsHandle.assertMaxArguments)(arguments.length, 3);
    return this._mainFrame.$eval(selector, pageFunction, arg);
  }
  async $$eval(selector, pageFunction, arg) {
    (0, _jsHandle.assertMaxArguments)(arguments.length, 3);
    return this._mainFrame.$$eval(selector, pageFunction, arg);
  }
  async $$(selector) {
    return this._mainFrame.$$(selector);
  }
  async addScriptTag(options = {}) {
    return this._mainFrame.addScriptTag(options);
  }
  async addStyleTag(options = {}) {
    return this._mainFrame.addStyleTag(options);
  }
  async exposeFunction(name, callback) {
    await this._channel.exposeBinding({
      name
    });
    const binding = (source, ...args) => callback(...args);
    this._bindings.set(name, binding);
  }
  async exposeBinding(name, callback, options = {}) {
    await this._channel.exposeBinding({
      name,
      needsHandle: options.handle
    });
    this._bindings.set(name, callback);
  }
  async setExtraHTTPHeaders(headers) {
    (0, _network.validateHeaders)(headers);
    await this._channel.setExtraHTTPHeaders({
      headers: (0, _utils.headersObjectToArray)(headers)
    });
  }
  url() {
    return this._mainFrame.url();
  }
  async content() {
    return this._mainFrame.content();
  }
  async setContent(html, options) {
    return this._mainFrame.setContent(html, options);
  }
  async goto(url, options) {
    return this._mainFrame.goto(url, options);
  }
  async reload(options = {}) {
    const waitUntil = (0, _frame.verifyLoadState)('waitUntil', options.waitUntil === undefined ? 'load' : options.waitUntil);
    return _network.Response.fromNullable((await this._channel.reload({
      ...options,
      waitUntil
    })).response);
  }
  async waitForLoadState(state, options) {
    return this._mainFrame.waitForLoadState(state, options);
  }
  async waitForNavigation(options) {
    return this._mainFrame.waitForNavigation(options);
  }
  async waitForURL(url, options) {
    return this._mainFrame.waitForURL(url, options);
  }
  async waitForRequest(urlOrPredicate, options = {}) {
    const predicate = request => {
      if ((0, _utils.isString)(urlOrPredicate) || (0, _utils.isRegExp)(urlOrPredicate)) return (0, _netUtils.urlMatches)(this._browserContext._options.baseURL, request.url(), urlOrPredicate);
      return urlOrPredicate(request);
    };
    const trimmedUrl = trimUrl(urlOrPredicate);
    const logLine = trimmedUrl ? `waiting for request ${trimmedUrl}` : undefined;
    return this._waitForEvent(_events.Events.Page.Request, {
      predicate,
      timeout: options.timeout
    }, logLine);
  }
  async waitForResponse(urlOrPredicate, options = {}) {
    const predicate = response => {
      if ((0, _utils.isString)(urlOrPredicate) || (0, _utils.isRegExp)(urlOrPredicate)) return (0, _netUtils.urlMatches)(this._browserContext._options.baseURL, response.url(), urlOrPredicate);
      return urlOrPredicate(response);
    };
    const trimmedUrl = trimUrl(urlOrPredicate);
    const logLine = trimmedUrl ? `waiting for response ${trimmedUrl}` : undefined;
    return this._waitForEvent(_events.Events.Page.Response, {
      predicate,
      timeout: options.timeout
    }, logLine);
  }
  async waitForEvent(event, optionsOrPredicate = {}) {
    return this._waitForEvent(event, optionsOrPredicate, `waiting for event "${event}"`);
  }
  async _waitForEvent(event, optionsOrPredicate, logLine) {
    return this._wrapApiCall(async () => {
      const timeout = this._timeoutSettings.timeout(typeof optionsOrPredicate === 'function' ? {} : optionsOrPredicate);
      const predicate = typeof optionsOrPredicate === 'function' ? optionsOrPredicate : optionsOrPredicate.predicate;
      const waiter = _waiter.Waiter.createForEvent(this, event);
      if (logLine) waiter.log(logLine);
      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== _events.Events.Page.Crash) waiter.rejectOnEvent(this, _events.Events.Page.Crash, new Error('Page crashed'));
      if (event !== _events.Events.Page.Close) waiter.rejectOnEvent(this, _events.Events.Page.Close, new Error('Page closed'));
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }
  async goBack(options = {}) {
    const waitUntil = (0, _frame.verifyLoadState)('waitUntil', options.waitUntil === undefined ? 'load' : options.waitUntil);
    return _network.Response.fromNullable((await this._channel.goBack({
      ...options,
      waitUntil
    })).response);
  }
  async goForward(options = {}) {
    const waitUntil = (0, _frame.verifyLoadState)('waitUntil', options.waitUntil === undefined ? 'load' : options.waitUntil);
    return _network.Response.fromNullable((await this._channel.goForward({
      ...options,
      waitUntil
    })).response);
  }
  async emulateMedia(options = {}) {
    await this._channel.emulateMedia({
      media: options.media === null ? 'no-override' : options.media,
      colorScheme: options.colorScheme === null ? 'no-override' : options.colorScheme,
      reducedMotion: options.reducedMotion === null ? 'no-override' : options.reducedMotion,
      forcedColors: options.forcedColors === null ? 'no-override' : options.forcedColors
    });
  }
  async setViewportSize(viewportSize) {
    this._viewportSize = viewportSize;
    await this._channel.setViewportSize({
      viewportSize
    });
  }
  viewportSize() {
    return this._viewportSize;
  }
  async evaluate(pageFunction, arg) {
    (0, _jsHandle.assertMaxArguments)(arguments.length, 2);
    return this._mainFrame.evaluate(pageFunction, arg);
  }
  async addInitScript(script, arg) {
    const source = await (0, _clientHelper.evaluationScript)(script, arg);
    await this._channel.addInitScript({
      source
    });
  }
  async route(url, handler, options = {}) {
    this._routes.unshift(new _network.RouteHandler(this._browserContext._options.baseURL, url, handler, options.times));
    if (this._routes.length === 1) await this._channel.setNetworkInterceptionEnabled({
      enabled: true
    });
  }
  async routeFromHAR(har, options = {}) {
    if (options.update) {
      await this._browserContext._recordIntoHAR(har, this, options);
      return;
    }
    const harRouter = await _harRouter.HarRouter.create(this._connection.localUtils(), har, options.notFound || 'abort', {
      urlMatch: options.url
    });
    harRouter.addPageRoute(this);
  }
  async unroute(url, handler) {
    this._routes = this._routes.filter(route => route.url !== url || handler && route.handler !== handler);
    if (!this._routes.length) await this._disableInterception();
  }
  async _disableInterception() {
    await this._channel.setNetworkInterceptionEnabled({
      enabled: false
    });
  }
  async screenshot(options = {}) {
    const copy = {
      ...options,
      mask: undefined
    };
    if (!copy.type) copy.type = (0, _elementHandle.determineScreenshotType)(options);
    if (options.mask) {
      copy.mask = options.mask.map(locator => ({
        frame: locator._frame._channel,
        selector: locator._selector
      }));
    }
    const result = await this._channel.screenshot(copy);
    if (options.path) {
      await (0, _fileUtils.mkdirIfNeeded)(options.path);
      await _fs.default.promises.writeFile(options.path, result.binary);
    }
    return result.binary;
  }
  async _expectScreenshot(customStackTrace, options) {
    return this._wrapApiCall(async () => {
      var _options$screenshotOp, _options$screenshotOp2;
      const mask = (_options$screenshotOp = options.screenshotOptions) !== null && _options$screenshotOp !== void 0 && _options$screenshotOp.mask ? (_options$screenshotOp2 = options.screenshotOptions) === null || _options$screenshotOp2 === void 0 ? void 0 : _options$screenshotOp2.mask.map(locator => ({
        frame: locator._frame._channel,
        selector: locator._selector
      })) : undefined;
      const locator = options.locator ? {
        frame: options.locator._frame._channel,
        selector: options.locator._selector
      } : undefined;
      return await this._channel.expectScreenshot({
        ...options,
        isNot: !!options.isNot,
        locator,
        screenshotOptions: {
          ...options.screenshotOptions,
          mask
        }
      });
    }, false /* isInternal */, customStackTrace);
  }
  async title() {
    return this._mainFrame.title();
  }
  async bringToFront() {
    await this._channel.bringToFront();
  }
  async close(options = {
    runBeforeUnload: undefined
  }) {
    try {
      if (this._ownedContext) await this._ownedContext.close();else await this._channel.close(options);
    } catch (e) {
      if ((0, _errors.isSafeCloseError)(e)) return;
      throw e;
    }
  }
  isClosed() {
    return this._closed;
  }
  async click(selector, options) {
    return this._mainFrame.click(selector, options);
  }
  async dragAndDrop(source, target, options) {
    return this._mainFrame.dragAndDrop(source, target, options);
  }
  async dblclick(selector, options) {
    return this._mainFrame.dblclick(selector, options);
  }
  async tap(selector, options) {
    return this._mainFrame.tap(selector, options);
  }
  async fill(selector, value, options) {
    return this._mainFrame.fill(selector, value, options);
  }
  locator(selector, options) {
    return this.mainFrame().locator(selector, options);
  }
  getByTestId(testId) {
    return this.mainFrame().getByTestId(testId);
  }
  getByAltText(text, options) {
    return this.mainFrame().getByAltText(text, options);
  }
  getByLabel(text, options) {
    return this.mainFrame().getByLabel(text, options);
  }
  getByPlaceholder(text, options) {
    return this.mainFrame().getByPlaceholder(text, options);
  }
  getByText(text, options) {
    return this.mainFrame().getByText(text, options);
  }
  getByTitle(text, options) {
    return this.mainFrame().getByTitle(text, options);
  }
  getByRole(role, options = {}) {
    return this.mainFrame().getByRole(role, options);
  }
  frameLocator(selector) {
    return this.mainFrame().frameLocator(selector);
  }
  async focus(selector, options) {
    return this._mainFrame.focus(selector, options);
  }
  async textContent(selector, options) {
    return this._mainFrame.textContent(selector, options);
  }
  async innerText(selector, options) {
    return this._mainFrame.innerText(selector, options);
  }
  async innerHTML(selector, options) {
    return this._mainFrame.innerHTML(selector, options);
  }
  async getAttribute(selector, name, options) {
    return this._mainFrame.getAttribute(selector, name, options);
  }
  async inputValue(selector, options) {
    return this._mainFrame.inputValue(selector, options);
  }
  async isChecked(selector, options) {
    return this._mainFrame.isChecked(selector, options);
  }
  async isDisabled(selector, options) {
    return this._mainFrame.isDisabled(selector, options);
  }
  async isEditable(selector, options) {
    return this._mainFrame.isEditable(selector, options);
  }
  async isEnabled(selector, options) {
    return this._mainFrame.isEnabled(selector, options);
  }
  async isHidden(selector, options) {
    return this._mainFrame.isHidden(selector, options);
  }
  async isVisible(selector, options) {
    return this._mainFrame.isVisible(selector, options);
  }
  async hover(selector, options) {
    return this._mainFrame.hover(selector, options);
  }
  async selectOption(selector, values, options) {
    return this._mainFrame.selectOption(selector, values, options);
  }
  async setInputFiles(selector, files, options) {
    return this._mainFrame.setInputFiles(selector, files, options);
  }
  async type(selector, text, options) {
    return this._mainFrame.type(selector, text, options);
  }
  async press(selector, key, options) {
    return this._mainFrame.press(selector, key, options);
  }
  async check(selector, options) {
    return this._mainFrame.check(selector, options);
  }
  async uncheck(selector, options) {
    return this._mainFrame.uncheck(selector, options);
  }
  async setChecked(selector, checked, options) {
    return this._mainFrame.setChecked(selector, checked, options);
  }
  async waitForTimeout(timeout) {
    return this._mainFrame.waitForTimeout(timeout);
  }
  async waitForFunction(pageFunction, arg, options) {
    return this._mainFrame.waitForFunction(pageFunction, arg, options);
  }
  workers() {
    return [...this._workers];
  }
  async pause() {
    if (!require('inspector').url()) await this.context()._channel.pause();
  }
  async pdf(options = {}) {
    const transportOptions = {
      ...options
    };
    if (transportOptions.margin) transportOptions.margin = {
      ...transportOptions.margin
    };
    if (typeof options.width === 'number') transportOptions.width = options.width + 'px';
    if (typeof options.height === 'number') transportOptions.height = options.height + 'px';
    for (const margin of ['top', 'right', 'bottom', 'left']) {
      const index = margin;
      if (options.margin && typeof options.margin[index] === 'number') transportOptions.margin[index] = transportOptions.margin[index] + 'px';
    }
    const result = await this._channel.pdf(transportOptions);
    if (options.path) {
      await _fs.default.promises.mkdir(_path.default.dirname(options.path), {
        recursive: true
      });
      await _fs.default.promises.writeFile(options.path, result.pdf);
    }
    return result.pdf;
  }
}
exports.Page = Page;
class BindingCall extends _channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
  }
  async call(func) {
    try {
      const frame = _frame.Frame.from(this._initializer.frame);
      const source = {
        context: frame._page.context(),
        page: frame._page,
        frame
      };
      let result;
      if (this._initializer.handle) result = await func(source, _jsHandle.JSHandle.from(this._initializer.handle));else result = await func(source, ...this._initializer.args.map(_jsHandle.parseResult));
      this._channel.resolve({
        result: (0, _jsHandle.serializeArgument)(result)
      }).catch(() => {});
    } catch (e) {
      this._channel.reject({
        error: (0, _serializers.serializeError)(e)
      }).catch(() => {});
    }
  }
}
exports.BindingCall = BindingCall;
function trimEnd(s) {
  if (s.length > 50) s = s.substring(0, 50) + '\u2026';
  return s;
}
function trimUrl(param) {
  if ((0, _utils.isRegExp)(param)) return `/${trimEnd(param.source)}/${param.flags}`;
  if ((0, _utils.isString)(param)) return `"${trimEnd(param)}"`;
}