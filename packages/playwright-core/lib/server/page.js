"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Worker = exports.PageBinding = exports.Page = void 0;
var frames = _interopRequireWildcard(require("./frames"));
var input = _interopRequireWildcard(require("./input"));
var js = _interopRequireWildcard(require("./javascript"));
var network = _interopRequireWildcard(require("./network"));
var _screenshotter = require("./screenshotter");
var _timeoutSettings = require("../common/timeoutSettings");
var _browserContext = require("./browserContext");
var _console = require("./console");
var accessibility = _interopRequireWildcard(require("./accessibility"));
var _fileChooser = require("./fileChooser");
var _progress = require("./progress");
var _utils = require("../utils");
var _manualPromise = require("../utils/manualPromise");
var _debugLogger = require("../common/debugLogger");
var _comparators = require("../utils/comparators");
var _instrumentation = require("./instrumentation");
var _selectorParser = require("./isomorphic/selectorParser");
var _utilityScriptSerializers = require("./isomorphic/utilityScriptSerializers");
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

class Page extends _instrumentation.SdkObject {
  // Aiming at 25 fps by default - each frame is 40ms, but we give some slack with 35ms.
  // When throttling for tracing, 200ms between frames, except for 10 frames around the action.

  constructor(delegate, browserContext) {
    super(browserContext, 'page');
    this._closedState = 'open';
    this._closedPromise = new _manualPromise.ManualPromise();
    this._disconnected = false;
    this._initialized = false;
    this._disconnectedPromise = new _manualPromise.ManualPromise();
    this._crashedPromise = new _manualPromise.ManualPromise();
    this._browserContext = void 0;
    this.keyboard = void 0;
    this.mouse = void 0;
    this.touchscreen = void 0;
    this._timeoutSettings = void 0;
    this._delegate = void 0;
    this._emulatedSize = void 0;
    this._extraHTTPHeaders = void 0;
    this._emulatedMedia = {};
    this._interceptFileChooser = false;
    this._pageBindings = new Map();
    this.initScripts = [];
    this._screenshotter = void 0;
    this._frameManager = void 0;
    this.accessibility = void 0;
    this._workers = new Map();
    this.pdf = void 0;
    this.coverage = void 0;
    this._clientRequestInterceptor = void 0;
    this._serverRequestInterceptor = void 0;
    this._ownedContext = void 0;
    this.selectors = void 0;
    this._pageIsError = void 0;
    this._video = null;
    this._opener = void 0;
    this._isServerSideOnly = false;
    this._frameThrottler = new FrameThrottler(10, 35, 200);
    this.attribution.page = this;
    this._delegate = delegate;
    this._browserContext = browserContext;
    this.accessibility = new accessibility.Accessibility(delegate.getAccessibilityTree.bind(delegate));
    this.keyboard = new input.Keyboard(delegate.rawKeyboard, this);
    this.mouse = new input.Mouse(delegate.rawMouse, this);
    this.touchscreen = new input.Touchscreen(delegate.rawTouchscreen, this);
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings(browserContext._timeoutSettings);
    this._screenshotter = new _screenshotter.Screenshotter(this);
    this._frameManager = new frames.FrameManager(this);
    if (delegate.pdf) this.pdf = delegate.pdf.bind(delegate);
    this.coverage = delegate.coverage ? delegate.coverage() : null;
    this.selectors = browserContext.selectors();
  }
  async initOpener(opener) {
    if (!opener) return;
    const openerPage = await opener.pageOrError();
    if (openerPage instanceof Page && !openerPage.isClosed()) this._opener = openerPage;
  }
  reportAsNew(error = undefined, contextEvent = _browserContext.BrowserContext.Events.Page) {
    if (error) {
      // Initialization error could have happened because of
      // context/browser closure. Just ignore the page.
      if (this._browserContext.isClosingOrClosed()) return;
      this._setIsError(error);
    }
    this._initialized = true;
    this.emitOnContext(contextEvent, this);
    // I may happen that page initialization finishes after Close event has already been sent,
    // in that case we fire another Close event to ensure that each reported Page will have
    // corresponding Close event after it is reported on the context.
    if (this.isClosed()) this.emit(Page.Events.Close);
    this.instrumentation.onPageOpen(this);
  }
  initializedOrUndefined() {
    return this._initialized ? this : undefined;
  }
  emitOnContext(event, ...args) {
    if (this._isServerSideOnly) return;
    this._browserContext.emit(event, ...args);
  }
  async resetForReuse(metadata) {
    this.setDefaultNavigationTimeout(undefined);
    this.setDefaultTimeout(undefined);
    await this._removeExposedBindings();
    await this._removeInitScripts();
    await this.setClientRequestInterceptor(undefined);
    await this._setServerRequestInterceptor(undefined);
    await this.setFileChooserIntercepted(false);
    // Re-navigate once init scripts are gone.
    await this.mainFrame().goto(metadata, 'about:blank');
    this._emulatedSize = undefined;
    this._emulatedMedia = {};
    this._extraHTTPHeaders = undefined;
    this._interceptFileChooser = false;
    await Promise.all([this._delegate.updateEmulatedViewportSize(true), this._delegate.updateEmulateMedia(), this._delegate.updateFileChooserInterception()]);
  }
  _didClose() {
    this._frameManager.dispose();
    this._frameThrottler.dispose();
    (0, _utils.assert)(this._closedState !== 'closed', 'Page closed twice');
    this._closedState = 'closed';
    this.emit(Page.Events.Close);
    this._closedPromise.resolve();
    this.instrumentation.onPageClose(this);
  }
  _didCrash() {
    this._frameManager.dispose();
    this._frameThrottler.dispose();
    this.emit(Page.Events.Crash);
    this._crashedPromise.resolve(new Error('Page crashed'));
    this.instrumentation.onPageClose(this);
  }
  _didDisconnect() {
    this._frameManager.dispose();
    this._frameThrottler.dispose();
    (0, _utils.assert)(!this._disconnected, 'Page disconnected twice');
    this._disconnected = true;
    this._disconnectedPromise.resolve(new Error('Page closed'));
  }
  async _onFileChooserOpened(handle) {
    let multiple;
    try {
      multiple = await handle.evaluate(element => !!element.multiple);
    } catch (e) {
      // Frame/context may be gone during async processing. Do not throw.
      return;
    }
    if (!this.listenerCount(Page.Events.FileChooser)) {
      handle.dispose();
      return;
    }
    const fileChooser = new _fileChooser.FileChooser(this, handle, multiple);
    this.emit(Page.Events.FileChooser, fileChooser);
  }
  context() {
    return this._browserContext;
  }
  opener() {
    return this._opener;
  }
  mainFrame() {
    return this._frameManager.mainFrame();
  }
  frames() {
    return this._frameManager.frames();
  }
  setDefaultNavigationTimeout(timeout) {
    this._timeoutSettings.setDefaultNavigationTimeout(timeout);
  }
  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);
  }
  async exposeBinding(name, needsHandle, playwrightBinding) {
    if (this._pageBindings.has(name)) throw new Error(`Function "${name}" has been already registered`);
    if (this._browserContext._pageBindings.has(name)) throw new Error(`Function "${name}" has been already registered in the browser context`);
    const binding = new PageBinding(name, playwrightBinding, needsHandle);
    this._pageBindings.set(name, binding);
    await this._delegate.exposeBinding(binding);
  }
  async _removeExposedBindings() {
    for (const key of this._pageBindings.keys()) {
      if (!key.startsWith('__pw')) this._pageBindings.delete(key);
    }
    await this._delegate.removeExposedBindings();
  }
  setExtraHTTPHeaders(headers) {
    this._extraHTTPHeaders = headers;
    return this._delegate.updateExtraHTTPHeaders();
  }
  extraHTTPHeaders() {
    return this._extraHTTPHeaders;
  }
  async _onBindingCalled(payload, context) {
    if (this._disconnected || this._closedState === 'closed') return;
    await PageBinding.dispatch(this, payload, context);
  }
  _addConsoleMessage(type, args, location, text) {
    const message = new _console.ConsoleMessage(this, type, text, args, location);
    const intercepted = this._frameManager.interceptConsoleMessage(message);
    if (intercepted || !this.listenerCount(Page.Events.Console)) args.forEach(arg => arg.dispose());else this.emit(Page.Events.Console, message);
  }
  async reload(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(progress => this.mainFrame().raceNavigationAction(progress, options, async () => {
      // Note: waitForNavigation may fail before we get response to reload(),
      // so we should await it immediately.
      const [response] = await Promise.all([
      // Reload must be a new document, and should not be confused with a stray pushState.
      this.mainFrame()._waitForNavigation(progress, true /* requiresNewDocument */, options), this._delegate.reload()]);
      return response;
    }), this._timeoutSettings.navigationTimeout(options));
  }
  async goBack(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(progress => this.mainFrame().raceNavigationAction(progress, options, async () => {
      // Note: waitForNavigation may fail before we get response to goBack,
      // so we should catch it immediately.
      let error;
      const waitPromise = this.mainFrame()._waitForNavigation(progress, false /* requiresNewDocument */, options).catch(e => {
        error = e;
        return null;
      });
      const result = await this._delegate.goBack();
      if (!result) return null;
      const response = await waitPromise;
      if (error) throw error;
      return response;
    }), this._timeoutSettings.navigationTimeout(options));
  }
  async goForward(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(progress => this.mainFrame().raceNavigationAction(progress, options, async () => {
      // Note: waitForNavigation may fail before we get response to goForward,
      // so we should catch it immediately.
      let error;
      const waitPromise = this.mainFrame()._waitForNavigation(progress, false /* requiresNewDocument */, options).catch(e => {
        error = e;
        return null;
      });
      const result = await this._delegate.goForward();
      if (!result) return null;
      const response = await waitPromise;
      if (error) throw error;
      return response;
    }), this._timeoutSettings.navigationTimeout(options));
  }
  async emulateMedia(options) {
    if (options.media !== undefined) this._emulatedMedia.media = options.media;
    if (options.colorScheme !== undefined) this._emulatedMedia.colorScheme = options.colorScheme;
    if (options.reducedMotion !== undefined) this._emulatedMedia.reducedMotion = options.reducedMotion;
    if (options.forcedColors !== undefined) this._emulatedMedia.forcedColors = options.forcedColors;
    await this._delegate.updateEmulateMedia();
  }
  emulatedMedia() {
    var _contextOptions$color, _contextOptions$reduc, _contextOptions$force;
    const contextOptions = this._browserContext._options;
    return {
      media: this._emulatedMedia.media || 'no-override',
      colorScheme: this._emulatedMedia.colorScheme !== undefined ? this._emulatedMedia.colorScheme : (_contextOptions$color = contextOptions.colorScheme) !== null && _contextOptions$color !== void 0 ? _contextOptions$color : 'light',
      reducedMotion: this._emulatedMedia.reducedMotion !== undefined ? this._emulatedMedia.reducedMotion : (_contextOptions$reduc = contextOptions.reducedMotion) !== null && _contextOptions$reduc !== void 0 ? _contextOptions$reduc : 'no-preference',
      forcedColors: this._emulatedMedia.forcedColors !== undefined ? this._emulatedMedia.forcedColors : (_contextOptions$force = contextOptions.forcedColors) !== null && _contextOptions$force !== void 0 ? _contextOptions$force : 'none'
    };
  }
  async setViewportSize(viewportSize) {
    this._emulatedSize = {
      viewport: {
        ...viewportSize
      },
      screen: {
        ...viewportSize
      }
    };
    await this._delegate.updateEmulatedViewportSize();
  }
  viewportSize() {
    var _this$emulatedSize;
    return ((_this$emulatedSize = this.emulatedSize()) === null || _this$emulatedSize === void 0 ? void 0 : _this$emulatedSize.viewport) || null;
  }
  emulatedSize() {
    if (this._emulatedSize) return this._emulatedSize;
    const contextOptions = this._browserContext._options;
    return contextOptions.viewport ? {
      viewport: contextOptions.viewport,
      screen: contextOptions.screen || contextOptions.viewport
    } : null;
  }
  async bringToFront() {
    await this._delegate.bringToFront();
  }
  async addInitScript(source) {
    this.initScripts.push(source);
    await this._delegate.addInitScript(source);
  }
  async _removeInitScripts() {
    this.initScripts.splice(0, this.initScripts.length);
    await this._delegate.removeInitScripts();
  }
  needsRequestInterception() {
    return !!this._clientRequestInterceptor || !!this._serverRequestInterceptor || !!this._browserContext._requestInterceptor;
  }
  async setClientRequestInterceptor(handler) {
    this._clientRequestInterceptor = handler;
    await this._delegate.updateRequestInterception();
  }
  async _setServerRequestInterceptor(handler) {
    this._serverRequestInterceptor = handler;
    await this._delegate.updateRequestInterception();
  }
  async expectScreenshot(metadata, options = {}) {
    const locator = options.locator;
    const rafrafScreenshot = locator ? async (progress, timeout) => {
      return await locator.frame.rafrafTimeoutScreenshotElementWithProgress(progress, locator.selector, timeout, options.screenshotOptions || {});
    } : async (progress, timeout) => {
      await this.mainFrame().rafrafTimeout(timeout);
      return await this._screenshotter.screenshotPage(progress, options.screenshotOptions || {});
    };
    const comparator = (0, _comparators.getComparator)('image/png');
    const controller = new _progress.ProgressController(metadata, this);
    if (!options.expected && options.isNot) return {
      errorMessage: '"not" matcher requires expected result'
    };
    try {
      const format = (0, _screenshotter.validateScreenshotOptions)(options.screenshotOptions || {});
      if (format !== 'png') throw new Error('Only PNG screenshots are supported');
    } catch (error) {
      return {
        errorMessage: error.message
      };
    }
    let intermediateResult = undefined;
    const areEqualScreenshots = (actual, expected, previous) => {
      const comparatorResult = actual && expected ? comparator(actual, expected, options.comparatorOptions) : undefined;
      if (comparatorResult !== undefined && !!comparatorResult === !!options.isNot) return true;
      if (comparatorResult) intermediateResult = {
        errorMessage: comparatorResult.errorMessage,
        diff: comparatorResult.diff,
        actual,
        previous
      };
      return false;
    };
    const callTimeout = this._timeoutSettings.timeout(options);
    return controller.run(async progress => {
      let actual;
      let previous;
      const pollIntervals = [0, 100, 250, 500];
      progress.log(`${metadata.apiName}${callTimeout ? ` with timeout ${callTimeout}ms` : ''}`);
      if (options.expected) progress.log(`  verifying given screenshot expectation`);else progress.log(`  generating new stable screenshot expectation`);
      let isFirstIteration = true;
      while (true) {
        var _pollIntervals$shift;
        progress.throwIfAborted();
        if (this.isClosed()) throw new Error('The page has closed');
        const screenshotTimeout = (_pollIntervals$shift = pollIntervals.shift()) !== null && _pollIntervals$shift !== void 0 ? _pollIntervals$shift : 1000;
        if (screenshotTimeout) progress.log(`waiting ${screenshotTimeout}ms before taking screenshot`);
        previous = actual;
        actual = await rafrafScreenshot(progress, screenshotTimeout).catch(e => {
          progress.log(`failed to take screenshot - ` + e.message);
          return undefined;
        });
        if (!actual) continue;
        // Compare against expectation for the first iteration.
        const expectation = options.expected && isFirstIteration ? options.expected : previous;
        if (areEqualScreenshots(actual, expectation, previous)) break;
        if (intermediateResult) progress.log(intermediateResult.errorMessage);
        isFirstIteration = false;
      }
      if (!isFirstIteration) progress.log(`captured a stable screenshot`);
      if (!options.expected) return {
        actual
      };
      if (isFirstIteration) {
        progress.log(`screenshot matched expectation`);
        return {};
      }
      if (areEqualScreenshots(actual, options.expected, previous)) {
        progress.log(`screenshot matched expectation`);
        return {};
      }
      throw new Error(intermediateResult.errorMessage);
    }, callTimeout).catch(e => {
      // Q: Why not throw upon isSessionClosedError(e) as in other places?
      // A: We want user to receive a friendly diff between actual and expected/previous.
      if (js.isJavaScriptErrorInEvaluate(e) || (0, _selectorParser.isInvalidSelectorError)(e)) throw e;
      return {
        log: e.message ? [...metadata.log, e.message] : metadata.log,
        ...intermediateResult,
        errorMessage: e.message
      };
    });
  }
  async screenshot(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(progress => this._screenshotter.screenshotPage(progress, options), this._timeoutSettings.timeout(options));
  }
  async close(metadata, options) {
    if (this._closedState === 'closed') return;
    const runBeforeUnload = !!options && !!options.runBeforeUnload;
    if (this._closedState !== 'closing') {
      this._closedState = 'closing';
      (0, _utils.assert)(!this._disconnected, 'Target closed');
      // This might throw if the browser context containing the page closes
      // while we are trying to close the page.
      await this._delegate.closePage(runBeforeUnload).catch(e => _debugLogger.debugLogger.log('error', e));
    }
    if (!runBeforeUnload) await this._closedPromise;
    if (this._ownedContext) await this._ownedContext.close(metadata);
  }
  _setIsError(error) {
    this._pageIsError = error;
    this._frameManager.createDummyMainFrameIfNeeded();
  }
  isClosed() {
    return this._closedState === 'closed';
  }
  _addWorker(workerId, worker) {
    this._workers.set(workerId, worker);
    this.emit(Page.Events.Worker, worker);
  }
  _removeWorker(workerId) {
    const worker = this._workers.get(workerId);
    if (!worker) return;
    worker.didClose();
    this._workers.delete(workerId);
  }
  _clearWorkers() {
    for (const [workerId, worker] of this._workers) {
      worker.didClose();
      this._workers.delete(workerId);
    }
  }
  async setFileChooserIntercepted(enabled) {
    this._interceptFileChooser = enabled;
    await this._delegate.updateFileChooserInterception();
  }
  fileChooserIntercepted() {
    return this._interceptFileChooser;
  }
  frameNavigatedToNewDocument(frame) {
    this.emit(Page.Events.InternalFrameNavigatedToNewDocument, frame);
    const url = frame.url();
    if (!url.startsWith('http')) return;
    const purl = network.parsedURL(url);
    if (purl) this._browserContext.addVisitedOrigin(purl.origin);
  }
  allBindings() {
    return [...this._browserContext._pageBindings.values(), ...this._pageBindings.values()];
  }
  getBinding(name) {
    return this._pageBindings.get(name) || this._browserContext._pageBindings.get(name);
  }
  setScreencastOptions(options) {
    this._delegate.setScreencastOptions(options).catch(e => _debugLogger.debugLogger.log('error', e));
    this._frameThrottler.setThrottlingEnabled(!!options);
  }
  throttleScreencastFrameAck(ack) {
    // Don't ack immediately, tracing has smart throttling logic that is implemented here.
    this._frameThrottler.ack(ack);
  }
  temporarlyDisableTracingScreencastThrottling() {
    this._frameThrottler.recharge();
  }
  firePageError(error) {
    this.emit(Page.Events.PageError, error);
  }
  parseSelector(selector, options) {
    const strict = typeof (options === null || options === void 0 ? void 0 : options.strict) === 'boolean' ? options.strict : !!this.context()._options.strictSelectors;
    return this.selectors.parseSelector(selector, strict);
  }
  async hideHighlight() {
    await Promise.all(this.frames().map(frame => frame.hideHighlight().catch(() => {})));
  }
  markAsServerSideOnly() {
    this._isServerSideOnly = true;
  }
}
exports.Page = Page;
Page.Events = {
  Close: 'close',
  Crash: 'crash',
  Console: 'console',
  Dialog: 'dialog',
  Download: 'download',
  FileChooser: 'filechooser',
  // Can't use just 'error' due to node.js special treatment of error events.
  // @see https://nodejs.org/api/events.html#events_error_events
  PageError: 'pageerror',
  FrameAttached: 'frameattached',
  FrameDetached: 'framedetached',
  InternalFrameNavigatedToNewDocument: 'internalframenavigatedtonewdocument',
  ScreencastFrame: 'screencastframe',
  Video: 'video',
  WebSocket: 'websocket',
  Worker: 'worker'
};
class Worker extends _instrumentation.SdkObject {
  constructor(parent, url) {
    super(parent, 'worker');
    this._url = void 0;
    this._executionContextPromise = void 0;
    this._executionContextCallback = void 0;
    this._existingExecutionContext = null;
    this._url = url;
    this._executionContextCallback = () => {};
    this._executionContextPromise = new Promise(x => this._executionContextCallback = x);
  }
  _createExecutionContext(delegate) {
    this._existingExecutionContext = new js.ExecutionContext(this, delegate);
    this._executionContextCallback(this._existingExecutionContext);
  }
  url() {
    return this._url;
  }
  didClose() {
    if (this._existingExecutionContext) this._existingExecutionContext.contextDestroyed(new Error('Worker was closed'));
    this.emit(Worker.Events.Close, this);
  }
  async evaluateExpression(expression, isFunction, arg) {
    return js.evaluateExpression(await this._executionContextPromise, expression, {
      returnByValue: true,
      isFunction
    }, arg);
  }
  async evaluateExpressionHandle(expression, isFunction, arg) {
    return js.evaluateExpression(await this._executionContextPromise, expression, {
      returnByValue: false,
      isFunction
    }, arg);
  }
}
exports.Worker = Worker;
Worker.Events = {
  Close: 'close'
};
class PageBinding {
  constructor(name, playwrightFunction, needsHandle) {
    this.name = void 0;
    this.playwrightFunction = void 0;
    this.source = void 0;
    this.needsHandle = void 0;
    this.name = name;
    this.playwrightFunction = playwrightFunction;
    this.source = `(${addPageBinding.toString()})(${JSON.stringify(name)}, ${needsHandle}, (${_utilityScriptSerializers.source})())`;
    this.needsHandle = needsHandle;
  }
  static async dispatch(page, payload, context) {
    const {
      name,
      seq,
      serializedArgs
    } = JSON.parse(payload);
    try {
      (0, _utils.assert)(context.world);
      const binding = page.getBinding(name);
      let result;
      if (binding.needsHandle) {
        const handle = await context.evaluateHandle(takeHandle, {
          name,
          seq
        }).catch(e => null);
        result = await binding.playwrightFunction({
          frame: context.frame,
          page,
          context: page._browserContext
        }, handle);
      } else {
        const args = serializedArgs.map(a => (0, _utilityScriptSerializers.parseEvaluationResultValue)(a));
        result = await binding.playwrightFunction({
          frame: context.frame,
          page,
          context: page._browserContext
        }, ...args);
      }
      context.evaluate(deliverResult, {
        name,
        seq,
        result
      }).catch(e => _debugLogger.debugLogger.log('error', e));
    } catch (error) {
      if ((0, _utils.isError)(error)) context.evaluate(deliverError, {
        name,
        seq,
        message: error.message,
        stack: error.stack
      }).catch(e => _debugLogger.debugLogger.log('error', e));else context.evaluate(deliverErrorValue, {
        name,
        seq,
        error
      }).catch(e => _debugLogger.debugLogger.log('error', e));
    }
    function takeHandle(arg) {
      const handle = globalThis[arg.name]['handles'].get(arg.seq);
      globalThis[arg.name]['handles'].delete(arg.seq);
      return handle;
    }
    function deliverResult(arg) {
      globalThis[arg.name]['callbacks'].get(arg.seq).resolve(arg.result);
      globalThis[arg.name]['callbacks'].delete(arg.seq);
    }
    function deliverError(arg) {
      const error = new Error(arg.message);
      error.stack = arg.stack;
      globalThis[arg.name]['callbacks'].get(arg.seq).reject(error);
      globalThis[arg.name]['callbacks'].delete(arg.seq);
    }
    function deliverErrorValue(arg) {
      globalThis[arg.name]['callbacks'].get(arg.seq).reject(arg.error);
      globalThis[arg.name]['callbacks'].delete(arg.seq);
    }
  }
}
exports.PageBinding = PageBinding;
function addPageBinding(bindingName, needsHandle, utilityScriptSerializers) {
  const binding = globalThis[bindingName];
  if (binding.__installed) return;
  globalThis[bindingName] = (...args) => {
    const me = globalThis[bindingName];
    if (needsHandle && args.slice(1).some(arg => arg !== undefined)) throw new Error(`exposeBindingHandle supports a single argument, ${args.length} received`);
    let callbacks = me['callbacks'];
    if (!callbacks) {
      callbacks = new Map();
      me['callbacks'] = callbacks;
    }
    const seq = (me['lastSeq'] || 0) + 1;
    me['lastSeq'] = seq;
    let handles = me['handles'];
    if (!handles) {
      handles = new Map();
      me['handles'] = handles;
    }
    const promise = new Promise((resolve, reject) => callbacks.set(seq, {
      resolve,
      reject
    }));
    let payload;
    if (needsHandle) {
      handles.set(seq, args[0]);
      payload = {
        name: bindingName,
        seq
      };
    } else {
      const serializedArgs = args.map(a => utilityScriptSerializers.serializeAsCallArgument(a, v => {
        return {
          fallThrough: v
        };
      }));
      payload = {
        name: bindingName,
        seq,
        serializedArgs
      };
    }
    binding(JSON.stringify(payload));
    return promise;
  };
  globalThis[bindingName].__installed = true;
}
class FrameThrottler {
  constructor(nonThrottledFrames, defaultInterval, throttlingInterval) {
    this._acks = [];
    this._defaultInterval = void 0;
    this._throttlingInterval = void 0;
    this._nonThrottledFrames = void 0;
    this._budget = void 0;
    this._throttlingEnabled = false;
    this._timeoutId = void 0;
    this._nonThrottledFrames = nonThrottledFrames;
    this._budget = nonThrottledFrames;
    this._defaultInterval = defaultInterval;
    this._throttlingInterval = throttlingInterval;
    this._tick();
  }
  dispose() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = undefined;
    }
  }
  setThrottlingEnabled(enabled) {
    this._throttlingEnabled = enabled;
  }
  recharge() {
    // Send all acks, reset budget.
    for (const ack of this._acks) ack();
    this._acks = [];
    this._budget = this._nonThrottledFrames;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._tick();
    }
  }
  ack(ack) {
    if (!this._timeoutId) {
      // Already disposed.
      ack();
      return;
    }
    this._acks.push(ack);
  }
  _tick() {
    const ack = this._acks.shift();
    if (ack) {
      --this._budget;
      ack();
    }
    if (this._throttlingEnabled && this._budget <= 0) {
      // Non-throttled frame budget is exceeded. Next ack will be throttled.
      this._timeoutId = setTimeout(() => this._tick(), this._throttlingInterval);
    } else {
      // Either not throttling, or still under budget. Next ack will be after the default timeout.
      this._timeoutId = setTimeout(() => this._tick(), this._defaultInterval);
    }
  }
}