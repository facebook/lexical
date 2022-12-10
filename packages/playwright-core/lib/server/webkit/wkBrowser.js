"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WKBrowserContext = exports.WKBrowser = void 0;
var _browser = require("../browser");
var _browserContext = require("../browserContext");
var _utils = require("../../utils");
var _eventsHelper = require("../../utils/eventsHelper");
var network = _interopRequireWildcard(require("../network"));
var _wkConnection = require("./wkConnection");
var _wkPage = require("./wkPage");
var _errors = require("../../common/errors");
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

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15';
const BROWSER_VERSION = '16.4';
class WKBrowser extends _browser.Browser {
  static async connect(transport, options) {
    const browser = new WKBrowser(transport, options);
    if (options.__testHookOnConnectToBrowser) await options.__testHookOnConnectToBrowser();
    const promises = [browser._browserSession.send('Playwright.enable')];
    if (options.persistent) {
      browser._defaultContext = new WKBrowserContext(browser, undefined, options.persistent);
      promises.push(browser._defaultContext._initialize());
    }
    await Promise.all(promises);
    return browser;
  }
  constructor(transport, options) {
    super(options);
    this._connection = void 0;
    this._browserSession = void 0;
    this._contexts = new Map();
    this._wkPages = new Map();
    this._eventListeners = void 0;
    this._connection = new _wkConnection.WKConnection(transport, this._onDisconnect.bind(this), options.protocolLogger, options.browserLogsCollector);
    this._browserSession = this._connection.browserSession;
    this._eventListeners = [_eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.pageProxyCreated', this._onPageProxyCreated.bind(this)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.pageProxyDestroyed', this._onPageProxyDestroyed.bind(this)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.provisionalLoadFailed', event => this._onProvisionalLoadFailed(event)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.windowOpen', event => this._onWindowOpen(event)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.downloadCreated', this._onDownloadCreated.bind(this)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.downloadFilenameSuggested', this._onDownloadFilenameSuggested.bind(this)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.downloadFinished', this._onDownloadFinished.bind(this)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, 'Playwright.screencastFinished', this._onScreencastFinished.bind(this)), _eventsHelper.eventsHelper.addEventListener(this._browserSession, _wkConnection.kPageProxyMessageReceived, this._onPageProxyMessageReceived.bind(this))];
  }
  _onDisconnect() {
    for (const wkPage of this._wkPages.values()) wkPage.dispose(true);
    for (const video of this._idToVideo.values()) video.artifact.reportFinished(_errors.kBrowserClosedError);
    this._idToVideo.clear();
    this._didClose();
  }
  async doCreateNewContext(options) {
    const createOptions = options.proxy ? {
      proxyServer: options.proxy.server,
      proxyBypassList: options.proxy.bypass
    } : undefined;
    const {
      browserContextId
    } = await this._browserSession.send('Playwright.createContext', createOptions);
    options.userAgent = options.userAgent || DEFAULT_USER_AGENT;
    const context = new WKBrowserContext(this, browserContextId, options);
    await context._initialize();
    this._contexts.set(browserContextId, context);
    return context;
  }
  contexts() {
    return Array.from(this._contexts.values());
  }
  version() {
    return BROWSER_VERSION;
  }
  userAgent() {
    return DEFAULT_USER_AGENT;
  }
  _onDownloadCreated(payload) {
    const page = this._wkPages.get(payload.pageProxyId);
    if (!page) return;
    // In some cases, e.g. blob url download, we receive only frameScheduledNavigation
    // but no signals that the navigation was canceled and replaced by download. Fix it
    // here by simulating cancelled provisional load which matches downloads from network.
    //
    // TODO: this is racy, because download might be unrelated any navigation, and we will
    // abort navgitation that is still running. We should be able to fix this by
    // instrumenting policy decision start/proceed/cancel.
    page._page._frameManager.frameAbortedNavigation(payload.frameId, 'Download is starting');
    let originPage = page._initializedPage;
    // If it's a new window download, report it on the opener page.
    if (!originPage) {
      // Resume the page creation with an error. The page will automatically close right
      // after the download begins.
      page._firstNonInitialNavigationCommittedReject(new Error('Starting new page download'));
      if (page._opener) originPage = page._opener._initializedPage;
    }
    if (!originPage) return;
    this._downloadCreated(originPage, payload.uuid, payload.url);
  }
  _onDownloadFilenameSuggested(payload) {
    this._downloadFilenameSuggested(payload.uuid, payload.suggestedFilename);
  }
  _onDownloadFinished(payload) {
    this._downloadFinished(payload.uuid, payload.error);
  }
  _onScreencastFinished(payload) {
    var _this$_takeVideo;
    (_this$_takeVideo = this._takeVideo(payload.screencastId)) === null || _this$_takeVideo === void 0 ? void 0 : _this$_takeVideo.reportFinished();
  }
  _onPageProxyCreated(event) {
    const pageProxyId = event.pageProxyId;
    let context = null;
    if (event.browserContextId) {
      // FIXME: we don't know about the default context id, so assume that all targets from
      // unknown contexts are created in the 'default' context which can in practice be represented
      // by multiple actual contexts in WebKit. Solving this properly will require adding context
      // lifecycle events.
      context = this._contexts.get(event.browserContextId) || null;
    }
    if (!context) context = this._defaultContext;
    if (!context) return;
    const pageProxySession = new _wkConnection.WKSession(this._connection, pageProxyId, `Target closed`, message => {
      this._connection.rawSend({
        ...message,
        pageProxyId
      });
    });
    const opener = event.openerId ? this._wkPages.get(event.openerId) : undefined;
    const wkPage = new _wkPage.WKPage(context, pageProxySession, opener || null);
    this._wkPages.set(pageProxyId, wkPage);
  }
  _onPageProxyDestroyed(event) {
    const pageProxyId = event.pageProxyId;
    const wkPage = this._wkPages.get(pageProxyId);
    if (!wkPage) return;
    wkPage.didClose();
    wkPage.dispose(false);
    this._wkPages.delete(pageProxyId);
  }
  _onPageProxyMessageReceived(event) {
    const wkPage = this._wkPages.get(event.pageProxyId);
    if (!wkPage) return;
    wkPage.dispatchMessageToSession(event.message);
  }
  _onProvisionalLoadFailed(event) {
    const wkPage = this._wkPages.get(event.pageProxyId);
    if (!wkPage) return;
    wkPage.handleProvisionalLoadFailed(event);
  }
  _onWindowOpen(event) {
    const wkPage = this._wkPages.get(event.pageProxyId);
    if (!wkPage) return;
    wkPage.handleWindowOpen(event);
  }
  isConnected() {
    return !this._connection.isClosed();
  }
}
exports.WKBrowser = WKBrowser;
class WKBrowserContext extends _browserContext.BrowserContext {
  constructor(browser, browserContextId, options) {
    super(browser, options, browserContextId);
    this._authenticateProxyViaHeader();
  }
  async _initialize() {
    (0, _utils.assert)(!this._wkPages().length);
    const browserContextId = this._browserContextId;
    const promises = [super._initialize()];
    promises.push(this._browser._browserSession.send('Playwright.setDownloadBehavior', {
      behavior: this._options.acceptDownloads ? 'allow' : 'deny',
      downloadPath: this._browser.options.downloadsPath,
      browserContextId
    }));
    if (this._options.ignoreHTTPSErrors) promises.push(this._browser._browserSession.send('Playwright.setIgnoreCertificateErrors', {
      browserContextId,
      ignore: true
    }));
    if (this._options.locale) promises.push(this._browser._browserSession.send('Playwright.setLanguages', {
      browserContextId,
      languages: [this._options.locale]
    }));
    if (this._options.geolocation) promises.push(this.setGeolocation(this._options.geolocation));
    if (this._options.offline) promises.push(this.setOffline(this._options.offline));
    if (this._options.httpCredentials) promises.push(this.setHTTPCredentials(this._options.httpCredentials));
    await Promise.all(promises);
  }
  _wkPages() {
    return Array.from(this._browser._wkPages.values()).filter(wkPage => wkPage._browserContext === this);
  }
  pages() {
    return this._wkPages().map(wkPage => wkPage._initializedPage).filter(pageOrNull => !!pageOrNull);
  }
  async newPageDelegate() {
    (0, _browserContext.assertBrowserContextIsNotOwned)(this);
    const {
      pageProxyId
    } = await this._browser._browserSession.send('Playwright.createPage', {
      browserContextId: this._browserContextId
    });
    return this._browser._wkPages.get(pageProxyId);
  }
  async doGetCookies(urls) {
    const {
      cookies
    } = await this._browser._browserSession.send('Playwright.getAllCookies', {
      browserContextId: this._browserContextId
    });
    return network.filterCookies(cookies.map(c => {
      const copy = {
        ...c
      };
      copy.expires = c.expires === -1 ? -1 : c.expires / 1000;
      delete copy.session;
      return copy;
    }), urls);
  }
  async addCookies(cookies) {
    const cc = network.rewriteCookies(cookies).map(c => ({
      ...c,
      session: c.expires === -1 || c.expires === undefined,
      expires: c.expires && c.expires !== -1 ? c.expires * 1000 : c.expires
    }));
    await this._browser._browserSession.send('Playwright.setCookies', {
      cookies: cc,
      browserContextId: this._browserContextId
    });
  }
  async clearCookies() {
    await this._browser._browserSession.send('Playwright.deleteAllCookies', {
      browserContextId: this._browserContextId
    });
  }
  async doGrantPermissions(origin, permissions) {
    await Promise.all(this.pages().map(page => page._delegate._grantPermissions(origin, permissions)));
  }
  async doClearPermissions() {
    await Promise.all(this.pages().map(page => page._delegate._clearPermissions()));
  }
  async setGeolocation(geolocation) {
    (0, _browserContext.verifyGeolocation)(geolocation);
    this._options.geolocation = geolocation;
    const payload = geolocation ? {
      ...geolocation,
      timestamp: Date.now()
    } : undefined;
    await this._browser._browserSession.send('Playwright.setGeolocationOverride', {
      browserContextId: this._browserContextId,
      geolocation: payload
    });
  }
  async setExtraHTTPHeaders(headers) {
    this._options.extraHTTPHeaders = headers;
    for (const page of this.pages()) await page._delegate.updateExtraHTTPHeaders();
  }
  async setUserAgent(userAgent) {
    this._options.userAgent = userAgent;
    for (const page of this.pages()) await page._delegate.updateUserAgent();
  }
  async setOffline(offline) {
    this._options.offline = offline;
    for (const page of this.pages()) await page._delegate.updateOffline();
  }
  async doSetHTTPCredentials(httpCredentials) {
    this._options.httpCredentials = httpCredentials;
    for (const page of this.pages()) await page._delegate.updateHttpCredentials();
  }
  async doAddInitScript(source) {
    for (const page of this.pages()) await page._delegate._updateBootstrapScript();
  }
  async doRemoveInitScripts() {
    for (const page of this.pages()) await page._delegate._updateBootstrapScript();
  }
  async doExposeBinding(binding) {
    for (const page of this.pages()) await page._delegate.exposeBinding(binding);
  }
  async doRemoveExposedBindings() {
    for (const page of this.pages()) await page._delegate.removeExposedBindings();
  }
  async doUpdateRequestInterception() {
    for (const page of this.pages()) await page._delegate.updateRequestInterception();
  }
  onClosePersistent() {}
  async doClose() {
    if (!this._browserContextId) {
      await Promise.all(this._wkPages().map(wkPage => wkPage._stopVideo()));
      // Closing persistent context should close the browser.
      await this._browser.close();
    } else {
      await this._browser._browserSession.send('Playwright.deleteContext', {
        browserContextId: this._browserContextId
      });
      this._browser._contexts.delete(this._browserContextId);
    }
  }
  async cancelDownload(uuid) {
    await this._browser._browserSession.send('Playwright.cancelDownload', {
      uuid
    });
  }
}
exports.WKBrowserContext = WKBrowserContext;