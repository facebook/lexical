"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebSocket = exports.RouteHandler = exports.Route = exports.Response = exports.Request = exports.RawHeaders = void 0;
exports.validateHeaders = validateHeaders;

var _url = require("url");

var _channelOwner = require("./channelOwner");

var _frame = require("./frame");

var _fs = _interopRequireDefault(require("fs"));

var _utilsBundle = require("../utilsBundle");

var _utils = require("../utils");

var _manualPromise = require("../utils/manualPromise");

var _events = require("./events");

var _waiter = require("./waiter");

var _clientHelper = require("./clientHelper");

var _multimap = require("../utils/multimap");

var _fetch = require("./fetch");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
class Request extends _channelOwner.ChannelOwner {
  static from(request) {
    return request._object;
  }

  static fromNullable(request) {
    return request ? Request.from(request) : null;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._redirectedFrom = null;
    this._redirectedTo = null;
    this._failureText = null;
    this._provisionalHeaders = void 0;
    this._actualHeadersPromise = void 0;
    this._postData = void 0;
    this._timing = void 0;
    this._redirectedFrom = Request.fromNullable(initializer.redirectedFrom);
    if (this._redirectedFrom) this._redirectedFrom._redirectedTo = this;
    this._provisionalHeaders = new RawHeaders(initializer.headers);
    this._postData = initializer.postData !== undefined ? Buffer.from(initializer.postData, 'base64') : null;
    this._timing = {
      startTime: 0,
      domainLookupStart: -1,
      domainLookupEnd: -1,
      connectStart: -1,
      secureConnectionStart: -1,
      connectEnd: -1,
      requestStart: -1,
      responseStart: -1,
      responseEnd: -1
    };
  }

  url() {
    return this._initializer.url;
  }

  resourceType() {
    return this._initializer.resourceType;
  }

  method() {
    return this._initializer.method;
  }

  postData() {
    return this._postData ? this._postData.toString('utf8') : null;
  }

  postDataBuffer() {
    return this._postData;
  }

  postDataJSON() {
    const postData = this.postData();
    if (!postData) return null;
    const contentType = this.headers()['content-type'];

    if (contentType === 'application/x-www-form-urlencoded') {
      const entries = {};
      const parsed = new _url.URLSearchParams(postData);

      for (const [k, v] of parsed.entries()) entries[k] = v;

      return entries;
    }

    try {
      return JSON.parse(postData);
    } catch (e) {
      throw new Error('POST data is not a valid JSON object: ' + postData);
    }
  }
  /**
   * @deprecated
   */


  headers() {
    return this._provisionalHeaders.headers();
  }

  _actualHeaders() {
    if (!this._actualHeadersPromise) {
      this._actualHeadersPromise = this._wrapApiCall(async () => {
        return new RawHeaders((await this._channel.rawRequestHeaders()).headers);
      });
    }

    return this._actualHeadersPromise;
  }

  async allHeaders() {
    return (await this._actualHeaders()).headers();
  }

  async headersArray() {
    return (await this._actualHeaders()).headersArray();
  }

  async headerValue(name) {
    return (await this._actualHeaders()).get(name);
  }

  async response() {
    return Response.fromNullable((await this._channel.response()).response);
  }

  async _internalResponse() {
    return this._wrapApiCall(async () => {
      return Response.fromNullable((await this._channel.response()).response);
    }, true);
  }

  frame() {
    return _frame.Frame.from(this._initializer.frame);
  }

  isNavigationRequest() {
    return this._initializer.isNavigationRequest;
  }

  redirectedFrom() {
    return this._redirectedFrom;
  }

  redirectedTo() {
    return this._redirectedTo;
  }

  failure() {
    if (this._failureText === null) return null;
    return {
      errorText: this._failureText
    };
  }

  timing() {
    return this._timing;
  }

  async sizes() {
    const response = await this.response();
    if (!response) throw new Error('Unable to fetch sizes for failed request');
    return (await response._channel.sizes()).sizes;
  }

  _finalRequest() {
    return this._redirectedTo ? this._redirectedTo._finalRequest() : this;
  }

}

exports.Request = Request;

class Route extends _channelOwner.ChannelOwner {
  static from(route) {
    return route._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
  }

  request() {
    return Request.from(this._initializer.request);
  }

  _raceWithPageClose(promise) {
    const page = this.request().frame()._page; // When page closes or crashes, we catch any potential rejects from this Route.
    // Note that page could be missing when routing popup's initial request that
    // does not have a Page initialized just yet.


    return Promise.race([promise, page ? page._closedOrCrashedPromise : Promise.resolve()]);
  }

  async abort(errorCode) {
    await this._raceWithPageClose(this._channel.abort({
      errorCode
    }));
  }

  async fulfill(options = {}) {
    let fetchResponseUid;
    let {
      status: statusOption,
      headers: headersOption,
      body
    } = options;

    if (options.response) {
      statusOption || (statusOption = options.response.status());
      headersOption || (headersOption = options.response.headers());

      if (options.body === undefined && options.path === undefined && options.response instanceof _fetch.APIResponse) {
        if (options.response._request._connection === this._connection) fetchResponseUid = options.response._fetchUid();else body = await options.response.body();
      }
    }

    let isBase64 = false;
    let length = 0;

    if (options.path) {
      const buffer = await _fs.default.promises.readFile(options.path);
      body = buffer.toString('base64');
      isBase64 = true;
      length = buffer.length;
    } else if ((0, _utils.isString)(body)) {
      isBase64 = false;
      length = Buffer.byteLength(body);
    } else if (body) {
      length = body.length;
      body = body.toString('base64');
      isBase64 = true;
    }

    const headers = {};

    for (const header of Object.keys(headersOption || {})) headers[header.toLowerCase()] = String(headersOption[header]);

    if (options.contentType) headers['content-type'] = String(options.contentType);else if (options.path) headers['content-type'] = _utilsBundle.mime.getType(options.path) || 'application/octet-stream';
    if (length && !('content-length' in headers)) headers['content-length'] = String(length);
    await this._raceWithPageClose(this._channel.fulfill({
      status: statusOption || 200,
      headers: (0, _utils.headersObjectToArray)(headers),
      body,
      isBase64,
      fetchResponseUid
    }));
  }

  async continue(options = {}) {
    await this._continue(options);
  }

  async _internalContinue(options = {}) {
    await this._continue(options, true).catch(() => {});
  }

  async _continue(options, isInternal) {
    return await this._wrapApiCall(async () => {
      const postDataBuffer = (0, _utils.isString)(options.postData) ? Buffer.from(options.postData, 'utf8') : options.postData;
      await this._raceWithPageClose(this._channel.continue({
        url: options.url,
        method: options.method,
        headers: options.headers ? (0, _utils.headersObjectToArray)(options.headers) : undefined,
        postData: postDataBuffer ? postDataBuffer.toString('base64') : undefined
      }));
    }, isInternal);
  }

}

exports.Route = Route;

class Response extends _channelOwner.ChannelOwner {
  static from(response) {
    return response._object;
  }

  static fromNullable(response) {
    return response ? Response.from(response) : null;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._provisionalHeaders = void 0;
    this._actualHeadersPromise = void 0;
    this._request = void 0;
    this._finishedPromise = new _manualPromise.ManualPromise();
    this._provisionalHeaders = new RawHeaders(initializer.headers);
    this._request = Request.from(this._initializer.request);
    Object.assign(this._request._timing, this._initializer.timing);
  }

  url() {
    return this._initializer.url;
  }

  ok() {
    // Status 0 is for file:// URLs
    return this._initializer.status === 0 || this._initializer.status >= 200 && this._initializer.status <= 299;
  }

  status() {
    return this._initializer.status;
  }

  statusText() {
    return this._initializer.statusText;
  }
  /**
   * @deprecated
   */


  headers() {
    return this._provisionalHeaders.headers();
  }

  async _actualHeaders() {
    if (!this._actualHeadersPromise) {
      this._actualHeadersPromise = (async () => {
        return new RawHeaders((await this._channel.rawResponseHeaders()).headers);
      })();
    }

    return this._actualHeadersPromise;
  }

  async allHeaders() {
    return (await this._actualHeaders()).headers();
  }

  async headersArray() {
    return (await this._actualHeaders()).headersArray().slice();
  }

  async headerValue(name) {
    return (await this._actualHeaders()).get(name);
  }

  async headerValues(name) {
    return (await this._actualHeaders()).getAll(name);
  }

  async finished() {
    return this._finishedPromise.then(() => null);
  }

  async body() {
    return Buffer.from((await this._channel.body()).binary, 'base64');
  }

  async text() {
    const content = await this.body();
    return content.toString('utf8');
  }

  async json() {
    const content = await this.text();
    return JSON.parse(content);
  }

  request() {
    return this._request;
  }

  frame() {
    return this._request.frame();
  }

  async serverAddr() {
    return (await this._channel.serverAddr()).value || null;
  }

  async securityDetails() {
    return (await this._channel.securityDetails()).value || null;
  }

}

exports.Response = Response;

class WebSocket extends _channelOwner.ChannelOwner {
  static from(webSocket) {
    return webSocket._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._page = void 0;
    this._isClosed = void 0;
    this._isClosed = false;
    this._page = parent;

    this._channel.on('frameSent', event => {
      if (event.opcode === 1) this.emit(_events.Events.WebSocket.FrameSent, {
        payload: event.data
      });else if (event.opcode === 2) this.emit(_events.Events.WebSocket.FrameSent, {
        payload: Buffer.from(event.data, 'base64')
      });
    });

    this._channel.on('frameReceived', event => {
      if (event.opcode === 1) this.emit(_events.Events.WebSocket.FrameReceived, {
        payload: event.data
      });else if (event.opcode === 2) this.emit(_events.Events.WebSocket.FrameReceived, {
        payload: Buffer.from(event.data, 'base64')
      });
    });

    this._channel.on('socketError', ({
      error
    }) => this.emit(_events.Events.WebSocket.Error, error));

    this._channel.on('close', () => {
      this._isClosed = true;
      this.emit(_events.Events.WebSocket.Close, this);
    });
  }

  url() {
    return this._initializer.url;
  }

  isClosed() {
    return this._isClosed;
  }

  async waitForEvent(event, optionsOrPredicate = {}) {
    return this._wrapApiCall(async () => {
      const timeout = this._page._timeoutSettings.timeout(typeof optionsOrPredicate === 'function' ? {} : optionsOrPredicate);

      const predicate = typeof optionsOrPredicate === 'function' ? optionsOrPredicate : optionsOrPredicate.predicate;

      const waiter = _waiter.Waiter.createForEvent(this, event);

      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== _events.Events.WebSocket.Error) waiter.rejectOnEvent(this, _events.Events.WebSocket.Error, new Error('Socket error'));
      if (event !== _events.Events.WebSocket.Close) waiter.rejectOnEvent(this, _events.Events.WebSocket.Close, new Error('Socket closed'));
      waiter.rejectOnEvent(this._page, _events.Events.Page.Close, new Error('Page closed'));
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }

}

exports.WebSocket = WebSocket;

function validateHeaders(headers) {
  for (const key of Object.keys(headers)) {
    const value = headers[key];
    if (!Object.is(value, undefined) && !(0, _utils.isString)(value)) throw new Error(`Expected value of header "${key}" to be String, but "${typeof value}" is found.`);
  }
}

class RouteHandler {
  constructor(baseURL, url, handler, times = Number.MAX_SAFE_INTEGER) {
    this.handledCount = 0;
    this._baseURL = void 0;
    this._times = void 0;
    this.url = void 0;
    this.handler = void 0;
    this._baseURL = baseURL;
    this._times = times;
    this.url = url;
    this.handler = handler;
  }

  matches(requestURL) {
    return (0, _clientHelper.urlMatches)(this._baseURL, requestURL, this.url);
  }

  handle(route, request) {
    ++this.handledCount;
    this.handler(route, request);
  }

  isActive() {
    return this.handledCount < this._times;
  }

}

exports.RouteHandler = RouteHandler;

class RawHeaders {
  constructor(headers) {
    this._headersArray = void 0;
    this._headersMap = new _multimap.MultiMap();
    this._headersArray = headers;

    for (const header of headers) this._headersMap.set(header.name.toLowerCase(), header.value);
  }

  get(name) {
    const values = this.getAll(name);
    if (!values || !values.length) return null;
    return values.join(name.toLowerCase() === 'set-cookie' ? '\n' : ', ');
  }

  getAll(name) {
    return [...this._headersMap.get(name.toLowerCase())];
  }

  headers() {
    const result = {};

    for (const name of this._headersMap.keys()) result[name] = this.get(name);

    return result;
  }

  headersArray() {
    return this._headersArray;
  }

}

exports.RawHeaders = RawHeaders;