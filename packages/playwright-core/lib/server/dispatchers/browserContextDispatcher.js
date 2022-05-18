"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserContextDispatcher = void 0;

var _browserContext = require("../browserContext");

var _dispatcher = require("./dispatcher");

var _pageDispatcher = require("./pageDispatcher");

var _networkDispatchers = require("./networkDispatchers");

var _crBrowser = require("../chromium/crBrowser");

var _cdpSessionDispatcher = require("./cdpSessionDispatcher");

var _recorder = require("../recorder");

var _artifactDispatcher = require("./artifactDispatcher");

var _tracingDispatcher = require("./tracingDispatcher");

var fs = _interopRequireWildcard(require("fs"));

var path = _interopRequireWildcard(require("path"));

var _utils = require("../../utils");

var _writableStreamDispatcher = require("./writableStreamDispatcher");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
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
class BrowserContextDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, context) {
    super(scope, context, 'BrowserContext', {
      isChromium: context._browser.options.isChromium,
      APIRequestContext: _networkDispatchers.APIRequestContextDispatcher.from(scope, context.fetchRequest),
      tracing: _tracingDispatcher.TracingDispatcher.from(scope, context.tracing)
    }, true);
    this._type_EventTarget = true;
    this._type_BrowserContext = true;
    this._context = void 0;
    this._context = context; // Note: when launching persistent context, dispatcher is created very late,
    // so we can already have pages, videos and everything else.

    const onVideo = artifact => {
      // Note: Video must outlive Page and BrowserContext, so that client can saveAs it
      // after closing the context. We use |scope| for it.
      const artifactDispatcher = new _artifactDispatcher.ArtifactDispatcher(scope, artifact);

      this._dispatchEvent('video', {
        artifact: artifactDispatcher
      });
    };

    context.on(_browserContext.BrowserContext.Events.VideoStarted, onVideo);

    for (const video of context._browser._idToVideo.values()) {
      if (video.context === context) onVideo(video.artifact);
    }

    for (const page of context.pages()) this._dispatchEvent('page', {
      page: new _pageDispatcher.PageDispatcher(this._scope, page)
    });

    context.on(_browserContext.BrowserContext.Events.Page, page => this._dispatchEvent('page', {
      page: new _pageDispatcher.PageDispatcher(this._scope, page)
    }));
    context.on(_browserContext.BrowserContext.Events.Close, () => {
      this._dispatchEvent('close');

      this._dispose();
    });

    if (context._browser.options.name === 'chromium') {
      for (const page of context.backgroundPages()) this._dispatchEvent('backgroundPage', {
        page: new _pageDispatcher.PageDispatcher(this._scope, page)
      });

      context.on(_crBrowser.CRBrowserContext.CREvents.BackgroundPage, page => this._dispatchEvent('backgroundPage', {
        page: new _pageDispatcher.PageDispatcher(this._scope, page)
      }));

      for (const serviceWorker of context.serviceWorkers()) this._dispatchEvent('serviceWorker', {
        worker: new _pageDispatcher.WorkerDispatcher(this._scope, serviceWorker)
      });

      context.on(_crBrowser.CRBrowserContext.CREvents.ServiceWorker, serviceWorker => this._dispatchEvent('serviceWorker', {
        worker: new _pageDispatcher.WorkerDispatcher(this._scope, serviceWorker)
      }));
    }

    context.on(_browserContext.BrowserContext.Events.Request, request => {
      return this._dispatchEvent('request', {
        request: _networkDispatchers.RequestDispatcher.from(this._scope, request),
        page: _pageDispatcher.PageDispatcher.fromNullable(this._scope, request.frame()._page.initializedOrUndefined())
      });
    });
    context.on(_browserContext.BrowserContext.Events.Response, response => this._dispatchEvent('response', {
      response: _networkDispatchers.ResponseDispatcher.from(this._scope, response),
      page: _pageDispatcher.PageDispatcher.fromNullable(this._scope, response.frame()._page.initializedOrUndefined())
    }));
    context.on(_browserContext.BrowserContext.Events.RequestFailed, request => this._dispatchEvent('requestFailed', {
      request: _networkDispatchers.RequestDispatcher.from(this._scope, request),
      failureText: request._failureText || undefined,
      responseEndTiming: request._responseEndTiming,
      page: _pageDispatcher.PageDispatcher.fromNullable(this._scope, request.frame()._page.initializedOrUndefined())
    }));
    context.on(_browserContext.BrowserContext.Events.RequestFinished, ({
      request,
      response
    }) => this._dispatchEvent('requestFinished', {
      request: _networkDispatchers.RequestDispatcher.from(scope, request),
      response: _networkDispatchers.ResponseDispatcher.fromNullable(scope, response),
      responseEndTiming: request._responseEndTiming,
      page: _pageDispatcher.PageDispatcher.fromNullable(this._scope, request.frame()._page.initializedOrUndefined())
    }));
  }

  async createTempFile(params, metadata) {
    const dir = this._context._browser.options.artifactsDir;
    const tmpDir = path.join(dir, 'upload-' + (0, _utils.createGuid)());
    await fs.promises.mkdir(tmpDir);

    this._context._tempDirs.push(tmpDir);

    const file = fs.createWriteStream(path.join(tmpDir, params.name));
    return {
      writableStream: new _writableStreamDispatcher.WritableStreamDispatcher(this._scope, file)
    };
  }

  async setDefaultNavigationTimeoutNoReply(params) {
    this._context.setDefaultNavigationTimeout(params.timeout);
  }

  async setDefaultTimeoutNoReply(params) {
    this._context.setDefaultTimeout(params.timeout);
  }

  async exposeBinding(params) {
    await this._context.exposeBinding(params.name, !!params.needsHandle, (source, ...args) => {
      const binding = new _pageDispatcher.BindingCallDispatcher(this._scope, params.name, !!params.needsHandle, source, args);

      this._dispatchEvent('bindingCall', {
        binding
      });

      return binding.promise();
    });
  }

  async removeExposedBindings() {
    await this._context.removeExposedBindings();
  }

  async newPage(params, metadata) {
    return {
      page: (0, _dispatcher.lookupDispatcher)(await this._context.newPage(metadata))
    };
  }

  async cookies(params) {
    return {
      cookies: await this._context.cookies(params.urls)
    };
  }

  async addCookies(params) {
    await this._context.addCookies(params.cookies);
  }

  async clearCookies() {
    await this._context.clearCookies();
  }

  async grantPermissions(params) {
    await this._context.grantPermissions(params.permissions, params.origin);
  }

  async clearPermissions() {
    await this._context.clearPermissions();
  }

  async setGeolocation(params) {
    await this._context.setGeolocation(params.geolocation);
  }

  async setExtraHTTPHeaders(params) {
    await this._context.setExtraHTTPHeaders(params.headers);
  }

  async setOffline(params) {
    await this._context.setOffline(params.offline);
  }

  async setHTTPCredentials(params) {
    await this._context.setHTTPCredentials(params.httpCredentials);
  }

  async addInitScript(params) {
    await this._context.addInitScript(params.source);
  }

  async removeInitScripts() {
    await this._context.removeInitScripts();
  }

  async setNetworkInterceptionEnabled(params) {
    if (!params.enabled) {
      await this._context.setRequestInterceptor(undefined);
      return;
    }

    await this._context.setRequestInterceptor((route, request) => {
      this._dispatchEvent('route', {
        route: _networkDispatchers.RouteDispatcher.from(this._scope, route),
        request: _networkDispatchers.RequestDispatcher.from(this._scope, request)
      });
    });
  }

  async storageState(params, metadata) {
    return await this._context.storageState();
  }

  async close(params, metadata) {
    await this._context.close(metadata);
  }

  async recorderSupplementEnable(params) {
    await _recorder.Recorder.show(this._context, params);
  }

  async pause(params, metadata) {// Debugger will take care of this.
  }

  async newCDPSession(params) {
    if (!this._object._browser.options.isChromium) throw new Error(`CDP session is only available in Chromium`);
    if (!params.page && !params.frame || params.page && params.frame) throw new Error(`CDP session must be initiated with either Page or Frame, not none or both`);
    const crBrowserContext = this._object;
    return {
      session: new _cdpSessionDispatcher.CDPSessionDispatcher(this._scope, await crBrowserContext.newCDPSession((params.page ? params.page : params.frame)._object))
    };
  }

  async harExport(params) {
    var _this$_context$_harRe;

    const artifact = await ((_this$_context$_harRe = this._context._harRecorder) === null || _this$_context$_harRe === void 0 ? void 0 : _this$_context$_harRe.export());
    if (!artifact) throw new Error('No HAR artifact. Ensure record.harPath is set.');
    return {
      artifact: new _artifactDispatcher.ArtifactDispatcher(this._scope, artifact)
    };
  }

}

exports.BrowserContextDispatcher = BrowserContextDispatcher;