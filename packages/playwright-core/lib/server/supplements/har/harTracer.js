"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HarTracer = void 0;

var _browserContext = require("../../browserContext");

var _helper = require("../../helper");

var network = _interopRequireWildcard(require("../../network"));

var _page = require("../../page");

var _utils = require("../../../utils/utils");

var _eventsHelper = require("../../../utils/eventsHelper");

var mime = _interopRequireWildcard(require("mime"));

var _async = require("../../../utils/async");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Copyright (c) Microsoft Corporation.
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
const FALLBACK_HTTP_VERSION = 'HTTP/1.1';

class HarTracer {
  constructor(context, delegate, options) {
    this._context = void 0;
    this._barrierPromises = new Set();
    this._delegate = void 0;
    this._options = void 0;
    this._pageEntries = new Map();
    this._eventListeners = [];
    this._started = false;
    this._entrySymbol = void 0;
    this._context = context;
    this._delegate = delegate;
    this._options = options;
    this._entrySymbol = Symbol('requestHarEntry');
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._eventListeners = [_eventsHelper.eventsHelper.addEventListener(this._context, _browserContext.BrowserContext.Events.Page, page => this._ensurePageEntry(page)), _eventsHelper.eventsHelper.addEventListener(this._context, _browserContext.BrowserContext.Events.Request, request => this._onRequest(request)), _eventsHelper.eventsHelper.addEventListener(this._context, _browserContext.BrowserContext.Events.RequestFinished, ({
      request,
      response
    }) => this._onRequestFinished(request, response).catch(() => {})), _eventsHelper.eventsHelper.addEventListener(this._context, _browserContext.BrowserContext.Events.Response, response => this._onResponse(response))];
  }

  _entryForRequest(request) {
    return request[this._entrySymbol];
  }

  _ensurePageEntry(page) {
    let pageEntry = this._pageEntries.get(page);

    if (!pageEntry) {
      page.on(_page.Page.Events.DOMContentLoaded, () => this._onDOMContentLoaded(page));
      page.on(_page.Page.Events.Load, () => this._onLoad(page));
      pageEntry = {
        startedDateTime: new Date(),
        id: page.guid,
        title: '',
        pageTimings: {
          onContentLoad: -1,
          onLoad: -1
        }
      };

      this._pageEntries.set(page, pageEntry);
    }

    return pageEntry;
  }

  _onDOMContentLoaded(page) {
    const pageEntry = this._ensurePageEntry(page);

    const promise = page.mainFrame().evaluateExpression(String(() => {
      return {
        title: document.title,
        domContentLoaded: performance.timing.domContentLoadedEventStart
      };
    }), true, undefined, 'utility').then(result => {
      pageEntry.title = result.title;
      pageEntry.pageTimings.onContentLoad = result.domContentLoaded;
    }).catch(() => {});

    this._addBarrier(page, promise);
  }

  _onLoad(page) {
    const pageEntry = this._ensurePageEntry(page);

    const promise = page.mainFrame().evaluateExpression(String(() => {
      return {
        title: document.title,
        loaded: performance.timing.loadEventStart
      };
    }), true, undefined, 'utility').then(result => {
      pageEntry.title = result.title;
      pageEntry.pageTimings.onLoad = result.loaded;
    }).catch(() => {});

    this._addBarrier(page, promise);
  }

  _addBarrier(page, promise) {
    if (!this._options.waitForContentOnStop) return;
    const race = Promise.race([new Promise(f => page.on('close', () => {
      this._barrierPromises.delete(race);

      f();
    })), promise]);

    this._barrierPromises.add(race);
  }

  _onRequest(request) {
    const page = request.frame()._page;

    const url = network.parsedURL(request.url());
    if (!url) return;

    const pageEntry = this._ensurePageEntry(page);

    const harEntry = {
      pageref: pageEntry.id,
      _requestref: request.guid,
      _frameref: request.frame().guid,
      _monotonicTime: (0, _utils.monotonicTime)(),
      startedDateTime: new Date(),
      time: -1,
      request: {
        method: request.method(),
        url: request.url(),
        httpVersion: FALLBACK_HTTP_VERSION,
        cookies: [],
        headers: [],
        queryString: [...url.searchParams].map(e => ({
          name: e[0],
          value: e[1]
        })),
        postData: postDataForHar(request, this._options.content),
        headersSize: -1,
        bodySize: request.bodySize()
      },
      response: {
        status: -1,
        statusText: '',
        httpVersion: FALLBACK_HTTP_VERSION,
        cookies: [],
        headers: [],
        content: {
          size: -1,
          mimeType: request.headerValue('content-type') || 'x-unknown'
        },
        headersSize: -1,
        bodySize: -1,
        redirectURL: '',
        _transferSize: -1
      },
      cache: {
        beforeRequest: null,
        afterRequest: null
      },
      timings: {
        send: -1,
        wait: -1,
        receive: -1
      }
    };

    if (request.redirectedFrom()) {
      const fromEntry = this._entryForRequest(request.redirectedFrom());

      if (fromEntry) fromEntry.response.redirectURL = request.url();
    }

    request[this._entrySymbol] = harEntry;
    if (this._started) this._delegate.onEntryStarted(harEntry);
  }

  async _onRequestFinished(request, response) {
    if (!response) return;

    const page = request.frame()._page;

    const harEntry = this._entryForRequest(request);

    if (!harEntry) return;
    const httpVersion = response.httpVersion();
    harEntry.request.httpVersion = httpVersion;
    harEntry.response.httpVersion = httpVersion;
    const compressionCalculationBarrier = {
      _encodedBodySize: -1,
      _decodedBodySize: -1,
      barrier: new _async.ManualPromise(),
      _check: function () {
        if (this._encodedBodySize !== -1 && this._decodedBodySize !== -1) {
          harEntry.response.content.compression = Math.max(0, this._decodedBodySize - this._encodedBodySize);
          this.barrier.resolve();
        }
      },
      setEncodedBodySize: function (encodedBodySize) {
        this._encodedBodySize = encodedBodySize;

        this._check();
      },
      setDecodedBodySize: function (decodedBodySize) {
        this._decodedBodySize = decodedBodySize;

        this._check();
      }
    };

    this._addBarrier(page, compressionCalculationBarrier.barrier);

    const promise = response.body().then(buffer => {
      if (this._options.skipScripts && request.resourceType() === 'script') {
        compressionCalculationBarrier.setDecodedBodySize(0);
        return;
      }

      const content = harEntry.response.content;
      content.size = buffer.length;
      compressionCalculationBarrier.setDecodedBodySize(buffer.length);

      if (buffer && buffer.length > 0) {
        if (this._options.content === 'embedded') {
          content.text = buffer.toString('base64');
          content.encoding = 'base64';
        } else if (this._options.content === 'sha1') {
          content._sha1 = (0, _utils.calculateSha1)(buffer) + '.' + (mime.getExtension(content.mimeType) || 'dat');
          if (this._started) this._delegate.onContentBlob(content._sha1, buffer);
        }
      }
    }).catch(() => {
      compressionCalculationBarrier.setDecodedBodySize(0);
    }).then(() => {
      const postData = response.request().postDataBuffer();

      if (postData && harEntry.request.postData && this._options.content === 'sha1') {
        harEntry.request.postData._sha1 = (0, _utils.calculateSha1)(postData) + '.' + (mime.getExtension(harEntry.request.postData.mimeType) || 'dat');
        if (this._started) this._delegate.onContentBlob(harEntry.request.postData._sha1, postData);
      }

      if (this._started) this._delegate.onEntryFinished(harEntry);
    });

    this._addBarrier(page, promise);

    this._addBarrier(page, response.sizes().then(sizes => {
      harEntry.response.bodySize = sizes.responseBodySize;
      harEntry.response.headersSize = sizes.responseHeadersSize; // Fallback for WebKit by calculating it manually

      harEntry.response._transferSize = response.request().responseSize.transferSize || sizes.responseHeadersSize + sizes.responseBodySize;
      harEntry.request.headersSize = sizes.requestHeadersSize;
      compressionCalculationBarrier.setEncodedBodySize(sizes.responseBodySize);
    }));
  }

  _onResponse(response) {
    const page = response.frame()._page;

    const pageEntry = this._ensurePageEntry(page);

    const harEntry = this._entryForRequest(response.request());

    if (!harEntry) return;
    const request = response.request();
    harEntry.request.postData = postDataForHar(request, this._options.content);
    harEntry.response = {
      status: response.status(),
      statusText: response.statusText(),
      httpVersion: response.httpVersion(),
      // These are bad values that will be overwritten bellow.
      cookies: [],
      headers: [],
      content: {
        size: -1,
        mimeType: 'x-unknown'
      },
      headersSize: -1,
      bodySize: -1,
      redirectURL: '',
      _transferSize: -1
    };
    const timing = response.timing();
    if (pageEntry.startedDateTime.valueOf() > timing.startTime) pageEntry.startedDateTime = new Date(timing.startTime);
    const dns = timing.domainLookupEnd !== -1 ? _helper.helper.millisToRoundishMillis(timing.domainLookupEnd - timing.domainLookupStart) : -1;
    const connect = timing.connectEnd !== -1 ? _helper.helper.millisToRoundishMillis(timing.connectEnd - timing.connectStart) : -1;
    const ssl = timing.connectEnd !== -1 ? _helper.helper.millisToRoundishMillis(timing.connectEnd - timing.secureConnectionStart) : -1;
    const wait = timing.responseStart !== -1 ? _helper.helper.millisToRoundishMillis(timing.responseStart - timing.requestStart) : -1;
    const receive = response.request()._responseEndTiming !== -1 ? _helper.helper.millisToRoundishMillis(response.request()._responseEndTiming - timing.responseStart) : -1;
    harEntry.timings = {
      dns,
      connect,
      ssl,
      send: 0,
      wait,
      receive
    };
    harEntry.time = [dns, connect, ssl, wait, receive].reduce((pre, cur) => cur > 0 ? cur + pre : pre, 0);

    this._addBarrier(page, response.serverAddr().then(server => {
      if (server !== null && server !== void 0 && server.ipAddress) harEntry.serverIPAddress = server.ipAddress;
      if (server !== null && server !== void 0 && server.port) harEntry._serverPort = server.port;
    }));

    this._addBarrier(page, response.securityDetails().then(details => {
      if (details) harEntry._securityDetails = details;
    }));

    this._addBarrier(page, request.rawRequestHeaders().then(headers => {
      for (const header of headers.filter(header => header.name.toLowerCase() === 'cookie')) harEntry.request.cookies.push(...header.value.split(';').map(parseCookie));

      harEntry.request.headers = headers;
    }));

    this._addBarrier(page, response.rawResponseHeaders().then(headers => {
      for (const header of headers.filter(header => header.name.toLowerCase() === 'set-cookie')) harEntry.response.cookies.push(parseCookie(header.value));

      harEntry.response.headers = headers;
      const contentType = headers.find(header => header.name.toLowerCase() === 'content-type');
      if (contentType) harEntry.response.content.mimeType = contentType.value;
    }));
  }

  async flush() {
    await Promise.all(this._barrierPromises);
  }

  stop() {
    this._started = false;

    _eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);

    this._barrierPromises.clear();

    const log = {
      version: '1.2',
      creator: {
        name: 'Playwright',
        version: require('../../../../package.json')['version']
      },
      browser: {
        name: this._context._browser.options.name,
        version: this._context._browser.version()
      },
      pages: Array.from(this._pageEntries.values()),
      entries: []
    };

    for (const pageEntry of log.pages) {
      if (pageEntry.pageTimings.onContentLoad >= 0) pageEntry.pageTimings.onContentLoad -= pageEntry.startedDateTime.valueOf();else pageEntry.pageTimings.onContentLoad = -1;
      if (pageEntry.pageTimings.onLoad >= 0) pageEntry.pageTimings.onLoad -= pageEntry.startedDateTime.valueOf();else pageEntry.pageTimings.onLoad = -1;
    }

    this._pageEntries.clear();

    return log;
  }

}

exports.HarTracer = HarTracer;

function postDataForHar(request, content) {
  const postData = request.postDataBuffer();
  if (!postData) return;
  const contentType = request.headerValue('content-type') || 'application/octet-stream';
  const result = {
    mimeType: contentType,
    text: '',
    params: []
  };
  if (content === 'embedded' && contentType !== 'application/octet-stream') result.text = postData.toString();

  if (contentType === 'application/x-www-form-urlencoded') {
    const parsed = new URLSearchParams(postData.toString());

    for (const [name, value] of parsed.entries()) result.params.push({
      name,
      value
    });
  }

  return result;
}

function parseCookie(c) {
  const cookie = {
    name: '',
    value: ''
  };
  let first = true;

  for (const pair of c.split(/; */)) {
    const indexOfEquals = pair.indexOf('=');
    const name = indexOfEquals !== -1 ? pair.substr(0, indexOfEquals).trim() : pair.trim();
    const value = indexOfEquals !== -1 ? pair.substr(indexOfEquals + 1, pair.length).trim() : '';

    if (first) {
      first = false;
      cookie.name = name;
      cookie.value = value;
      continue;
    }

    if (name === 'Domain') cookie.domain = value;
    if (name === 'Expires') cookie.expires = new Date(value);
    if (name === 'HttpOnly') cookie.httpOnly = true;
    if (name === 'Max-Age') cookie.expires = new Date(Date.now() + +value * 1000);
    if (name === 'Path') cookie.path = value;
    if (name === 'SameSite') cookie.sameSite = value;
    if (name === 'Secure') cookie.secure = true;
  }

  return cookie;
}