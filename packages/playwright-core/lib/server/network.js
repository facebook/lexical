"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterCookies = filterCookies;
exports.rewriteCookies = rewriteCookies;
exports.parsedURL = parsedURL;
exports.stripFragmentFromUrl = stripFragmentFromUrl;
exports.singleHeader = singleHeader;
exports.mergeHeaders = mergeHeaders;
exports.STATUS_TEXTS = exports.WebSocket = exports.InterceptedResponse = exports.Response = exports.Route = exports.Request = void 0;

var _utils = require("../utils/utils");

var _async = require("../utils/async");

var _instrumentation = require("./instrumentation");

var _fetch = require("./fetch");

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
function filterCookies(cookies, urls) {
  const parsedURLs = urls.map(s => new URL(s)); // Chromiums's cookies are missing sameSite when it is 'None'

  return cookies.filter(c => {
    if (!parsedURLs.length) return true;

    for (const parsedURL of parsedURLs) {
      let domain = c.domain;
      if (!domain.startsWith('.')) domain = '.' + domain;
      if (!('.' + parsedURL.hostname).endsWith(domain)) continue;
      if (!parsedURL.pathname.startsWith(c.path)) continue;
      if (parsedURL.protocol !== 'https:' && c.secure) continue;
      return true;
    }

    return false;
  });
}

function rewriteCookies(cookies) {
  return cookies.map(c => {
    (0, _utils.assert)(c.name, 'Cookie should have a name');
    (0, _utils.assert)(c.url || c.domain && c.path, 'Cookie should have a url or a domain/path pair');
    (0, _utils.assert)(!(c.url && c.domain), 'Cookie should have either url or domain');
    (0, _utils.assert)(!(c.url && c.path), 'Cookie should have either url or path');
    const copy = { ...c
    };

    if (copy.url) {
      (0, _utils.assert)(copy.url !== 'about:blank', `Blank page can not have cookie "${c.name}"`);
      (0, _utils.assert)(!copy.url.startsWith('data:'), `Data URL page can not have cookie "${c.name}"`);
      const url = new URL(copy.url);
      copy.domain = url.hostname;
      copy.path = url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
      copy.secure = url.protocol === 'https:';
    }

    return copy;
  });
}

function parsedURL(url) {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}

function stripFragmentFromUrl(url) {
  if (!url.includes('#')) return url;
  return url.substring(0, url.indexOf('#'));
}

class Request extends _instrumentation.SdkObject {
  constructor(frame, redirectedFrom, documentId, url, resourceType, method, postData, headers) {
    super(frame, 'request');
    this._response = null;
    this._redirectedFrom = void 0;
    this._redirectedTo = null;
    this._documentId = void 0;
    this._isFavicon = void 0;
    this._failureText = null;
    this._url = void 0;
    this._resourceType = void 0;
    this._method = void 0;
    this._postData = void 0;
    this._headers = void 0;
    this._headersMap = new Map();
    this._rawRequestHeadersPromise = void 0;
    this._frame = void 0;
    this._waitForResponsePromise = new _async.ManualPromise();
    this._responseEndTiming = -1;
    this.responseSize = {
      encodedBodySize: 0,
      transferSize: 0,
      responseHeadersSize: 0
    };
    (0, _utils.assert)(!url.startsWith('data:'), 'Data urls should not fire requests');
    this._frame = frame;
    this._redirectedFrom = redirectedFrom;
    if (redirectedFrom) redirectedFrom._redirectedTo = this;
    this._documentId = documentId;
    this._url = stripFragmentFromUrl(url);
    this._resourceType = resourceType;
    this._method = method;
    this._postData = postData;
    this._headers = headers;

    for (const {
      name,
      value
    } of this._headers) this._headersMap.set(name.toLowerCase(), value);

    this._isFavicon = url.endsWith('/favicon.ico') || !!(redirectedFrom !== null && redirectedFrom !== void 0 && redirectedFrom._isFavicon);
  }

  _setFailureText(failureText) {
    this._failureText = failureText;

    this._waitForResponsePromise.resolve(null);
  }

  url() {
    return this._url;
  }

  resourceType() {
    return this._resourceType;
  }

  method() {
    return this._method;
  }

  postDataBuffer() {
    return this._postData;
  }

  headers() {
    return this._headers;
  }

  headerValue(name) {
    return this._headersMap.get(name);
  }

  setWillReceiveExtraHeaders() {
    if (!this._rawRequestHeadersPromise) this._rawRequestHeadersPromise = new _async.ManualPromise();
  }

  setRawRequestHeaders(headers) {
    if (!this._rawRequestHeadersPromise) this._rawRequestHeadersPromise = new _async.ManualPromise();

    this._rawRequestHeadersPromise.resolve(headers);
  }

  async rawRequestHeaders() {
    return this._rawRequestHeadersPromise || Promise.resolve(this._headers);
  }

  rawRequestHeadersPromise() {
    return this._rawRequestHeadersPromise;
  }

  response() {
    return this._waitForResponsePromise;
  }

  _existingResponse() {
    return this._response;
  }

  _setResponse(response) {
    this._response = response;

    this._waitForResponsePromise.resolve(response);
  }

  _finalRequest() {
    return this._redirectedTo ? this._redirectedTo._finalRequest() : this;
  }

  frame() {
    return this._frame;
  }

  isNavigationRequest() {
    return !!this._documentId;
  }

  redirectedFrom() {
    return this._redirectedFrom;
  }

  failure() {
    if (this._failureText === null) return null;
    return {
      errorText: this._failureText
    };
  }

  bodySize() {
    var _this$postDataBuffer;

    return ((_this$postDataBuffer = this.postDataBuffer()) === null || _this$postDataBuffer === void 0 ? void 0 : _this$postDataBuffer.length) || 0;
  }

  async requestHeadersSize() {
    let headersSize = 4; // 4 = 2 spaces + 2 line breaks (GET /path \r\n)

    headersSize += this.method().length;
    headersSize += new URL(this.url()).pathname.length;
    headersSize += 8; // httpVersion

    const headers = this.rawRequestHeadersPromise() ? await this.rawRequestHeadersPromise() : this._headers;

    for (const header of headers) headersSize += header.name.length + header.value.length + 4; // 4 = ': ' + '\r\n'


    return headersSize;
  }

}

exports.Request = Request;

class Route extends _instrumentation.SdkObject {
  constructor(request, delegate) {
    super(request.frame(), 'route');
    this._request = void 0;
    this._delegate = void 0;
    this._handled = false;
    this._response = null;
    this._request = request;
    this._delegate = delegate;
  }

  request() {
    return this._request;
  }

  async abort(errorCode = 'failed') {
    (0, _utils.assert)(!this._handled, 'Route is already handled!');
    this._handled = true;
    await this._delegate.abort(errorCode);
  }

  async fulfill(overrides) {
    (0, _utils.assert)(!this._handled, 'Route is already handled!');
    this._handled = true;
    let body = overrides.body;
    let isBase64 = overrides.isBase64 || false;

    if (body === undefined) {
      if (overrides.fetchResponseUid) {
        const context = this._request.frame()._page._browserContext;

        const buffer = context.fetchRequest.fetchResponses.get(overrides.fetchResponseUid) || _fetch.FetchRequest.findResponseBody(overrides.fetchResponseUid);

        (0, _utils.assert)(buffer, 'Fetch response has been disposed');
        body = buffer.toString('base64');
        isBase64 = true;
      } else if (this._response && overrides.useInterceptedResponseBody) {
        body = (await this._delegate.responseBody()).toString('base64');
        isBase64 = true;
      } else {
        body = '';
        isBase64 = false;
      }
    }

    await this._delegate.fulfill({
      status: overrides.status || 200,
      headers: overrides.headers || [],
      body,
      isBase64
    });
  }

  async continue(overrides = {}) {
    (0, _utils.assert)(!this._handled, 'Route is already handled!');
    (0, _utils.assert)(!this._response, 'Cannot call continue after response interception!');

    if (overrides.url) {
      const newUrl = new URL(overrides.url);
      const oldUrl = new URL(this._request.url());
      if (oldUrl.protocol !== newUrl.protocol) throw new Error('New URL must have same protocol as overridden URL');
    }

    this._response = await this._delegate.continue(this._request, overrides);
    return this._response;
  }

  async responseBody() {
    (0, _utils.assert)(!this._handled, 'Route is already handled!');
    return this._delegate.responseBody();
  }

}

exports.Route = Route;

class Response extends _instrumentation.SdkObject {
  constructor(request, status, statusText, headers, timing, getResponseBodyCallback, httpVersion) {
    super(request.frame(), 'response');
    this._request = void 0;
    this._contentPromise = null;
    this._finishedPromise = new _async.ManualPromise();
    this._status = void 0;
    this._statusText = void 0;
    this._url = void 0;
    this._headers = void 0;
    this._headersMap = new Map();
    this._getResponseBodyCallback = void 0;
    this._timing = void 0;
    this._serverAddrPromise = new _async.ManualPromise();
    this._securityDetailsPromise = new _async.ManualPromise();
    this._rawResponseHeadersPromise = void 0;
    this._httpVersion = void 0;
    this._request = request;
    this._timing = timing;
    this._status = status;
    this._statusText = statusText;
    this._url = request.url();
    this._headers = headers;

    for (const {
      name,
      value
    } of this._headers) this._headersMap.set(name.toLowerCase(), value);

    this._getResponseBodyCallback = getResponseBodyCallback;

    this._request._setResponse(this);

    this._httpVersion = httpVersion;
  }

  _serverAddrFinished(addr) {
    this._serverAddrPromise.resolve(addr);
  }

  _securityDetailsFinished(securityDetails) {
    this._securityDetailsPromise.resolve(securityDetails);
  }

  _requestFinished(responseEndTiming) {
    this._request._responseEndTiming = Math.max(responseEndTiming, this._timing.responseStart);

    this._finishedPromise.resolve();
  }

  _setHttpVersion(httpVersion) {
    this._httpVersion = httpVersion;
  }

  url() {
    return this._url;
  }

  status() {
    return this._status;
  }

  statusText() {
    return this._statusText;
  }

  headers() {
    return this._headers;
  }

  headerValue(name) {
    return this._headersMap.get(name);
  }

  async rawResponseHeaders() {
    return this._rawResponseHeadersPromise || Promise.resolve(this._headers);
  }

  setWillReceiveExtraHeaders() {
    this._request.setWillReceiveExtraHeaders();

    this._rawResponseHeadersPromise = new _async.ManualPromise();
  }

  setRawResponseHeaders(headers) {
    if (!this._rawResponseHeadersPromise) this._rawResponseHeadersPromise = new _async.ManualPromise();

    this._rawResponseHeadersPromise.resolve(headers);
  }

  timing() {
    return this._timing;
  }

  async serverAddr() {
    return (await this._serverAddrPromise) || null;
  }

  async securityDetails() {
    return (await this._securityDetailsPromise) || null;
  }

  body() {
    if (!this._contentPromise) {
      this._contentPromise = this._finishedPromise.then(async () => {
        if (this._status >= 300 && this._status <= 399) throw new Error('Response body is unavailable for redirect responses');
        return this._getResponseBodyCallback();
      });
    }

    return this._contentPromise;
  }

  request() {
    return this._request;
  }

  frame() {
    return this._request.frame();
  }

  httpVersion() {
    if (!this._httpVersion) return 'HTTP/1.1';
    if (this._httpVersion === 'http/1.1') return 'HTTP/1.1';
    return this._httpVersion;
  }

  async _responseHeadersSize() {
    if (this._request.responseSize.responseHeadersSize) return this._request.responseSize.responseHeadersSize;
    let headersSize = 4; // 4 = 2 spaces + 2 line breaks (HTTP/1.1 200 Ok\r\n)

    headersSize += 8; // httpVersion;

    headersSize += 3; // statusCode;

    headersSize += this.statusText().length;
    const headers = await this._bestEffortResponseHeaders();

    for (const header of headers) headersSize += header.name.length + header.value.length + 4; // 4 = ': ' + '\r\n'


    headersSize += 2; // '\r\n'

    return headersSize;
  }

  async _bestEffortResponseHeaders() {
    return this._rawResponseHeadersPromise ? await this._rawResponseHeadersPromise : this._headers;
  }

  async sizes() {
    await this._finishedPromise;
    const requestHeadersSize = await this._request.requestHeadersSize();
    const responseHeadersSize = await this._responseHeadersSize();
    let {
      encodedBodySize
    } = this._request.responseSize;

    if (!encodedBodySize) {
      var _headers$find;

      const headers = await this._bestEffortResponseHeaders();
      const contentLength = (_headers$find = headers.find(h => h.name.toLowerCase() === 'content-length')) === null || _headers$find === void 0 ? void 0 : _headers$find.value;
      encodedBodySize = contentLength ? +contentLength : 0;
    }

    return {
      requestBodySize: this._request.bodySize(),
      requestHeadersSize,
      responseBodySize: encodedBodySize,
      responseHeadersSize
    };
  }

}

exports.Response = Response;

class InterceptedResponse extends _instrumentation.SdkObject {
  constructor(request, status, statusText, headers) {
    super(request.frame(), 'interceptedResponse');
    this._request = void 0;
    this._status = void 0;
    this._statusText = void 0;
    this._headers = void 0;
    this._request = request._finalRequest();
    this._status = status;
    this._statusText = statusText;
    this._headers = headers;
  }

  status() {
    return this._status;
  }

  statusText() {
    return this._statusText;
  }

  headers() {
    return this._headers;
  }

  request() {
    return this._request;
  }

}

exports.InterceptedResponse = InterceptedResponse;

class WebSocket extends _instrumentation.SdkObject {
  constructor(parent, url) {
    super(parent, 'ws');
    this._url = void 0;
    this._url = url;
  }

  url() {
    return this._url;
  }

  frameSent(opcode, data) {
    this.emit(WebSocket.Events.FrameSent, {
      opcode,
      data
    });
  }

  frameReceived(opcode, data) {
    this.emit(WebSocket.Events.FrameReceived, {
      opcode,
      data
    });
  }

  error(errorMessage) {
    this.emit(WebSocket.Events.SocketError, errorMessage);
  }

  closed() {
    this.emit(WebSocket.Events.Close);
  }

}

exports.WebSocket = WebSocket;
WebSocket.Events = {
  Close: 'close',
  SocketError: 'socketerror',
  FrameReceived: 'framereceived',
  FrameSent: 'framesent'
};
// List taken from https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml with extra 306 and 418 codes.
const STATUS_TEXTS = {
  '100': 'Continue',
  '101': 'Switching Protocols',
  '102': 'Processing',
  '103': 'Early Hints',
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '203': 'Non-Authoritative Information',
  '204': 'No Content',
  '205': 'Reset Content',
  '206': 'Partial Content',
  '207': 'Multi-Status',
  '208': 'Already Reported',
  '226': 'IM Used',
  '300': 'Multiple Choices',
  '301': 'Moved Permanently',
  '302': 'Found',
  '303': 'See Other',
  '304': 'Not Modified',
  '305': 'Use Proxy',
  '306': 'Switch Proxy',
  '307': 'Temporary Redirect',
  '308': 'Permanent Redirect',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '402': 'Payment Required',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '407': 'Proxy Authentication Required',
  '408': 'Request Timeout',
  '409': 'Conflict',
  '410': 'Gone',
  '411': 'Length Required',
  '412': 'Precondition Failed',
  '413': 'Payload Too Large',
  '414': 'URI Too Long',
  '415': 'Unsupported Media Type',
  '416': 'Range Not Satisfiable',
  '417': 'Expectation Failed',
  '418': 'I\'m a teapot',
  '421': 'Misdirected Request',
  '422': 'Unprocessable Entity',
  '423': 'Locked',
  '424': 'Failed Dependency',
  '425': 'Too Early',
  '426': 'Upgrade Required',
  '428': 'Precondition Required',
  '429': 'Too Many Requests',
  '431': 'Request Header Fields Too Large',
  '451': 'Unavailable For Legal Reasons',
  '500': 'Internal Server Error',
  '501': 'Not Implemented',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
  '505': 'HTTP Version Not Supported',
  '506': 'Variant Also Negotiates',
  '507': 'Insufficient Storage',
  '508': 'Loop Detected',
  '510': 'Not Extended',
  '511': 'Network Authentication Required'
};
exports.STATUS_TEXTS = STATUS_TEXTS;

function singleHeader(name, value) {
  return [{
    name,
    value
  }];
}

function mergeHeaders(headers) {
  const lowerCaseToValue = new Map();
  const lowerCaseToOriginalCase = new Map();

  for (const h of headers) {
    if (!h) continue;

    for (const {
      name,
      value
    } of h) {
      const lower = name.toLowerCase();
      lowerCaseToOriginalCase.set(lower, name);
      lowerCaseToValue.set(lower, value);
    }
  }

  const result = [];

  for (const [lower, value] of lowerCaseToValue) result.push({
    name: lowerCaseToOriginalCase.get(lower),
    value
  });

  return result;
}