"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WKRouteImpl = exports.WKInterceptableRequest = void 0;

var network = _interopRequireWildcard(require("../network"));

var _utils = require("../../utils/utils");

var _async = require("../../utils/async");

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
const errorReasons = {
  'aborted': 'Cancellation',
  'accessdenied': 'AccessControl',
  'addressunreachable': 'General',
  'blockedbyclient': 'Cancellation',
  'blockedbyresponse': 'General',
  'connectionaborted': 'General',
  'connectionclosed': 'General',
  'connectionfailed': 'General',
  'connectionrefused': 'General',
  'connectionreset': 'General',
  'internetdisconnected': 'General',
  'namenotresolved': 'General',
  'timedout': 'Timeout',
  'failed': 'General'
};

class WKInterceptableRequest {
  constructor(session, route, frame, event, redirectedFrom, documentId) {
    this._session = void 0;
    this.request = void 0;
    this._requestId = void 0;
    this._timestamp = void 0;
    this._wallTime = void 0;
    this._route = void 0;
    this._redirectedFrom = void 0;
    this._session = session;
    this._requestId = event.requestId;
    this._route = route;
    this._redirectedFrom = redirectedFrom;
    const resourceType = event.type ? event.type.toLowerCase() : redirectedFrom ? redirectedFrom.request.resourceType() : 'other';
    let postDataBuffer = null;
    this._timestamp = event.timestamp;
    this._wallTime = event.walltime * 1000;
    if (event.request.postData) postDataBuffer = Buffer.from(event.request.postData, 'base64');
    this.request = new network.Request(frame, (redirectedFrom === null || redirectedFrom === void 0 ? void 0 : redirectedFrom.request) || null, documentId, event.request.url, resourceType, event.request.method, postDataBuffer, (0, _utils.headersObjectToArray)(event.request.headers));
  }

  _routeForRedirectChain() {
    let request = this;

    while (request._redirectedFrom) request = request._redirectedFrom;

    return request._route;
  }

  createResponse(responsePayload) {
    const getResponseBody = async () => {
      const response = await this._session.send('Network.getResponseBody', {
        requestId: this._requestId
      });
      return Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
    };

    const timingPayload = responsePayload.timing;
    const timing = {
      startTime: this._wallTime,
      domainLookupStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.domainLookupStart) : -1,
      domainLookupEnd: timingPayload ? wkMillisToRoundishMillis(timingPayload.domainLookupEnd) : -1,
      connectStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.connectStart) : -1,
      secureConnectionStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.secureConnectionStart) : -1,
      connectEnd: timingPayload ? wkMillisToRoundishMillis(timingPayload.connectEnd) : -1,
      requestStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.requestStart) : -1,
      responseStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.responseStart) : -1
    };
    const setCookieSeparator = process.platform === 'darwin' ? ',' : '\n';
    return new network.Response(this.request, responsePayload.status, responsePayload.statusText, (0, _utils.headersObjectToArray)(responsePayload.headers, ',', setCookieSeparator), timing, getResponseBody);
  }

}

exports.WKInterceptableRequest = WKInterceptableRequest;

class WKRouteImpl {
  constructor(session, requestId) {
    this._session = void 0;
    this._requestId = void 0;
    this._requestInterceptedPromise = new _async.ManualPromise();
    this._session = session;
    this._requestId = requestId;
  }

  async abort(errorCode) {
    const errorType = errorReasons[errorCode];
    (0, _utils.assert)(errorType, 'Unknown error code: ' + errorCode);
    await this._requestInterceptedPromise; // In certain cases, protocol will return error if the request was already canceled
    // or the page was closed. We should tolerate these errors.

    await this._session.sendMayFail('Network.interceptRequestWithError', {
      requestId: this._requestId,
      errorType
    });
  }

  async fulfill(response) {
    if (300 <= response.status && response.status < 400) throw new Error('Cannot fulfill with redirect status: ' + response.status);
    await this._requestInterceptedPromise; // In certain cases, protocol will return error if the request was already canceled
    // or the page was closed. We should tolerate these errors.

    let mimeType = response.isBase64 ? 'application/octet-stream' : 'text/plain';
    const headers = (0, _utils.headersArrayToObject)(response.headers, true
    /* lowerCase */
    );
    const contentType = headers['content-type'];
    if (contentType) mimeType = contentType.split(';')[0].trim();
    await this._session.sendMayFail('Network.interceptRequestWithResponse', {
      requestId: this._requestId,
      status: response.status,
      statusText: network.STATUS_TEXTS[String(response.status)],
      mimeType,
      headers,
      base64Encoded: response.isBase64,
      content: response.body
    });
  }

  async continue(request, overrides) {
    await this._requestInterceptedPromise; // In certain cases, protocol will return error if the request was already canceled
    // or the page was closed. We should tolerate these errors.

    await this._session.sendMayFail('Network.interceptWithRequest', {
      requestId: this._requestId,
      url: overrides.url,
      method: overrides.method,
      headers: overrides.headers ? (0, _utils.headersArrayToObject)(overrides.headers, false
      /* lowerCase */
      ) : undefined,
      postData: overrides.postData ? Buffer.from(overrides.postData).toString('base64') : undefined
    });
  }

}

exports.WKRouteImpl = WKRouteImpl;

function wkMillisToRoundishMillis(value) {
  // WebKit uses -1000 for unavailable.
  if (value === -1000) return -1; // WebKit has a bug, instead of -1 it sends -1000 to be in ms.

  if (value <= 0) {
    // DNS can start before request start on Mac Network Stack
    return -1;
  }

  return (value * 1000 | 0) / 1000;
}