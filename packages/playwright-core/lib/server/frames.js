"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NavigationAbortedError = exports.FrameManager = exports.Frame = void 0;
var dom = _interopRequireWildcard(require("./dom"));
var _helper = require("./helper");
var _eventsHelper = require("../utils/eventsHelper");
var js = _interopRequireWildcard(require("./javascript"));
var network = _interopRequireWildcard(require("./network"));
var _page = require("./page");
var types = _interopRequireWildcard(require("./types"));
var _browserContext = require("./browserContext");
var _progress = require("./progress");
var _utils = require("../utils");
var _manualPromise = require("../utils/manualPromise");
var _debugLogger = require("../common/debugLogger");
var _instrumentation = require("./instrumentation");
var _protocolError = require("./protocolError");
var _selectorParser = require("./isomorphic/selectorParser");
var _locatorGenerators = require("./isomorphic/locatorGenerators");
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

class NavigationAbortedError extends Error {
  constructor(documentId, message) {
    super(message);
    this.documentId = void 0;
    this.documentId = documentId;
  }
}
exports.NavigationAbortedError = NavigationAbortedError;
const kDummyFrameId = '<dummy>';
class FrameManager {
  constructor(page) {
    this._page = void 0;
    this._frames = new Map();
    this._mainFrame = void 0;
    this._consoleMessageTags = new Map();
    this._signalBarriers = new Set();
    this._webSockets = new Map();
    this._openedDialogs = new Set();
    this._closeAllOpeningDialogs = false;
    this._page = page;
    this._mainFrame = undefined;
  }
  createDummyMainFrameIfNeeded() {
    if (!this._mainFrame) this.frameAttached(kDummyFrameId, null);
  }
  dispose() {
    for (const frame of this._frames.values()) {
      frame._stopNetworkIdleTimer();
      frame._invalidateNonStallingEvaluations('Target crashed');
    }
  }
  mainFrame() {
    return this._mainFrame;
  }
  frames() {
    const frames = [];
    collect(this._mainFrame);
    return frames;
    function collect(frame) {
      frames.push(frame);
      for (const subframe of frame.childFrames()) collect(subframe);
    }
  }
  frame(frameId) {
    return this._frames.get(frameId) || null;
  }
  frameAttached(frameId, parentFrameId) {
    const parentFrame = parentFrameId ? this._frames.get(parentFrameId) : null;
    if (!parentFrame) {
      if (this._mainFrame) {
        // Update frame id to retain frame identity on cross-process navigation.
        this._frames.delete(this._mainFrame._id);
        this._mainFrame._id = frameId;
      } else {
        (0, _utils.assert)(!this._frames.has(frameId));
        this._mainFrame = new Frame(this._page, frameId, parentFrame);
      }
      this._frames.set(frameId, this._mainFrame);
      return this._mainFrame;
    } else {
      (0, _utils.assert)(!this._frames.has(frameId));
      const frame = new Frame(this._page, frameId, parentFrame);
      this._frames.set(frameId, frame);
      this._page.emit(_page.Page.Events.FrameAttached, frame);
      return frame;
    }
  }
  async waitForSignalsCreatedBy(progress, noWaitAfter, action, source) {
    if (noWaitAfter) return action();
    const barrier = new SignalBarrier(progress);
    this._signalBarriers.add(barrier);
    if (progress) progress.cleanupWhenAborted(() => this._signalBarriers.delete(barrier));
    const result = await action();
    if (source === 'input') await this._page._delegate.inputActionEpilogue();
    await barrier.waitFor();
    this._signalBarriers.delete(barrier);
    // Resolve in the next task, after all waitForNavigations.
    await new Promise((0, _utils.makeWaitForNextTask)());
    return result;
  }
  frameWillPotentiallyRequestNavigation() {
    for (const barrier of this._signalBarriers) barrier.retain();
  }
  frameDidPotentiallyRequestNavigation() {
    for (const barrier of this._signalBarriers) barrier.release();
  }
  frameRequestedNavigation(frameId, documentId) {
    const frame = this._frames.get(frameId);
    if (!frame) return;
    for (const barrier of this._signalBarriers) barrier.addFrameNavigation(frame);
    if (frame.pendingDocument() && frame.pendingDocument().documentId === documentId) {
      // Do not override request with undefined.
      return;
    }
    frame.setPendingDocument({
      documentId,
      request: undefined
    });
  }
  frameCommittedNewDocumentNavigation(frameId, url, name, documentId, initial) {
    const frame = this._frames.get(frameId);
    this.removeChildFramesRecursively(frame);
    this.clearWebSockets(frame);
    frame._url = url;
    frame._name = name;
    let keepPending;
    const pendingDocument = frame.pendingDocument();
    if (pendingDocument) {
      if (pendingDocument.documentId === undefined) {
        // Pending with unknown documentId - assume it is the one being committed.
        pendingDocument.documentId = documentId;
      }
      if (pendingDocument.documentId === documentId) {
        // Committing a pending document.
        frame._currentDocument = pendingDocument;
      } else {
        // Sometimes, we already have a new pending when the old one commits.
        // An example would be Chromium error page followed by a new navigation request,
        // where the error page commit arrives after Network.requestWillBeSent for the
        // new navigation.
        // We commit, but keep the pending request since it's not done yet.
        keepPending = pendingDocument;
        frame._currentDocument = {
          documentId,
          request: undefined
        };
      }
      frame.setPendingDocument(undefined);
    } else {
      // No pending - just commit a new document.
      frame._currentDocument = {
        documentId,
        request: undefined
      };
    }
    frame._onClearLifecycle();
    const navigationEvent = {
      url,
      name,
      newDocument: frame._currentDocument,
      isPublic: true
    };
    this._fireInternalFrameNavigation(frame, navigationEvent);
    if (!initial) {
      _debugLogger.debugLogger.log('api', `  navigated to "${url}"`);
      this._page.frameNavigatedToNewDocument(frame);
    }
    // Restore pending if any - see comments above about keepPending.
    frame.setPendingDocument(keepPending);
  }
  frameCommittedSameDocumentNavigation(frameId, url) {
    const frame = this._frames.get(frameId);
    if (!frame) return;
    frame._url = url;
    const navigationEvent = {
      url,
      name: frame._name,
      isPublic: true
    };
    this._fireInternalFrameNavigation(frame, navigationEvent);
    _debugLogger.debugLogger.log('api', `  navigated to "${url}"`);
  }
  frameAbortedNavigation(frameId, errorText, documentId) {
    const frame = this._frames.get(frameId);
    if (!frame || !frame.pendingDocument()) return;
    if (documentId !== undefined && frame.pendingDocument().documentId !== documentId) return;
    const navigationEvent = {
      url: frame._url,
      name: frame._name,
      newDocument: frame.pendingDocument(),
      error: new NavigationAbortedError(documentId, errorText),
      isPublic: !(documentId && frame._redirectedNavigations.has(documentId))
    };
    frame.setPendingDocument(undefined);
    this._fireInternalFrameNavigation(frame, navigationEvent);
  }
  frameDetached(frameId) {
    const frame = this._frames.get(frameId);
    if (frame) {
      this._removeFramesRecursively(frame);
      this._page.mainFrame()._recalculateNetworkIdle();
    }
  }
  frameLifecycleEvent(frameId, event) {
    const frame = this._frames.get(frameId);
    if (frame) frame._onLifecycleEvent(event);
  }
  requestStarted(request, route) {
    const frame = request.frame();
    this._inflightRequestStarted(request);
    if (request._documentId) frame.setPendingDocument({
      documentId: request._documentId,
      request
    });
    if (request._isFavicon) {
      if (route) route.continue(request, {});
      return;
    }
    this._page.emitOnContext(_browserContext.BrowserContext.Events.Request, request);
    if (route) {
      const r = new network.Route(request, route);
      if (this._page._serverRequestInterceptor) {
        this._page._serverRequestInterceptor(r, request);
        return;
      }
      if (this._page._clientRequestInterceptor) {
        this._page._clientRequestInterceptor(r, request);
        return;
      }
      if (this._page._browserContext._requestInterceptor) {
        this._page._browserContext._requestInterceptor(r, request);
        return;
      }
      r.continue();
    }
  }
  requestReceivedResponse(response) {
    if (response.request()._isFavicon) return;
    this._page.emitOnContext(_browserContext.BrowserContext.Events.Response, response);
  }
  reportRequestFinished(request, response) {
    this._inflightRequestFinished(request);
    if (request._isFavicon) return;
    this._page.emitOnContext(_browserContext.BrowserContext.Events.RequestFinished, {
      request,
      response
    });
  }
  requestFailed(request, canceled) {
    const frame = request.frame();
    this._inflightRequestFinished(request);
    if (frame.pendingDocument() && frame.pendingDocument().request === request) {
      let errorText = request.failure().errorText;
      if (canceled) errorText += '; maybe frame was detached?';
      this.frameAbortedNavigation(frame._id, errorText, frame.pendingDocument().documentId);
    }
    if (request._isFavicon) return;
    this._page.emitOnContext(_browserContext.BrowserContext.Events.RequestFailed, request);
  }
  dialogDidOpen(dialog) {
    // Any ongoing evaluations will be stalled until the dialog is closed.
    for (const frame of this._frames.values()) frame._invalidateNonStallingEvaluations('JavaScript dialog interrupted evaluation');
    if (this._closeAllOpeningDialogs) dialog.close().then(() => {});else this._openedDialogs.add(dialog);
  }
  dialogWillClose(dialog) {
    this._openedDialogs.delete(dialog);
  }
  async closeOpenDialogs() {
    await Promise.all([...this._openedDialogs].map(dialog => dialog.close())).catch(() => {});
    this._openedDialogs.clear();
  }
  setCloseAllOpeningDialogs(closeDialogs) {
    this._closeAllOpeningDialogs = closeDialogs;
  }
  removeChildFramesRecursively(frame) {
    for (const child of frame.childFrames()) this._removeFramesRecursively(child);
  }
  _removeFramesRecursively(frame) {
    this.removeChildFramesRecursively(frame);
    frame._onDetached();
    this._frames.delete(frame._id);
    if (!this._page.isClosed()) this._page.emit(_page.Page.Events.FrameDetached, frame);
  }
  _inflightRequestFinished(request) {
    const frame = request.frame();
    if (request._isFavicon) return;
    if (!frame._inflightRequests.has(request)) return;
    frame._inflightRequests.delete(request);
    if (frame._inflightRequests.size === 0) frame._startNetworkIdleTimer();
  }
  _inflightRequestStarted(request) {
    const frame = request.frame();
    if (request._isFavicon) return;
    frame._inflightRequests.add(request);
    if (frame._inflightRequests.size === 1) frame._stopNetworkIdleTimer();
  }
  interceptConsoleMessage(message) {
    if (message.type() !== 'debug') return false;
    const tag = message.text();
    const handler = this._consoleMessageTags.get(tag);
    if (!handler) return false;
    this._consoleMessageTags.delete(tag);
    handler();
    return true;
  }
  clearWebSockets(frame) {
    // TODO: attribute sockets to frames.
    if (frame.parentFrame()) return;
    this._webSockets.clear();
  }
  onWebSocketCreated(requestId, url) {
    const ws = new network.WebSocket(this._page, url);
    this._webSockets.set(requestId, ws);
  }
  onWebSocketRequest(requestId) {
    const ws = this._webSockets.get(requestId);
    if (ws && ws.markAsNotified()) this._page.emit(_page.Page.Events.WebSocket, ws);
  }
  onWebSocketResponse(requestId, status, statusText) {
    const ws = this._webSockets.get(requestId);
    if (status < 400) return;
    if (ws) ws.error(`${statusText}: ${status}`);
  }
  onWebSocketFrameSent(requestId, opcode, data) {
    const ws = this._webSockets.get(requestId);
    if (ws) ws.frameSent(opcode, data);
  }
  webSocketFrameReceived(requestId, opcode, data) {
    const ws = this._webSockets.get(requestId);
    if (ws) ws.frameReceived(opcode, data);
  }
  webSocketClosed(requestId) {
    const ws = this._webSockets.get(requestId);
    if (ws) ws.closed();
    this._webSockets.delete(requestId);
  }
  webSocketError(requestId, errorMessage) {
    const ws = this._webSockets.get(requestId);
    if (ws) ws.error(errorMessage);
  }
  _fireInternalFrameNavigation(frame, event) {
    frame.emit(Frame.Events.InternalNavigation, event);
  }
}
exports.FrameManager = FrameManager;
class Frame extends _instrumentation.SdkObject {
  // documentId -> data

  constructor(page, id, parentFrame) {
    super(page, 'frame');
    this._id = void 0;
    this._firedLifecycleEvents = new Set();
    this._firedNetworkIdleSelf = false;
    this._currentDocument = void 0;
    this._pendingDocument = void 0;
    this._page = void 0;
    this._parentFrame = void 0;
    this._url = '';
    this._detached = false;
    this._contextData = new Map();
    this._childFrames = new Set();
    this._name = '';
    this._inflightRequests = new Set();
    this._networkIdleTimer = void 0;
    this._setContentCounter = 0;
    this._detachedPromise = void 0;
    this._detachedCallback = () => {};
    this._raceAgainstEvaluationStallingEventsPromises = new Set();
    this._redirectedNavigations = new Map();
    this.attribution.frame = this;
    this._id = id;
    this._page = page;
    this._parentFrame = parentFrame;
    this._currentDocument = {
      documentId: undefined,
      request: undefined
    };
    this._detachedPromise = new Promise(x => this._detachedCallback = x);
    this._contextData.set('main', {
      contextPromise: new _manualPromise.ManualPromise(),
      context: null,
      rerunnableTasks: new Set()
    });
    this._contextData.set('utility', {
      contextPromise: new _manualPromise.ManualPromise(),
      context: null,
      rerunnableTasks: new Set()
    });
    this._setContext('main', null);
    this._setContext('utility', null);
    if (this._parentFrame) this._parentFrame._childFrames.add(this);
    this._firedLifecycleEvents.add('commit');
    if (id !== kDummyFrameId) this._startNetworkIdleTimer();
  }
  isDetached() {
    return this._detached;
  }
  _onLifecycleEvent(event) {
    if (this._firedLifecycleEvents.has(event)) return;
    this._firedLifecycleEvents.add(event);
    this.emit(Frame.Events.AddLifecycle, event);
    if (this === this._page.mainFrame() && this._url !== 'about:blank') _debugLogger.debugLogger.log('api', `  "${event}" event fired`);
    this._page.mainFrame()._recalculateNetworkIdle();
  }
  _onClearLifecycle() {
    for (const event of this._firedLifecycleEvents) this.emit(Frame.Events.RemoveLifecycle, event);
    this._firedLifecycleEvents.clear();
    // Keep the current navigation request if any.
    this._inflightRequests = new Set(Array.from(this._inflightRequests).filter(request => request === this._currentDocument.request));
    this._stopNetworkIdleTimer();
    if (this._inflightRequests.size === 0) this._startNetworkIdleTimer();
    this._page.mainFrame()._recalculateNetworkIdle(this);
    this._onLifecycleEvent('commit');
  }
  setPendingDocument(documentInfo) {
    this._pendingDocument = documentInfo;
    if (documentInfo) this._invalidateNonStallingEvaluations('Navigation interrupted the evaluation');
  }
  pendingDocument() {
    return this._pendingDocument;
  }
  _invalidateNonStallingEvaluations(message) {
    if (!this._raceAgainstEvaluationStallingEventsPromises.size) return;
    const error = new Error(message);
    for (const promise of this._raceAgainstEvaluationStallingEventsPromises) promise.reject(error);
  }
  async raceAgainstEvaluationStallingEvents(cb) {
    if (this._pendingDocument) throw new Error('Frame is currently attempting a navigation');
    if (this._page._frameManager._openedDialogs.size) throw new Error('Open JavaScript dialog prevents evaluation');
    const promise = new _manualPromise.ManualPromise();
    this._raceAgainstEvaluationStallingEventsPromises.add(promise);
    try {
      return await Promise.race([cb(), promise]);
    } finally {
      this._raceAgainstEvaluationStallingEventsPromises.delete(promise);
    }
  }
  nonStallingRawEvaluateInExistingMainContext(expression) {
    return this.raceAgainstEvaluationStallingEvents(() => {
      const context = this._existingMainContext();
      if (!context) throw new Error('Frame does not yet have a main execution context');
      return context.rawEvaluateJSON(expression);
    });
  }
  nonStallingEvaluateInExistingContext(expression, isFunction, world) {
    return this.raceAgainstEvaluationStallingEvents(() => {
      var _this$_contextData$ge;
      const context = (_this$_contextData$ge = this._contextData.get(world)) === null || _this$_contextData$ge === void 0 ? void 0 : _this$_contextData$ge.context;
      if (!context) throw new Error('Frame does not yet have the execution context');
      return context.evaluateExpression(expression, {
        isFunction
      });
    });
  }
  _recalculateNetworkIdle(frameThatAllowsRemovingNetworkIdle) {
    let isNetworkIdle = this._firedNetworkIdleSelf;
    for (const child of this._childFrames) {
      child._recalculateNetworkIdle(frameThatAllowsRemovingNetworkIdle);
      // We require networkidle event to be fired in the whole frame subtree, and then consider it done.
      if (!child._firedLifecycleEvents.has('networkidle')) isNetworkIdle = false;
    }
    if (isNetworkIdle && !this._firedLifecycleEvents.has('networkidle')) {
      this._firedLifecycleEvents.add('networkidle');
      this.emit(Frame.Events.AddLifecycle, 'networkidle');
      if (this === this._page.mainFrame() && this._url !== 'about:blank') _debugLogger.debugLogger.log('api', `  "networkidle" event fired`);
    }
    if (frameThatAllowsRemovingNetworkIdle !== this && this._firedLifecycleEvents.has('networkidle') && !isNetworkIdle) {
      // Usually, networkidle is fired once and not removed after that.
      // However, when we clear them right before a new commit, this is allowed for a particular frame.
      this._firedLifecycleEvents.delete('networkidle');
      this.emit(Frame.Events.RemoveLifecycle, 'networkidle');
    }
  }
  async raceNavigationAction(progress, options, action) {
    return Promise.race([this._page._disconnectedPromise.then(() => {
      throw new Error('Navigation failed because page was closed!');
    }), this._page._crashedPromise.then(() => {
      throw new Error('Navigation failed because page crashed!');
    }), this._detachedPromise.then(() => {
      throw new Error('Navigating frame was detached!');
    }), action().catch(e => {
      if (e instanceof NavigationAbortedError && e.documentId) {
        const data = this._redirectedNavigations.get(e.documentId);
        if (data) {
          progress.log(`waiting for redirected navigation to "${data.url}"`);
          return data.gotoPromise;
        }
      }
      throw e;
    })]);
  }
  redirectNavigation(url, documentId, referer) {
    const controller = new _progress.ProgressController((0, _instrumentation.serverSideCallMetadata)(), this);
    const data = {
      url,
      gotoPromise: controller.run(progress => this._gotoAction(progress, url, {
        referer
      }), 0)
    };
    this._redirectedNavigations.set(documentId, data);
    data.gotoPromise.finally(() => this._redirectedNavigations.delete(documentId));
  }
  async goto(metadata, url, options = {}) {
    const constructedNavigationURL = (0, _utils.constructURLBasedOnBaseURL)(this._page._browserContext._options.baseURL, url);
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(progress => this._goto(progress, constructedNavigationURL, options), this._page._timeoutSettings.navigationTimeout(options));
  }
  async _goto(progress, url, options) {
    return this.raceNavigationAction(progress, options, async () => this._gotoAction(progress, url, options));
  }
  async _gotoAction(progress, url, options) {
    const waitUntil = verifyLifecycle('waitUntil', options.waitUntil === undefined ? 'load' : options.waitUntil);
    progress.log(`navigating to "${url}", waiting until "${waitUntil}"`);
    const headers = this._page.extraHTTPHeaders() || [];
    const refererHeader = headers.find(h => h.name.toLowerCase() === 'referer');
    let referer = refererHeader ? refererHeader.value : undefined;
    if (options.referer !== undefined) {
      if (referer !== undefined && referer !== options.referer) throw new Error('"referer" is already specified as extra HTTP header');
      referer = options.referer;
    }
    url = _helper.helper.completeUserURL(url);
    const sameDocument = _helper.helper.waitForEvent(progress, this, Frame.Events.InternalNavigation, e => !e.newDocument);
    const navigateResult = await this._page._delegate.navigateFrame(this, url, referer);
    let event;
    if (navigateResult.newDocumentId) {
      sameDocument.dispose();
      event = await _helper.helper.waitForEvent(progress, this, Frame.Events.InternalNavigation, event => {
        // We are interested either in this specific document, or any other document that
        // did commit and replaced the expected document.
        return event.newDocument && (event.newDocument.documentId === navigateResult.newDocumentId || !event.error);
      }).promise;
      if (event.newDocument.documentId !== navigateResult.newDocumentId) {
        // This is just a sanity check. In practice, new navigation should
        // cancel the previous one and report "request cancelled"-like error.
        throw new NavigationAbortedError(navigateResult.newDocumentId, 'Navigation interrupted by another one');
      }
      if (event.error) throw event.error;
    } else {
      event = await sameDocument.promise;
    }
    if (!this._firedLifecycleEvents.has(waitUntil)) await _helper.helper.waitForEvent(progress, this, Frame.Events.AddLifecycle, e => e === waitUntil).promise;
    const request = event.newDocument ? event.newDocument.request : undefined;
    const response = request ? request._finalRequest().response() : null;
    return response;
  }
  async _waitForNavigation(progress, requiresNewDocument, options) {
    const waitUntil = verifyLifecycle('waitUntil', options.waitUntil === undefined ? 'load' : options.waitUntil);
    progress.log(`waiting for navigation until "${waitUntil}"`);
    const navigationEvent = await _helper.helper.waitForEvent(progress, this, Frame.Events.InternalNavigation, event => {
      // Any failed navigation results in a rejection.
      if (event.error) return true;
      if (requiresNewDocument && !event.newDocument) return false;
      progress.log(`  navigated to "${this._url}"`);
      return true;
    }).promise;
    if (navigationEvent.error) throw navigationEvent.error;
    if (!this._firedLifecycleEvents.has(waitUntil)) await _helper.helper.waitForEvent(progress, this, Frame.Events.AddLifecycle, e => e === waitUntil).promise;
    const request = navigationEvent.newDocument ? navigationEvent.newDocument.request : undefined;
    return request ? request._finalRequest().response() : null;
  }
  async _waitForLoadState(progress, state) {
    const waitUntil = verifyLifecycle('state', state);
    if (!this._firedLifecycleEvents.has(waitUntil)) await _helper.helper.waitForEvent(progress, this, Frame.Events.AddLifecycle, e => e === waitUntil).promise;
  }
  async frameElement() {
    return this._page._delegate.getFrameElement(this);
  }
  _context(world) {
    return this._contextData.get(world).contextPromise.then(contextOrError => {
      if (contextOrError instanceof js.ExecutionContext) return contextOrError;
      throw contextOrError;
    });
  }
  _mainContext() {
    return this._context('main');
  }
  _existingMainContext() {
    var _this$_contextData$ge2;
    return ((_this$_contextData$ge2 = this._contextData.get('main')) === null || _this$_contextData$ge2 === void 0 ? void 0 : _this$_contextData$ge2.context) || null;
  }
  _utilityContext() {
    return this._context('utility');
  }
  async evaluateExpressionHandleAndWaitForSignals(expression, isFunction, arg, world = 'main') {
    const context = await this._context(world);
    const handle = await context.evaluateExpressionHandleAndWaitForSignals(expression, {
      isFunction
    }, arg);
    return handle;
  }
  async evaluateExpression(expression, isFunction, arg, world = 'main') {
    const context = await this._context(world);
    const value = await context.evaluateExpression(expression, {
      isFunction
    }, arg);
    return value;
  }
  async evaluateExpressionAndWaitForSignals(expression, options, arg, world = 'main') {
    const context = await this._context(world);
    const value = await context.evaluateExpressionAndWaitForSignals(expression, options, arg);
    return value;
  }
  async querySelector(selector, options) {
    _debugLogger.debugLogger.log('api', `    finding element using the selector "${selector}"`);
    const result = await this.resolveFrameForSelectorNoWait(selector, options);
    if (!result) return null;
    return this._page.selectors.query(result.frame, result.info);
  }
  async waitForSelector(metadata, selector, options, scope) {
    const controller = new _progress.ProgressController(metadata, this);
    if (options.visibility) throw new Error('options.visibility is not supported, did you mean options.state?');
    if (options.waitFor && options.waitFor !== 'visible') throw new Error('options.waitFor is not supported, did you mean options.state?');
    const {
      state = 'visible'
    } = options;
    if (!['attached', 'detached', 'visible', 'hidden'].includes(state)) throw new Error(`state: expected one of (attached|detached|visible|hidden)`);
    return controller.run(async progress => {
      progress.log(`waiting for ${this._asLocator(selector)}${state === 'attached' ? '' : ' to be ' + state}`);
      return this.retryWithProgress(progress, selector, options, async (selectorInFrame, continuePolling) => {
        // Be careful, |this| can be different from |frame|.
        // We did not pass omitAttached, so it is non-null.
        const {
          frame,
          info
        } = selectorInFrame;
        const actualScope = this === frame ? scope : undefined;
        const task = dom.waitForSelectorTask(info, state, options.omitReturnValue, actualScope);
        const result = actualScope ? await frame._runWaitForSelectorTaskOnce(progress, (0, _selectorParser.stringifySelector)(info.parsed), info.world, task) : await frame._scheduleRerunnableHandleTask(progress, info.world, task);
        if (!result.asElement()) {
          result.dispose();
          return null;
        }
        if (options.__testHookBeforeAdoptNode) await options.__testHookBeforeAdoptNode();
        const handle = result.asElement();
        try {
          return await handle._adoptTo(await frame._mainContext());
        } catch (e) {
          return continuePolling;
        }
      }, scope);
    }, this._page._timeoutSettings.timeout(options));
  }
  async dispatchEvent(metadata, selector, type, eventInit = {}, options = {}) {
    await this._scheduleRerunnableTask(metadata, selector, (progress, element, data) => {
      progress.injectedScript.dispatchEvent(element, data.type, data.eventInit);
    }, {
      type,
      eventInit
    }, {
      mainWorld: true,
      ...options
    });
  }
  async evalOnSelectorAndWaitForSignals(selector, strict, expression, isFunction, arg) {
    const pair = await this.resolveFrameForSelectorNoWait(selector, {
      strict
    });
    const handle = pair ? await this._page.selectors.query(pair.frame, pair.info) : null;
    if (!handle) throw new Error(`Error: failed to find element matching selector "${selector}"`);
    const result = await handle.evaluateExpressionAndWaitForSignals(expression, isFunction, true, arg);
    handle.dispose();
    return result;
  }
  async evalOnSelectorAllAndWaitForSignals(selector, expression, isFunction, arg) {
    const pair = await this.resolveFrameForSelectorNoWait(selector, {});
    if (!pair) throw new Error(`Error: failed to find frame for selector "${selector}"`);
    const arrayHandle = await this._page.selectors._queryArrayInMainWorld(pair.frame, pair.info);
    const result = await arrayHandle.evaluateExpressionAndWaitForSignals(expression, isFunction, true, arg);
    arrayHandle.dispose();
    return result;
  }
  async maskSelectors(selectors) {
    const context = await this._utilityContext();
    const injectedScript = await context.injectedScript();
    await injectedScript.evaluate((injected, {
      parsed
    }) => {
      injected.maskSelectors(parsed);
    }, {
      parsed: selectors
    });
  }
  async querySelectorAll(selector) {
    const pair = await this.resolveFrameForSelectorNoWait(selector, {});
    if (!pair) return [];
    return this._page.selectors._queryAll(pair.frame, pair.info, undefined, true /* adoptToMain */);
  }

  async queryCount(selector) {
    const pair = await this.resolveFrameForSelectorNoWait(selector);
    if (!pair) throw new Error(`Error: failed to find frame for selector "${selector}"`);
    return await this._page.selectors._queryCount(pair.frame, pair.info);
  }
  async content() {
    try {
      const context = await this._utilityContext();
      return await context.evaluate(() => {
        let retVal = '';
        if (document.doctype) retVal = new XMLSerializer().serializeToString(document.doctype);
        if (document.documentElement) retVal += document.documentElement.outerHTML;
        return retVal;
      });
    } catch (e) {
      if (js.isJavaScriptErrorInEvaluate(e) || (0, _protocolError.isSessionClosedError)(e)) throw e;
      throw new Error(`Unable to retrieve content because the page is navigating and changing the content.`);
    }
  }
  async setContent(metadata, html, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      await this.raceNavigationAction(progress, options, async () => {
        const waitUntil = options.waitUntil === undefined ? 'load' : options.waitUntil;
        progress.log(`setting frame content, waiting until "${waitUntil}"`);
        const tag = `--playwright--set--content--${this._id}--${++this._setContentCounter}--`;
        const context = await this._utilityContext();
        const lifecyclePromise = new Promise((resolve, reject) => {
          this._page._frameManager._consoleMessageTags.set(tag, () => {
            // Clear lifecycle right after document.open() - see 'tag' below.
            this._onClearLifecycle();
            this._waitForLoadState(progress, waitUntil).then(resolve).catch(reject);
          });
        });
        const contentPromise = context.evaluate(({
          html,
          tag
        }) => {
          window.stop();
          document.open();
          console.debug(tag); // eslint-disable-line no-console
          document.write(html);
          document.close();
        }, {
          html,
          tag
        });
        await Promise.all([contentPromise, lifecyclePromise]);
        return null;
      });
    }, this._page._timeoutSettings.navigationTimeout(options));
  }
  name() {
    return this._name || '';
  }
  url() {
    return this._url;
  }
  parentFrame() {
    return this._parentFrame;
  }
  childFrames() {
    return Array.from(this._childFrames);
  }
  async addScriptTag(params) {
    const {
      url = null,
      content = null,
      type = ''
    } = params;
    if (!url && !content) throw new Error('Provide an object with a `url`, `path` or `content` property');
    const context = await this._mainContext();
    return this._raceWithCSPError(async () => {
      if (url !== null) return (await context.evaluateHandle(addScriptUrl, {
        url,
        type
      })).asElement();
      const result = (await context.evaluateHandle(addScriptContent, {
        content: content,
        type
      })).asElement();
      // Another round trip to the browser to ensure that we receive CSP error messages
      // (if any) logged asynchronously in a separate task on the content main thread.
      if (this._page._delegate.cspErrorsAsynchronousForInlineScipts) await context.evaluate(() => true);
      return result;
    });
    async function addScriptUrl(params) {
      const script = document.createElement('script');
      script.src = params.url;
      if (params.type) script.type = params.type;
      const promise = new Promise((res, rej) => {
        script.onload = res;
        script.onerror = e => rej(typeof e === 'string' ? new Error(e) : new Error(`Failed to load script at ${script.src}`));
      });
      document.head.appendChild(script);
      await promise;
      return script;
    }
    function addScriptContent(params) {
      const script = document.createElement('script');
      script.type = params.type || 'text/javascript';
      script.text = params.content;
      let error = null;
      script.onerror = e => error = e;
      document.head.appendChild(script);
      if (error) throw error;
      return script;
    }
  }
  async addStyleTag(params) {
    const {
      url = null,
      content = null
    } = params;
    if (!url && !content) throw new Error('Provide an object with a `url`, `path` or `content` property');
    const context = await this._mainContext();
    return this._raceWithCSPError(async () => {
      if (url !== null) return (await context.evaluateHandle(addStyleUrl, url)).asElement();
      return (await context.evaluateHandle(addStyleContent, content)).asElement();
    });
    async function addStyleUrl(url) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      const promise = new Promise((res, rej) => {
        link.onload = res;
        link.onerror = rej;
      });
      document.head.appendChild(link);
      await promise;
      return link;
    }
    async function addStyleContent(content) {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.appendChild(document.createTextNode(content));
      const promise = new Promise((res, rej) => {
        style.onload = res;
        style.onerror = rej;
      });
      document.head.appendChild(style);
      await promise;
      return style;
    }
  }
  async _raceWithCSPError(func) {
    const listeners = [];
    let result;
    let error;
    let cspMessage;
    const actionPromise = func().then(r => result = r).catch(e => error = e);
    const errorPromise = new Promise(resolve => {
      listeners.push(_eventsHelper.eventsHelper.addEventListener(this._page, _page.Page.Events.Console, message => {
        if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
          cspMessage = message;
          resolve();
        }
      }));
    });
    await Promise.race([actionPromise, errorPromise]);
    _eventsHelper.eventsHelper.removeEventListeners(listeners);
    if (cspMessage) throw new Error(cspMessage.text());
    if (error) throw error;
    return result;
  }
  async retryWithProgress(progress, selector, options, action, scope) {
    const continuePolling = Symbol('continuePolling');
    while (progress.isRunning()) {
      let selectorInFrame;
      if (options.omitAttached) {
        selectorInFrame = await this.resolveFrameForSelectorNoWait(selector, options, scope);
      } else {
        selectorInFrame = await this._resolveFrameForSelector(progress, selector, options, scope);
        if (!selectorInFrame) {
          // Missing content frame.
          await new Promise(f => setTimeout(f, 100));
          continue;
        }
      }
      try {
        const result = await action(selectorInFrame, continuePolling);
        if (result === continuePolling) continue;
        return result;
      } catch (e) {
        var _selectorInFrame;
        // Always fail on JavaScript errors or when the main connection is closed.
        if (js.isJavaScriptErrorInEvaluate(e) || (0, _protocolError.isSessionClosedError)(e)) throw e;
        // Certain error opt-out of the retries, throw.
        if (dom.isNonRecoverableDOMError(e)) throw e;
        // If the call is made on the detached frame - throw.
        if (this.isDetached()) throw e;
        // If there is scope, and scope is within the frame we use to select, assume context is destroyed and
        // operation is not recoverable.
        if (scope && scope._context.frame === ((_selectorInFrame = selectorInFrame) === null || _selectorInFrame === void 0 ? void 0 : _selectorInFrame.frame)) throw e;
        // Retry upon all other errors.
        continue;
      }
    }
    progress.throwIfAborted();
    return undefined;
  }
  async _retryWithProgressIfNotConnected(progress, selector, strict, action) {
    return this.retryWithProgress(progress, selector, {
      strict
    }, async (selectorInFrame, continuePolling) => {
      // We did not pass omitAttached, so selectorInFrame is not null.
      const {
        frame,
        info
      } = selectorInFrame;
      // Be careful, |this| can be different from |frame|.
      const task = dom.waitForSelectorTask(info, 'attached');
      progress.log(`waiting for ${this._asLocator(selector)}`);
      const handle = await frame._scheduleRerunnableHandleTask(progress, info.world, task);
      const element = handle.asElement();
      try {
        const result = await action(element);
        if (result === 'error:notconnected') {
          progress.log('element was detached from the DOM, retrying');
          return continuePolling;
        }
        return result;
      } finally {
        element === null || element === void 0 ? void 0 : element.dispose();
      }
    });
  }
  async rafrafTimeoutScreenshotElementWithProgress(progress, selector, timeout, options) {
    return await this._retryWithProgressIfNotConnected(progress, selector, true /* strict */, async handle => {
      await handle._frame.rafrafTimeout(timeout);
      return await this._page._screenshotter.screenshotElement(progress, handle, options);
    });
  }
  async click(metadata, selector, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._click(progress, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async dblclick(metadata, selector, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._dblclick(progress, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async dragAndDrop(metadata, source, target, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    await controller.run(async progress => {
      dom.assertDone(await this._retryWithProgressIfNotConnected(progress, source, options.strict, async handle => {
        return handle._retryPointerAction(progress, 'move and down', false, async point => {
          await this._page.mouse.move(point.x, point.y);
          await this._page.mouse.down();
        }, {
          ...options,
          position: options.sourcePosition,
          timeout: progress.timeUntilDeadline()
        });
      }));
      dom.assertDone(await this._retryWithProgressIfNotConnected(progress, target, options.strict, async handle => {
        return handle._retryPointerAction(progress, 'move and up', false, async point => {
          await this._page.mouse.move(point.x, point.y);
          await this._page.mouse.up();
        }, {
          ...options,
          position: options.targetPosition,
          timeout: progress.timeUntilDeadline()
        });
      }));
    }, this._page._timeoutSettings.timeout(options));
  }
  async tap(metadata, selector, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._tap(progress, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async fill(metadata, selector, value, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._fill(progress, value, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async focus(metadata, selector, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    await controller.run(async progress => {
      dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._focus(progress)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async blur(metadata, selector, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    await controller.run(async progress => {
      dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._blur(progress)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async textContent(metadata, selector, options = {}) {
    return this._scheduleRerunnableTask(metadata, selector, (progress, element) => element.textContent, undefined, options);
  }
  async innerText(metadata, selector, options = {}) {
    return this._scheduleRerunnableTask(metadata, selector, (progress, element) => {
      if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml') throw progress.injectedScript.createStacklessError('Node is not an HTMLElement');
      return element.innerText;
    }, undefined, options);
  }
  async innerHTML(metadata, selector, options = {}) {
    return this._scheduleRerunnableTask(metadata, selector, (progress, element) => element.innerHTML, undefined, options);
  }
  async getAttribute(metadata, selector, name, options = {}) {
    return this._scheduleRerunnableTask(metadata, selector, (progress, element, data) => element.getAttribute(data.name), {
      name
    }, options);
  }
  async inputValue(metadata, selector, options = {}) {
    return this._scheduleRerunnableTask(metadata, selector, (progress, node) => {
      const element = progress.injectedScript.retarget(node, 'follow-label');
      if (!element || element.nodeName !== 'INPUT' && element.nodeName !== 'TEXTAREA' && element.nodeName !== 'SELECT') throw progress.injectedScript.createStacklessError('Node is not an <input>, <textarea> or <select> element');
      return element.value;
    }, undefined, options);
  }
  async highlight(selector) {
    const pair = await this.resolveFrameForSelectorNoWait(selector);
    if (!pair) return;
    const context = await pair.frame._utilityContext();
    const injectedScript = await context.injectedScript();
    return await injectedScript.evaluate((injected, {
      parsed
    }) => {
      return injected.highlight(parsed);
    }, {
      parsed: pair.info.parsed
    });
  }
  async hideHighlight() {
    return this.raceAgainstEvaluationStallingEvents(async () => {
      const context = await this._utilityContext();
      const injectedScript = await context.injectedScript();
      return await injectedScript.evaluate(injected => {
        return injected.hideHighlight();
      });
    });
  }
  async _elementState(metadata, selector, state, options = {}) {
    const result = await this._scheduleRerunnableTask(metadata, selector, (progress, element, data) => {
      const injected = progress.injectedScript;
      return injected.elementState(element, data.state);
    }, {
      state
    }, options);
    return dom.throwRetargetableDOMError(result);
  }
  async isVisible(metadata, selector, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      progress.log(`  checking visibility of ${this._asLocator(selector)}`);
      const pair = await this.resolveFrameForSelectorNoWait(selector, options);
      if (!pair) return false;
      const context = await pair.frame._context(pair.info.world);
      const injectedScript = await context.injectedScript();
      return await injectedScript.evaluate((injected, {
        parsed,
        strict
      }) => {
        const element = injected.querySelector(parsed, document, strict);
        const state = element ? injected.elementState(element, 'visible') : false;
        return state === 'error:notconnected' ? false : state;
      }, {
        parsed: pair.info.parsed,
        strict: pair.info.strict
      });
    }, this._page._timeoutSettings.timeout({}));
  }
  async isHidden(metadata, selector, options = {}) {
    return !(await this.isVisible(metadata, selector, options));
  }
  async isDisabled(metadata, selector, options = {}) {
    return this._elementState(metadata, selector, 'disabled', options);
  }
  async isEnabled(metadata, selector, options = {}) {
    return this._elementState(metadata, selector, 'enabled', options);
  }
  async isEditable(metadata, selector, options = {}) {
    return this._elementState(metadata, selector, 'editable', options);
  }
  async isChecked(metadata, selector, options = {}) {
    return this._elementState(metadata, selector, 'checked', options);
  }
  async hover(metadata, selector, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._hover(progress, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async selectOption(metadata, selector, elements, values, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._selectOption(progress, elements, values, options));
    }, this._page._timeoutSettings.timeout(options));
  }
  async setInputFiles(metadata, selector, items, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._setInputFiles(progress, items, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async type(metadata, selector, text, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._type(progress, text, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async press(metadata, selector, key, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._press(progress, key, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async check(metadata, selector, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._setChecked(progress, true, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async uncheck(metadata, selector, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options.strict, handle => handle._setChecked(progress, false, options)));
    }, this._page._timeoutSettings.timeout(options));
  }
  async waitForTimeout(metadata, timeout) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async () => {
      await new Promise(resolve => setTimeout(resolve, timeout));
    });
  }
  async expect(metadata, selector, options) {
    let timeout = this._page._timeoutSettings.timeout(options);
    const start = timeout > 0 ? (0, _utils.monotonicTime)() : 0;
    const resultOneShot = await this._expectInternal(metadata, selector, options, true, timeout);
    if (resultOneShot.matches !== options.isNot) return resultOneShot;
    if (timeout > 0) {
      const elapsed = (0, _utils.monotonicTime)() - start;
      timeout -= elapsed;
    }
    if (timeout < 0) return {
      matches: options.isNot,
      log: metadata.log,
      timedOut: true
    };
    return await this._expectInternal(metadata, selector, options, false, timeout);
  }
  async _expectInternal(metadata, selector, options, oneShot, timeout) {
    const controller = new _progress.ProgressController(metadata, this);
    const isArray = options.expression === 'to.have.count' || options.expression.endsWith('.array');
    const mainWorld = options.expression === 'to.have.property';

    // List all combinations that are satisfied with the detached node(s).
    let omitAttached = oneShot;
    if (!options.isNot && options.expression === 'to.be.hidden') omitAttached = true;else if (options.isNot && options.expression === 'to.be.visible') omitAttached = true;else if (!options.isNot && options.expression === 'to.have.count' && options.expectedNumber === 0) omitAttached = true;else if (options.isNot && options.expression === 'to.have.count' && options.expectedNumber !== 0) omitAttached = true;else if (!options.isNot && options.expression.endsWith('.array') && options.expectedText.length === 0) omitAttached = true;else if (options.isNot && options.expression.endsWith('.array') && options.expectedText.length > 0) omitAttached = true;
    return controller.run(async outerProgress => {
      if (oneShot) outerProgress.log(`${metadata.apiName}${timeout ? ` with timeout ${timeout}ms` : ''}`);
      return await this._scheduleRerunnableTaskWithProgress(outerProgress, selector, (progress, element, options, elements) => {
        let result;
        if (options.isArray) {
          result = progress.injectedScript.expectArray(elements, options);
        } else {
          if (!element) {
            // expect(locator).toBeHidden() passes when there is no element.
            if (!options.isNot && options.expression === 'to.be.hidden') return {
              matches: true
            };
            // expect(locator).not.toBeVisible() passes when there is no element.
            if (options.isNot && options.expression === 'to.be.visible') return {
              matches: false
            };
            // When none of the above applies, keep waiting for the element.
            return options.oneShot ? {
              matches: options.isNot
            } : progress.continuePolling;
          }
          result = progress.injectedScript.expectSingleElement(progress, element, options);
        }
        if (result.matches === options.isNot) {
          // Keep waiting in these cases:
          // expect(locator).conditionThatDoesNotMatch
          // expect(locator).not.conditionThatDoesMatch
          progress.setIntermediateResult(result.received);
          if (!Array.isArray(result.received)) progress.log(`  unexpected value "${progress.injectedScript.renderUnexpectedValue(options.expression, result.received)}"`);
          return options.oneShot ? result : progress.continuePolling;
        }

        // Reached the expected state!
        return result;
      }, {
        ...options,
        isArray,
        oneShot
      }, {
        strict: true,
        querySelectorAll: isArray,
        mainWorld,
        omitAttached,
        logScale: true,
        ...options
      });
    }, oneShot ? 0 : timeout).catch(e => {
      // Q: Why not throw upon isSessionClosedError(e) as in other places?
      // A: We want user to receive a friendly message containing the last intermediate result.
      if (js.isJavaScriptErrorInEvaluate(e) || (0, _selectorParser.isInvalidSelectorError)(e)) throw e;
      const result = {
        matches: options.isNot,
        log: metadata.log
      };
      const intermediateResult = controller.lastIntermediateResult();
      if (intermediateResult) result.received = intermediateResult.value;else result.timedOut = true;
      return result;
    });
  }
  async _waitForFunctionExpression(metadata, expression, isFunction, arg, options, world = 'main') {
    const controller = new _progress.ProgressController(metadata, this);
    if (typeof options.pollingInterval === 'number') (0, _utils.assert)(options.pollingInterval > 0, 'Cannot poll with non-positive interval: ' + options.pollingInterval);
    expression = js.normalizeEvaluationExpression(expression, isFunction);
    const task = injectedScript => injectedScript.evaluateHandle((injectedScript, {
      expression,
      isFunction,
      polling,
      arg
    }) => {
      const predicate = arg => {
        let result = self.eval(expression);
        if (isFunction === true) {
          result = result(arg);
        } else if (isFunction === false) {
          result = result;
        } else {
          // auto detect.
          if (typeof result === 'function') result = result(arg);
        }
        return result;
      };
      if (typeof polling !== 'number') return injectedScript.pollRaf(progress => predicate(arg) || progress.continuePolling);
      return injectedScript.pollInterval(polling, progress => predicate(arg) || progress.continuePolling);
    }, {
      expression,
      isFunction,
      polling: options.pollingInterval,
      arg
    });
    return controller.run(progress => this._scheduleRerunnableHandleTask(progress, world, task), this._page._timeoutSettings.timeout(options));
  }
  async waitForFunctionValueInUtility(progress, pageFunction) {
    const expression = `() => {
      const result = (${pageFunction})();
      if (!result)
        return result;
      return JSON.stringify(result);
    }`;
    const handle = await this._waitForFunctionExpression((0, _instrumentation.serverSideCallMetadata)(), expression, true, undefined, {
      timeout: progress.timeUntilDeadline()
    }, 'utility');
    return JSON.parse(handle.rawValue());
  }
  async title() {
    const context = await this._utilityContext();
    return context.evaluate(() => document.title);
  }
  async rafrafTimeout(timeout) {
    if (timeout === 0) return;
    const context = await this._utilityContext();
    await Promise.all([
    // wait for double raf
    context.evaluate(() => new Promise(x => {
      requestAnimationFrame(() => {
        requestAnimationFrame(x);
      });
    })), new Promise(fulfill => setTimeout(fulfill, timeout))]);
  }
  _onDetached() {
    this._stopNetworkIdleTimer();
    this._detached = true;
    this._detachedCallback();
    const error = new Error('Frame was detached');
    for (const data of this._contextData.values()) {
      if (data.context) data.context.contextDestroyed(error);
      data.contextPromise.resolve(error);
      for (const rerunnableTask of data.rerunnableTasks) rerunnableTask.terminate(error);
    }
    if (this._parentFrame) this._parentFrame._childFrames.delete(this);
    this._parentFrame = null;
  }
  async _scheduleRerunnableTask(metadata, selector, body, taskData, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      return await this._scheduleRerunnableTaskWithProgress(progress, selector, body, taskData, options);
    }, this._page._timeoutSettings.timeout(options));
  }
  async _scheduleRerunnableTaskWithProgress(progress, selector, body, taskData, options = {}) {
    const callbackText = body.toString();
    return this.retryWithProgress(progress, selector, options, async selectorInFrame => {
      // Be careful, |this| can be different from |frame|.
      progress.log(`waiting for ${this._asLocator(selector)}`);
      const {
        frame,
        info
      } = selectorInFrame || {
        frame: this,
        info: {
          parsed: {
            parts: [{
              name: 'internal:control',
              body: 'return-empty',
              source: 'internal:control=return-empty'
            }]
          },
          world: 'utility',
          strict: !!options.strict
        }
      };
      return await frame._scheduleRerunnableTaskInFrame(progress, info, callbackText, taskData, options);
    });
  }
  async _scheduleRerunnableTaskInFrame(progress, info, callbackText, taskData, options) {
    progress.throwIfAborted();
    const data = this._contextData.get(options.mainWorld ? 'main' : info.world);
    // This potentially runs in a sub-frame.
    {
      const rerunnableTask = new RerunnableTask(data, progress, injectedScript => {
        return injectedScript.evaluateHandle((injected, {
          info,
          taskData,
          callbackText,
          querySelectorAll,
          logScale,
          omitAttached,
          snapshotName
        }) => {
          const callback = injected.eval(callbackText);
          const poller = logScale ? injected.pollLogScale.bind(injected) : injected.pollRaf.bind(injected);
          let markedElements = new Set();
          return poller(progress => {
            let element;
            let elements = [];
            if (querySelectorAll) {
              elements = injected.querySelectorAll(info.parsed, document);
              element = elements[0];
              progress.logRepeating(`  locator resolved to ${elements.length} element${elements.length === 1 ? '' : 's'}`);
            } else {
              element = injected.querySelector(info.parsed, document, info.strict);
              elements = element ? [element] : [];
              if (element) progress.logRepeating(`  locator resolved to ${injected.previewNode(element)}`);
            }
            if (!element && !omitAttached) return progress.continuePolling;
            if (snapshotName) {
              const previouslyMarkedElements = markedElements;
              markedElements = new Set(elements);
              for (const e of previouslyMarkedElements) {
                if (!markedElements.has(e)) e.removeAttribute('__playwright_target__');
              }
              for (const e of markedElements) {
                if (!previouslyMarkedElements.has(e)) e.setAttribute('__playwright_target__', snapshotName);
              }
            }
            return callback(progress, element, taskData, elements);
          });
        }, {
          info,
          taskData,
          callbackText,
          querySelectorAll: options.querySelectorAll,
          logScale: options.logScale,
          omitAttached: options.omitAttached,
          snapshotName: progress.metadata.afterSnapshot
        });
      }, true);
      if (this._detached) rerunnableTask.terminate(new Error('Frame got detached.'));
      if (data.context) rerunnableTask.rerun(data.context);
      return await rerunnableTask.promise;
    }
  }
  _scheduleRerunnableHandleTask(progress, world, task) {
    const data = this._contextData.get(world);
    const rerunnableTask = new RerunnableTask(data, progress, task, false /* returnByValue */);
    if (this._detached) rerunnableTask.terminate(new Error('waitForFunction failed: frame got detached.'));
    if (data.context) rerunnableTask.rerun(data.context);
    return rerunnableTask.handlePromise;
  }
  _setContext(world, context) {
    const data = this._contextData.get(world);
    data.context = context;
    if (context) {
      data.contextPromise.resolve(context);
      for (const rerunnableTask of data.rerunnableTasks) rerunnableTask.rerun(context);
    } else {
      data.contextPromise = new _manualPromise.ManualPromise();
    }
  }
  _contextCreated(world, context) {
    const data = this._contextData.get(world);
    // In case of multiple sessions to the same target, there's a race between
    // connections so we might end up creating multiple isolated worlds.
    // We can use either.
    if (data.context) {
      data.context.contextDestroyed(new Error('Execution context was destroyed, most likely because of a navigation'));
      this._setContext(world, null);
    }
    this._setContext(world, context);
  }
  _contextDestroyed(context) {
    // Sometimes we get this after detach, in which case we should not reset
    // our already destroyed contexts to something that will never resolve.
    if (this._detached) return;
    context.contextDestroyed(new Error('Execution context was destroyed, most likely because of a navigation'));
    for (const [world, data] of this._contextData) {
      if (data.context === context) this._setContext(world, null);
    }
  }
  _startNetworkIdleTimer() {
    (0, _utils.assert)(!this._networkIdleTimer);
    // We should not start a timer and report networkidle in detached frames.
    // This happens at least in Firefox for child frames, where we may get requestFinished
    // after the frame was detached - probably a race in the Firefox itself.
    if (this._firedLifecycleEvents.has('networkidle') || this._detached) return;
    this._networkIdleTimer = setTimeout(() => {
      this._firedNetworkIdleSelf = true;
      this._page.mainFrame()._recalculateNetworkIdle();
    }, 500);
  }
  _stopNetworkIdleTimer() {
    if (this._networkIdleTimer) clearTimeout(this._networkIdleTimer);
    this._networkIdleTimer = undefined;
    this._firedNetworkIdleSelf = false;
  }
  async extendInjectedScript(source, arg) {
    const context = await this._context('main');
    const injectedScriptHandle = await context.injectedScript();
    return injectedScriptHandle.evaluateHandle((injectedScript, {
      source,
      arg
    }) => {
      return injectedScript.extend(source, arg);
    }, {
      source,
      arg
    });
  }
  async _resolveFrameForSelector(progress, selector, options, scope) {
    const elementPath = [];
    progress.cleanupWhenAborted(() => {
      // Do not await here to avoid being blocked, either by stalled
      // page (e.g. alert) or unresolved navigation in Chromium.
      for (const element of elementPath) element.dispose();
    });
    let frame = this;
    const frameChunks = (0, _selectorParser.splitSelectorByFrame)(selector);
    for (let i = 0; i < frameChunks.length - 1 && progress.isRunning(); ++i) {
      const info = this._page.parseSelector(frameChunks[i], options);
      const task = dom.waitForSelectorTask(info, 'attached', false, i === 0 ? scope : undefined);
      progress.log(`  waiting for ${this._asLocator((0, _selectorParser.stringifySelector)(frameChunks[i]) + ' >> internal:control=enter-frame')}`);
      const handle = i === 0 && scope ? await frame._runWaitForSelectorTaskOnce(progress, (0, _selectorParser.stringifySelector)(info.parsed), info.world, task) : await frame._scheduleRerunnableHandleTask(progress, info.world, task);
      const element = handle.asElement();
      const isIframe = await element.isIframeElement();
      if (isIframe === 'error:notconnected') return null; // retry
      if (!isIframe) throw new Error(`Selector "${(0, _selectorParser.stringifySelector)(info.parsed)}" resolved to ${element.preview()}, <iframe> was expected`);
      frame = await element.contentFrame();
      element.dispose();
      if (!frame) return null; // retry
    }

    return {
      frame,
      info: this._page.parseSelector(frameChunks[frameChunks.length - 1], options)
    };
  }
  async resolveFrameForSelectorNoWait(selector, options = {}, scope) {
    let frame = this;
    const frameChunks = (0, _selectorParser.splitSelectorByFrame)(selector);
    for (let i = 0; i < frameChunks.length - 1; ++i) {
      const info = this._page.parseSelector(frameChunks[i], options);
      const element = await this._page.selectors.query(frame, info, i === 0 ? scope : undefined);
      if (!element) return null;
      frame = await element.contentFrame();
      element.dispose();
      if (!frame) throw new Error(`Selector "${(0, _selectorParser.stringifySelector)(info.parsed)}" resolved to ${element.preview()}, <iframe> was expected`);
    }
    return {
      frame,
      info: this._page.parseSelector(frameChunks[frameChunks.length - 1], options)
    };
  }
  async _runWaitForSelectorTaskOnce(progress, selector, world, task) {
    const context = await this._context(world);
    const injected = await context.injectedScript();
    try {
      const pollHandler = new dom.InjectedScriptPollHandler(progress, await task(injected));
      const result = await pollHandler.finishHandle();
      progress.cleanupWhenAborted(() => result.dispose());
      return result;
    } catch (e) {
      throw new Error(`Error: frame navigated while waiting for ${this._asLocator(selector)}`);
    }
  }
  async resetStorageForCurrentOriginBestEffort(newStorage) {
    const context = await this._utilityContext();
    await context.evaluate(async ({
      ls
    }) => {
      // Clean DOMStorage.
      sessionStorage.clear();
      localStorage.clear();

      // Add new DOM Storage values.
      for (const entry of ls || []) localStorage[entry.name] = entry.value;

      // Clean Service Workers
      const registrations = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : [];
      await Promise.all(registrations.map(r => r.unregister())).catch(() => {});

      // Clean IndexedDB
      for (const db of (await ((_indexedDB$databases = (_indexedDB = indexedDB).databases) === null || _indexedDB$databases === void 0 ? void 0 : _indexedDB$databases.call(_indexedDB))) || []) {
        var _indexedDB$databases, _indexedDB;
        // Do not wait for the callback - it is called on timer in Chromium (slow).
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    }, {
      ls: newStorage === null || newStorage === void 0 ? void 0 : newStorage.localStorage
    }).catch(() => {});
  }
  _asLocator(selector) {
    return (0, _locatorGenerators.asLocator)(this._page.context()._browser.options.sdkLanguage, selector);
  }
}
exports.Frame = Frame;
Frame.Events = {
  InternalNavigation: 'internalnavigation',
  AddLifecycle: 'addlifecycle',
  RemoveLifecycle: 'removelifecycle'
};
class RerunnableTask {
  constructor(data, progress, task, returnByValue) {
    this.promise = void 0;
    this.handlePromise = void 0;
    this._task = void 0;
    this._progress = void 0;
    this._returnByValue = void 0;
    this._contextData = void 0;
    this._task = task;
    this._progress = progress;
    this._returnByValue = returnByValue;
    if (returnByValue) this.promise = new _manualPromise.ManualPromise();else this.handlePromise = new _manualPromise.ManualPromise();
    this._contextData = data;
    this._contextData.rerunnableTasks.add(this);
  }
  terminate(error) {
    this._reject(error);
  }
  _resolve(value) {
    if (this.promise) this.promise.resolve(value);
    if (this.handlePromise) this.handlePromise.resolve(value);
  }
  _reject(error) {
    if (this.promise) this.promise.reject(error);
    if (this.handlePromise) this.handlePromise.reject(error);
  }
  async rerun(context) {
    try {
      const injectedScript = await context.injectedScript();
      const pollHandler = new dom.InjectedScriptPollHandler(this._progress, await this._task(injectedScript));
      const result = this._returnByValue ? await pollHandler.finish() : await pollHandler.finishHandle();
      this._contextData.rerunnableTasks.delete(this);
      this._resolve(result);
    } catch (e) {
      if (js.isJavaScriptErrorInEvaluate(e) || (0, _protocolError.isSessionClosedError)(e)) {
        this._contextData.rerunnableTasks.delete(this);
        this._reject(e);
      }

      // Unlike other places, we don't check frame for being detached since the whole scope of this
      // evaluation is within the frame's execution context. So we only let JavaScript errors and
      // session termination errors go through.

      // We will try again in the new execution context.
    }
  }
}

class SignalBarrier {
  constructor(progress) {
    this._progress = void 0;
    this._protectCount = 0;
    this._promise = new _manualPromise.ManualPromise();
    this._progress = progress;
    this.retain();
  }
  waitFor() {
    this.release();
    return this._promise;
  }
  async addFrameNavigation(frame) {
    // Auto-wait top-level navigations only.
    if (frame.parentFrame()) return;
    this.retain();
    const waiter = _helper.helper.waitForEvent(null, frame, Frame.Events.InternalNavigation, e => {
      if (!e.isPublic) return false;
      if (!e.error && this._progress) this._progress.log(`  navigated to "${frame._url}"`);
      return true;
    });
    await Promise.race([frame._page._disconnectedPromise, frame._page._crashedPromise, frame._detachedPromise, waiter.promise]).catch(e => {});
    waiter.dispose();
    this.release();
  }
  retain() {
    ++this._protectCount;
  }
  release() {
    --this._protectCount;
    if (!this._protectCount) this._promise.resolve();
  }
}
function verifyLifecycle(name, waitUntil) {
  if (waitUntil === 'networkidle0') waitUntil = 'networkidle';
  if (!types.kLifecycleEvents.has(waitUntil)) throw new Error(`${name}: expected one of (load|domcontentloaded|networkidle|commit)`);
  return waitUntil;
}