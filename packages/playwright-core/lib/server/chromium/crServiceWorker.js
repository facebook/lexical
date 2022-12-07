"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CRServiceWorker = void 0;
var _page = require("../page");
var _crExecutionContext = require("./crExecutionContext");
var _crNetworkManager = require("./crNetworkManager");
var network = _interopRequireWildcard(require("../network"));
var _browserContext = require("../browserContext");
var _utils = require("../../utils");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
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

class CRServiceWorker extends _page.Worker {
  constructor(browserContext, session, url) {
    super(browserContext, url);
    this._browserContext = void 0;
    this._networkManager = void 0;
    this._session = void 0;
    this._extraHTTPHeaders = null;
    this._session = session;
    this._browserContext = browserContext;
    if (!!process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS) this._networkManager = new _crNetworkManager.CRNetworkManager(session, null, this, null);
    session.once('Runtime.executionContextCreated', event => {
      this._createExecutionContext(new _crExecutionContext.CRExecutionContext(session, event.context));
    });
    if (this._networkManager && this._isNetworkInspectionEnabled()) {
      this._networkManager.initialize().catch(() => {});
      this.updateRequestInterception();
      this.updateExtraHTTPHeaders(true);
      this.updateHttpCredentials(true);
      this.updateOffline(true);
    }
    session.send('Runtime.enable', {}).catch(e => {});
    session.send('Runtime.runIfWaitingForDebugger').catch(e => {});
    session.on('Inspector.targetReloadedAfterCrash', () => {
      // Resume service worker after restart.
      session._sendMayFail('Runtime.runIfWaitingForDebugger', {});
    });
  }
  async updateOffline(initial) {
    var _this$_networkManager;
    if (!this._isNetworkInspectionEnabled()) return;
    const offline = !!this._browserContext._options.offline;
    if (!initial || offline) await ((_this$_networkManager = this._networkManager) === null || _this$_networkManager === void 0 ? void 0 : _this$_networkManager.setOffline(offline));
  }
  async updateHttpCredentials(initial) {
    var _this$_networkManager2;
    if (!this._isNetworkInspectionEnabled()) return;
    const credentials = this._browserContext._options.httpCredentials || null;
    if (!initial || credentials) await ((_this$_networkManager2 = this._networkManager) === null || _this$_networkManager2 === void 0 ? void 0 : _this$_networkManager2.authenticate(credentials));
  }
  async updateExtraHTTPHeaders(initial) {
    if (!this._isNetworkInspectionEnabled()) return;
    const headers = network.mergeHeaders([this._browserContext._options.extraHTTPHeaders, this._extraHTTPHeaders]);
    if (!initial || headers.length) await this._session.send('Network.setExtraHTTPHeaders', {
      headers: (0, _utils.headersArrayToObject)(headers, false /* lowerCase */)
    });
  }

  updateRequestInterception() {
    if (!this._networkManager || !this._isNetworkInspectionEnabled()) return Promise.resolve();
    return this._networkManager.setRequestInterception(this.needsRequestInterception()).catch(e => {});
  }
  needsRequestInterception() {
    return this._isNetworkInspectionEnabled() && !!this._browserContext._requestInterceptor;
  }
  reportRequestFinished(request, response) {
    this._browserContext.emit(_browserContext.BrowserContext.Events.RequestFinished, {
      request,
      response
    });
  }
  requestFailed(request, _canceled) {
    this._browserContext.emit(_browserContext.BrowserContext.Events.RequestFailed, request);
  }
  requestReceivedResponse(response) {
    this._browserContext.emit(_browserContext.BrowserContext.Events.Response, response);
  }
  requestStarted(request, route) {
    this._browserContext.emit(_browserContext.BrowserContext.Events.Request, request);
    if (route) {
      const r = new network.Route(request, route);
      if (this._browserContext._requestInterceptor) {
        this._browserContext._requestInterceptor(r, request);
        return;
      }
      r.continue();
    }
  }
  _isNetworkInspectionEnabled() {
    return this._browserContext._options.serviceWorkers === 'allow';
  }
}
exports.CRServiceWorker = CRServiceWorker;