"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserContext = void 0;
exports.assertBrowserContextIsNotOwned = assertBrowserContextIsNotOwned;
exports.normalizeProxySettings = normalizeProxySettings;
exports.validateBrowserContextOptions = validateBrowserContextOptions;
exports.verifyGeolocation = verifyGeolocation;
var os = _interopRequireWildcard(require("os"));
var _timeoutSettings = require("../common/timeoutSettings");
var _utils = require("../utils");
var _fileUtils = require("../utils/fileUtils");
var _helper = require("./helper");
var network = _interopRequireWildcard(require("./network"));
var _page6 = require("./page");
var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _instrumentation = require("./instrumentation");
var _debugger = require("./debugger");
var _tracing = require("./trace/recorder/tracing");
var _harRecorder = require("./har/harRecorder");
var _recorder = require("./recorder");
var consoleApiSource = _interopRequireWildcard(require("../generated/consoleApiSource"));
var _fetch = require("./fetch");
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

class BrowserContext extends _instrumentation.SdkObject {
  constructor(browser, options, browserContextId) {
    super(browser, 'browser-context');
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings();
    this._pageBindings = new Map();
    this._activeProgressControllers = new Set();
    this._options = void 0;
    this._requestInterceptor = void 0;
    this._isPersistentContext = void 0;
    this._closedStatus = 'open';
    this._closePromise = void 0;
    this._closePromiseFulfill = void 0;
    this._permissions = new Map();
    this._downloads = new Set();
    this._browser = void 0;
    this._browserContextId = void 0;
    this._selectors = void 0;
    this._origins = new Set();
    this._harRecorders = new Map();
    this.tracing = void 0;
    this.fetchRequest = void 0;
    this._customCloseHandler = void 0;
    this._tempDirs = [];
    this._settingStorageState = false;
    this.initScripts = [];
    this._routesInFlight = new Set();
    this._debugger = void 0;
    this.attribution.context = this;
    this._browser = browser;
    this._options = options;
    this._browserContextId = browserContextId;
    this._isPersistentContext = !browserContextId;
    this._closePromise = new Promise(fulfill => this._closePromiseFulfill = fulfill);
    this.fetchRequest = new _fetch.BrowserContextAPIRequestContext(this);
    if (this._options.recordHar) this._harRecorders.set('', new _harRecorder.HarRecorder(this, null, this._options.recordHar));
    this.tracing = new _tracing.Tracing(this, browser.options.tracesDir);
  }
  isPersistentContext() {
    return this._isPersistentContext;
  }
  setSelectors(selectors) {
    this._selectors = selectors;
    for (const page of this.pages()) page.selectors = selectors;
  }
  selectors() {
    return this._selectors || this._browser.options.selectors;
  }
  async _initialize() {
    if (this.attribution.isInternalPlaywright) return;
    // Debugger will pause execution upon page.pause in headed mode.
    this._debugger = new _debugger.Debugger(this);

    // When PWDEBUG=1, show inspector for each context.
    if ((0, _utils.debugMode)() === 'inspector') await _recorder.Recorder.show(this, {
      pauseOnNextStatement: true
    });

    // When paused, show inspector.
    if (this._debugger.isPaused()) _recorder.Recorder.showInspector(this);
    this._debugger.on(_debugger.Debugger.Events.PausedStateChanged, () => {
      _recorder.Recorder.showInspector(this);
    });
    if ((0, _utils.debugMode)() === 'console') await this.extendInjectedScript(consoleApiSource.source);
    if (this._options.serviceWorkers === 'block') await this.addInitScript(`\nnavigator.serviceWorker.register = () => { console.warn('Service Worker registration blocked by Playwright'); };\n`);
    if (this._options.permissions) await this.grantPermissions(this._options.permissions);
  }
  debugger() {
    return this._debugger;
  }
  async _ensureVideosPath() {
    if (this._options.recordVideo) await (0, _fileUtils.mkdirIfNeeded)(_path.default.join(this._options.recordVideo.dir, 'dummy'));
  }
  canResetForReuse() {
    if (this._closedStatus !== 'open') return false;
    return true;
  }
  async stopPendingOperations() {
    for (const controller of this._activeProgressControllers) controller.abort(new Error(`Context was reset for reuse.`));
  }
  static reusableContextHash(params) {
    const paramsCopy = {
      ...params
    };
    for (const k of Object.keys(paramsCopy)) {
      const key = k;
      if (paramsCopy[key] === defaultNewContextParamValues[key]) delete paramsCopy[key];
    }
    for (const key of paramsThatAllowContextReuse) delete paramsCopy[key];
    return JSON.stringify(paramsCopy);
  }
  async resetForReuse(metadata, params) {
    var _page, _page2, _page3, _page4, _page5;
    this.setDefaultNavigationTimeout(undefined);
    this.setDefaultTimeout(undefined);
    if (params) {
      for (const key of paramsThatAllowContextReuse) this._options[key] = params[key];
    }
    await this._cancelAllRoutesInFlight();

    // Close extra pages early.
    let page = this.pages()[0];
    const [, ...otherPages] = this.pages();
    for (const p of otherPages) await p.close(metadata);
    if (page && page._crashedPromise.isDone()) {
      await page.close(metadata);
      page = undefined;
    }

    // Unless dialogs are dismissed, setting extra http headers below does not respond.
    (_page = page) === null || _page === void 0 ? void 0 : _page._frameManager.setCloseAllOpeningDialogs(true);
    await ((_page2 = page) === null || _page2 === void 0 ? void 0 : _page2._frameManager.closeOpenDialogs());
    // Navigate to about:blank first to ensure no page scripts are running after this point.
    await ((_page3 = page) === null || _page3 === void 0 ? void 0 : _page3.mainFrame().goto(metadata, 'about:blank', {
      timeout: 0
    }));
    (_page4 = page) === null || _page4 === void 0 ? void 0 : _page4._frameManager.setCloseAllOpeningDialogs(false);
    await this._resetStorage();
    await this._removeExposedBindings();
    await this._removeInitScripts();
    // TODO: following can be optimized to not perform noops.
    if (this._options.permissions) await this.grantPermissions(this._options.permissions);else await this.clearPermissions();
    await this.setExtraHTTPHeaders(this._options.extraHTTPHeaders || []);
    await this.setGeolocation(this._options.geolocation);
    await this.setOffline(!!this._options.offline);
    await this.setUserAgent(this._options.userAgent);
    await this._resetCookies();
    await ((_page5 = page) === null || _page5 === void 0 ? void 0 : _page5.resetForReuse(metadata));
  }
  _browserClosed() {
    for (const page of this.pages()) page._didClose();
    this._didCloseInternal();
  }
  _didCloseInternal() {
    if (this._closedStatus === 'closed') {
      // We can come here twice if we close browser context and browser
      // at the same time.
      return;
    }
    this._closedStatus = 'closed';
    this._deleteAllDownloads();
    this._downloads.clear();
    this.tracing.dispose().catch(() => {});
    if (this._isPersistentContext) this.onClosePersistent();
    this._closePromiseFulfill(new Error('Context closed'));
    this.emit(BrowserContext.Events.Close);
  }

  // BrowserContext methods.

  async cookies(urls = []) {
    if (urls && !Array.isArray(urls)) urls = [urls];
    return await this.doGetCookies(urls);
  }
  setHTTPCredentials(httpCredentials) {
    return this.doSetHTTPCredentials(httpCredentials);
  }
  async exposeBinding(name, needsHandle, playwrightBinding) {
    if (this._pageBindings.has(name)) throw new Error(`Function "${name}" has been already registered`);
    for (const page of this.pages()) {
      if (page.getBinding(name)) throw new Error(`Function "${name}" has been already registered in one of the pages`);
    }
    const binding = new _page6.PageBinding(name, playwrightBinding, needsHandle);
    this._pageBindings.set(name, binding);
    await this.doExposeBinding(binding);
  }
  async _removeExposedBindings() {
    for (const key of this._pageBindings.keys()) {
      if (!key.startsWith('__pw')) this._pageBindings.delete(key);
    }
    await this.doRemoveExposedBindings();
  }
  async grantPermissions(permissions, origin) {
    let resolvedOrigin = '*';
    if (origin) {
      const url = new URL(origin);
      resolvedOrigin = url.origin;
    }
    const existing = new Set(this._permissions.get(resolvedOrigin) || []);
    permissions.forEach(p => existing.add(p));
    const list = [...existing.values()];
    this._permissions.set(resolvedOrigin, list);
    await this.doGrantPermissions(resolvedOrigin, list);
  }
  async clearPermissions() {
    this._permissions.clear();
    await this.doClearPermissions();
  }
  setDefaultNavigationTimeout(timeout) {
    this._timeoutSettings.setDefaultNavigationTimeout(timeout);
  }
  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);
  }
  async _loadDefaultContextAsIs(progress) {
    if (!this.pages().length) {
      const waitForEvent = _helper.helper.waitForEvent(progress, this, BrowserContext.Events.Page);
      progress.cleanupWhenAborted(() => waitForEvent.dispose);
      const page = await waitForEvent.promise;
      if (page._pageIsError) throw page._pageIsError;
    }
    const pages = this.pages();
    if (pages[0]._pageIsError) throw pages[0]._pageIsError;
    await pages[0].mainFrame()._waitForLoadState(progress, 'load');
    return pages;
  }
  async _loadDefaultContext(progress) {
    const pages = await this._loadDefaultContextAsIs(progress);
    const browserName = this._browser.options.name;
    if (this._options.isMobile && browserName === 'chromium' || this._options.locale && browserName === 'webkit') {
      // Workaround for:
      // - chromium fails to change isMobile for existing page;
      // - webkit fails to change locale for existing page.
      const oldPage = pages[0];
      await this.newPage(progress.metadata);
      await oldPage.close(progress.metadata);
    }
  }
  _authenticateProxyViaHeader() {
    const proxy = this._options.proxy || this._browser.options.proxy || {
      username: undefined,
      password: undefined
    };
    const {
      username,
      password
    } = proxy;
    if (username) {
      this._options.httpCredentials = {
        username,
        password: password
      };
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      this._options.extraHTTPHeaders = network.mergeHeaders([this._options.extraHTTPHeaders, network.singleHeader('Proxy-Authorization', `Basic ${token}`)]);
    }
  }
  _authenticateProxyViaCredentials() {
    const proxy = this._options.proxy || this._browser.options.proxy;
    if (!proxy) return;
    const {
      username,
      password
    } = proxy;
    if (username) this._options.httpCredentials = {
      username,
      password: password || ''
    };
  }
  async addInitScript(script) {
    this.initScripts.push(script);
    await this.doAddInitScript(script);
  }
  async _removeInitScripts() {
    this.initScripts.splice(0, this.initScripts.length);
    await this.doRemoveInitScripts();
  }
  async setRequestInterceptor(handler) {
    this._requestInterceptor = handler;
    await this.doUpdateRequestInterception();
  }
  isClosingOrClosed() {
    return this._closedStatus !== 'open';
  }
  async _deleteAllDownloads() {
    await Promise.all(Array.from(this._downloads).map(download => download.artifact.deleteOnContextClose()));
  }
  async _deleteAllTempDirs() {
    await Promise.all(this._tempDirs.map(async dir => await _fs.default.promises.unlink(dir).catch(e => {})));
  }
  setCustomCloseHandler(handler) {
    this._customCloseHandler = handler;
  }
  async close(metadata) {
    if (this._closedStatus === 'open') {
      this.emit(BrowserContext.Events.BeforeClose);
      this._closedStatus = 'closing';
      for (const harRecorder of this._harRecorders.values()) await harRecorder.flush();
      await this.tracing.dispose();

      // Cleanup.
      const promises = [];
      for (const {
        context,
        artifact
      } of this._browser._idToVideo.values()) {
        // Wait for the videos to finish.
        if (context === this) promises.push(artifact.finishedPromise());
      }
      if (this._customCloseHandler) {
        await this._customCloseHandler();
      } else {
        // Close the context.
        await this.doClose();
      }

      // We delete downloads after context closure
      // so that browser does not write to the download file anymore.
      promises.push(this._deleteAllDownloads());
      promises.push(this._deleteAllTempDirs());
      await Promise.all(promises);

      // Custom handler should trigger didCloseInternal itself.
      if (!this._customCloseHandler) this._didCloseInternal();
    }
    await this._closePromise;
  }
  async newPage(metadata) {
    const pageDelegate = await this.newPageDelegate();
    if (metadata.isServerSide) pageDelegate.potentiallyUninitializedPage().markAsServerSideOnly();
    const pageOrError = await pageDelegate.pageOrError();
    if (pageOrError instanceof _page6.Page) {
      if (pageOrError.isClosed()) throw new Error('Page has been closed.');
      return pageOrError;
    }
    throw pageOrError;
  }
  addVisitedOrigin(origin) {
    this._origins.add(origin);
  }
  async storageState() {
    const result = {
      cookies: await this.cookies(),
      origins: []
    };
    if (this._origins.size) {
      const internalMetadata = (0, _instrumentation.serverSideCallMetadata)();
      const page = await this.newPage(internalMetadata);
      await page._setServerRequestInterceptor(handler => {
        handler.fulfill({
          body: '<html></html>'
        }).catch(() => {});
      });
      for (const origin of this._origins) {
        const originStorage = {
          origin,
          localStorage: []
        };
        const frame = page.mainFrame();
        await frame.goto(internalMetadata, origin);
        const storage = await frame.evaluateExpression(`({
          localStorage: Object.keys(localStorage).map(name => ({ name, value: localStorage.getItem(name) })),
        })`, false, undefined, 'utility');
        originStorage.localStorage = storage.localStorage;
        if (storage.localStorage.length) result.origins.push(originStorage);
      }
      await page.close(internalMetadata);
    }
    return result;
  }
  async _resetStorage() {
    var _this$_options$storag, _this$_options$storag2;
    const oldOrigins = this._origins;
    const newOrigins = new Map(((_this$_options$storag = this._options.storageState) === null || _this$_options$storag === void 0 ? void 0 : (_this$_options$storag2 = _this$_options$storag.origins) === null || _this$_options$storag2 === void 0 ? void 0 : _this$_options$storag2.map(p => [p.origin, p])) || []);
    if (!oldOrigins.size && !newOrigins.size) return;
    let page = this.pages()[0];
    const internalMetadata = (0, _instrumentation.serverSideCallMetadata)();
    page = page || (await this.newPage(internalMetadata));
    await page._setServerRequestInterceptor(handler => {
      handler.fulfill({
        body: '<html></html>'
      }).catch(() => {});
    });
    for (const origin of new Set([...oldOrigins, ...newOrigins.keys()])) {
      const frame = page.mainFrame();
      await frame.goto(internalMetadata, origin);
      await frame.resetStorageForCurrentOriginBestEffort(newOrigins.get(origin));
    }
    await page._setServerRequestInterceptor(undefined);
    this._origins = new Set([...newOrigins.keys()]);
    // It is safe to not restore the URL to about:blank since we are doing it in Page::resetForReuse.
  }

  async _resetCookies() {
    var _this$_options$storag3, _this$_options$storag4;
    await this.clearCookies();
    if ((_this$_options$storag3 = this._options.storageState) !== null && _this$_options$storag3 !== void 0 && _this$_options$storag3.cookies) await this.addCookies((_this$_options$storag4 = this._options.storageState) === null || _this$_options$storag4 === void 0 ? void 0 : _this$_options$storag4.cookies);
  }
  isSettingStorageState() {
    return this._settingStorageState;
  }
  async setStorageState(metadata, state) {
    this._settingStorageState = true;
    try {
      if (state.cookies) await this.addCookies(state.cookies);
      if (state.origins && state.origins.length) {
        const internalMetadata = (0, _instrumentation.serverSideCallMetadata)();
        const page = await this.newPage(internalMetadata);
        await page._setServerRequestInterceptor(handler => {
          handler.fulfill({
            body: '<html></html>'
          }).catch(() => {});
        });
        for (const originState of state.origins) {
          const frame = page.mainFrame();
          await frame.goto(metadata, originState.origin);
          await frame.evaluateExpression(`
            originState => {
              for (const { name, value } of (originState.localStorage || []))
                localStorage.setItem(name, value);
            }`, true, originState, 'utility');
        }
        await page.close(internalMetadata);
      }
    } finally {
      this._settingStorageState = false;
    }
  }
  async extendInjectedScript(source, arg) {
    const installInFrame = frame => frame.extendInjectedScript(source, arg).catch(() => {});
    const installInPage = page => {
      page.on(_page6.Page.Events.InternalFrameNavigatedToNewDocument, installInFrame);
      return Promise.all(page.frames().map(installInFrame));
    };
    this.on(BrowserContext.Events.Page, installInPage);
    return Promise.all(this.pages().map(installInPage));
  }
  async _harStart(page, options) {
    const harId = (0, _utils.createGuid)();
    this._harRecorders.set(harId, new _harRecorder.HarRecorder(this, page, options));
    return harId;
  }
  async _harExport(harId) {
    const recorder = this._harRecorders.get(harId || '');
    return recorder.export();
  }
  addRouteInFlight(route) {
    this._routesInFlight.add(route);
  }
  removeRouteInFlight(route) {
    this._routesInFlight.delete(route);
  }
  async _cancelAllRoutesInFlight() {
    await Promise.all([...this._routesInFlight].map(r => r.abort())).catch(() => {});
    this._routesInFlight.clear();
  }
}
exports.BrowserContext = BrowserContext;
BrowserContext.Events = {
  Close: 'close',
  Page: 'page',
  Request: 'request',
  Response: 'response',
  RequestFailed: 'requestfailed',
  RequestFinished: 'requestfinished',
  BeforeClose: 'beforeclose',
  VideoStarted: 'videostarted'
};
function assertBrowserContextIsNotOwned(context) {
  for (const page of context.pages()) {
    if (page._ownedContext) throw new Error('Please use browser.newContext() for multi-page scripts that share the context.');
  }
}
function validateBrowserContextOptions(options, browserOptions) {
  if (options.noDefaultViewport && options.deviceScaleFactor !== undefined) throw new Error(`"deviceScaleFactor" option is not supported with null "viewport"`);
  if (options.noDefaultViewport && options.isMobile !== undefined) throw new Error(`"isMobile" option is not supported with null "viewport"`);
  if (options.acceptDownloads === undefined) options.acceptDownloads = true;
  if (!options.viewport && !options.noDefaultViewport) options.viewport = {
    width: 1280,
    height: 720
  };
  if (options.recordVideo) {
    if (!options.recordVideo.size) {
      if (options.noDefaultViewport) {
        options.recordVideo.size = {
          width: 800,
          height: 600
        };
      } else {
        const size = options.viewport;
        const scale = Math.min(1, 800 / Math.max(size.width, size.height));
        options.recordVideo.size = {
          width: Math.floor(size.width * scale),
          height: Math.floor(size.height * scale)
        };
      }
    }
    // Make sure both dimensions are odd, this is required for vp8
    options.recordVideo.size.width &= ~1;
    options.recordVideo.size.height &= ~1;
  }
  if (options.proxy) {
    if (!browserOptions.proxy && browserOptions.isChromium && os.platform() === 'win32') throw new Error(`Browser needs to be launched with the global proxy. If all contexts override the proxy, global proxy will be never used and can be any string, for example "launch({ proxy: { server: 'http://per-context' } })"`);
    options.proxy = normalizeProxySettings(options.proxy);
  }
  verifyGeolocation(options.geolocation);
}
function verifyGeolocation(geolocation) {
  if (!geolocation) return;
  geolocation.accuracy = geolocation.accuracy || 0;
  const {
    longitude,
    latitude,
    accuracy
  } = geolocation;
  if (longitude < -180 || longitude > 180) throw new Error(`geolocation.longitude: precondition -180 <= LONGITUDE <= 180 failed.`);
  if (latitude < -90 || latitude > 90) throw new Error(`geolocation.latitude: precondition -90 <= LATITUDE <= 90 failed.`);
  if (accuracy < 0) throw new Error(`geolocation.accuracy: precondition 0 <= ACCURACY failed.`);
}
function normalizeProxySettings(proxy) {
  let {
    server,
    bypass
  } = proxy;
  let url;
  try {
    // new URL('127.0.0.1:8080') throws
    // new URL('localhost:8080') fails to parse host or protocol
    // In both of these cases, we need to try re-parse URL with `http://` prefix.
    url = new URL(server);
    if (!url.host || !url.protocol) url = new URL('http://' + server);
  } catch (e) {
    url = new URL('http://' + server);
  }
  if (url.protocol === 'socks4:' && (proxy.username || proxy.password)) throw new Error(`Socks4 proxy protocol does not support authentication`);
  if (url.protocol === 'socks5:' && (proxy.username || proxy.password)) throw new Error(`Browser does not support socks5 proxy authentication`);
  server = url.protocol + '//' + url.host;
  if (bypass) bypass = bypass.split(',').map(t => t.trim()).join(',');
  return {
    ...proxy,
    server,
    bypass
  };
}
const paramsThatAllowContextReuse = ['colorScheme', 'forcedColors', 'reducedMotion', 'screen', 'userAgent', 'viewport'];
const defaultNewContextParamValues = {
  noDefaultViewport: false,
  ignoreHTTPSErrors: false,
  javaScriptEnabled: true,
  bypassCSP: false,
  offline: false,
  isMobile: false,
  hasTouch: false,
  acceptDownloads: true,
  strictSelectors: false,
  serviceWorkers: 'allow',
  locale: 'en-US'
};