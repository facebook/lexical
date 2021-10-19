"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CRNetworkManager = void 0;

var _helper = require("../helper");

var _eventsHelper = require("../../utils/eventsHelper");

var network = _interopRequireWildcard(require("../network"));

var _utils = require("../../utils/utils");

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
class CRNetworkManager {
  constructor(client, page, parentManager) {
    this._client = void 0;
    this._page = void 0;
    this._parentManager = void 0;
    this._requestIdToRequest = new Map();
    this._requestIdToRequestWillBeSentEvent = new Map();
    this._credentials = null;
    this._attemptedAuthentications = new Set();
    this._userRequestInterceptionEnabled = false;
    this._protocolRequestInterceptionEnabled = false;
    this._requestIdToRequestPausedEvent = new Map();
    this._eventListeners = void 0;
    this._responseExtraInfoTracker = new ResponseExtraInfoTracker();
    this._client = client;
    this._page = page;
    this._parentManager = parentManager;
    this._eventListeners = this.instrumentNetworkEvents(client);
  }

  instrumentNetworkEvents(session, workerFrame) {
    return [_eventsHelper.eventsHelper.addEventListener(session, 'Fetch.requestPaused', this._onRequestPaused.bind(this, workerFrame)), _eventsHelper.eventsHelper.addEventListener(session, 'Fetch.authRequired', this._onAuthRequired.bind(this)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.requestWillBeSent', this._onRequestWillBeSent.bind(this, workerFrame)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.requestWillBeSentExtraInfo', this._onRequestWillBeSentExtraInfo.bind(this)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.responseReceived', this._onResponseReceived.bind(this)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.responseReceivedExtraInfo', this._onResponseReceivedExtraInfo.bind(this)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.loadingFinished', this._onLoadingFinished.bind(this)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.loadingFailed', this._onLoadingFailed.bind(this)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.webSocketCreated', e => this._page._frameManager.onWebSocketCreated(e.requestId, e.url)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.webSocketWillSendHandshakeRequest', e => this._page._frameManager.onWebSocketRequest(e.requestId)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.webSocketHandshakeResponseReceived', e => this._page._frameManager.onWebSocketResponse(e.requestId, e.response.status, e.response.statusText)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.webSocketFrameSent', e => e.response.payloadData && this._page._frameManager.onWebSocketFrameSent(e.requestId, e.response.opcode, e.response.payloadData)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.webSocketFrameReceived', e => e.response.payloadData && this._page._frameManager.webSocketFrameReceived(e.requestId, e.response.opcode, e.response.payloadData)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.webSocketClosed', e => this._page._frameManager.webSocketClosed(e.requestId)), _eventsHelper.eventsHelper.addEventListener(session, 'Network.webSocketFrameError', e => this._page._frameManager.webSocketError(e.requestId, e.errorMessage))];
  }

  async initialize() {
    await this._client.send('Network.enable');
  }

  dispose() {
    _eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
  }

  async authenticate(credentials) {
    this._credentials = credentials;
    await this._updateProtocolRequestInterception();
  }

  async setOffline(offline) {
    await this._client.send('Network.emulateNetworkConditions', {
      offline,
      // values of 0 remove any active throttling. crbug.com/456324#c9
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    });
  }

  async setRequestInterception(value) {
    this._userRequestInterceptionEnabled = value;
    await this._updateProtocolRequestInterception();
  }

  async _updateProtocolRequestInterception() {
    const enabled = this._userRequestInterceptionEnabled || !!this._credentials;
    if (enabled === this._protocolRequestInterceptionEnabled) return;
    this._protocolRequestInterceptionEnabled = enabled;

    if (enabled) {
      await Promise.all([this._client.send('Network.setCacheDisabled', {
        cacheDisabled: true
      }), this._client.send('Fetch.enable', {
        handleAuthRequests: true,
        patterns: [{
          urlPattern: '*',
          requestStage: 'Request'
        }, {
          urlPattern: '*',
          requestStage: 'Response'
        }]
      })]);
    } else {
      await Promise.all([this._client.send('Network.setCacheDisabled', {
        cacheDisabled: false
      }), this._client.send('Fetch.disable')]);
    }
  }

  _onRequestWillBeSent(workerFrame, event) {
    this._responseExtraInfoTracker.requestWillBeSent(event); // Request interception doesn't happen for data URLs with Network Service.


    if (this._protocolRequestInterceptionEnabled && !event.request.url.startsWith('data:')) {
      const requestId = event.requestId;

      const requestPausedEvent = this._requestIdToRequestPausedEvent.get(requestId);

      if (requestPausedEvent) {
        this._onRequest(workerFrame, event, requestPausedEvent);

        this._requestIdToRequestPausedEvent.delete(requestId);
      } else {
        this._requestIdToRequestWillBeSentEvent.set(event.requestId, event);
      }
    } else {
      this._onRequest(workerFrame, event, null);
    }
  }

  _onRequestWillBeSentExtraInfo(event) {
    this._responseExtraInfoTracker.requestWillBeSentExtraInfo(event);
  }

  _onAuthRequired(event) {
    let response = 'Default';

    if (this._attemptedAuthentications.has(event.requestId)) {
      response = 'CancelAuth';
    } else if (this._credentials) {
      response = 'ProvideCredentials';

      this._attemptedAuthentications.add(event.requestId);
    }

    const {
      username,
      password
    } = this._credentials || {
      username: undefined,
      password: undefined
    };

    this._client._sendMayFail('Fetch.continueWithAuth', {
      requestId: event.requestId,
      authChallengeResponse: {
        response,
        username,
        password
      }
    });
  }

  _onRequestPaused(workerFrame, event) {
    if (!event.responseStatusCode && !event.responseErrorReason) {
      // Request intercepted, deliver signal to the tracker.
      const request = this._requestIdToRequest.get(event.networkId);

      if (request) this._responseExtraInfoTracker.requestPaused(request.request, event);
    }

    if (!this._userRequestInterceptionEnabled && this._protocolRequestInterceptionEnabled) {
      this._client._sendMayFail('Fetch.continueRequest', {
        requestId: event.requestId
      });
    }

    if (!event.networkId) {
      // Fetch without networkId means that request was not recongnized by inspector, and
      // it will never receive Network.requestWillBeSent. Most likely, this is an internal request
      // that we can safely fail.
      this._client._sendMayFail('Fetch.failRequest', {
        requestId: event.requestId,
        errorReason: 'Aborted'
      });

      return;
    }

    if (event.request.url.startsWith('data:')) return;

    if (event.responseStatusCode || event.responseErrorReason) {
      const isRedirect = event.responseStatusCode && event.responseStatusCode >= 300 && event.responseStatusCode < 400;

      const request = this._requestIdToRequest.get(event.networkId);

      const route = request === null || request === void 0 ? void 0 : request._routeForRedirectChain();

      if (isRedirect || !route || !route._interceptingResponse) {
        this._client._sendMayFail('Fetch.continueRequest', {
          requestId: event.requestId
        });

        return;
      }

      route._responseInterceptedCallback(event);

      return;
    }

    const requestId = event.networkId;

    const requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(requestId);

    if (requestWillBeSentEvent) {
      this._onRequest(workerFrame, requestWillBeSentEvent, event);

      this._requestIdToRequestWillBeSentEvent.delete(requestId);
    } else {
      this._requestIdToRequestPausedEvent.set(requestId, event);
    }
  }

  _onRequest(workerFrame, requestWillBeSentEvent, requestPausedEvent) {
    if (requestWillBeSentEvent.request.url.startsWith('data:')) return;
    let redirectedFrom = null;

    if (requestWillBeSentEvent.redirectResponse) {
      const request = this._requestIdToRequest.get(requestWillBeSentEvent.requestId); // If we connect late to the target, we could have missed the requestWillBeSent event.


      if (request) {
        this._handleRequestRedirect(request, requestWillBeSentEvent.redirectResponse, requestWillBeSentEvent.timestamp);

        redirectedFrom = request;
      }
    }

    let frame = requestWillBeSentEvent.frameId ? this._page._frameManager.frame(requestWillBeSentEvent.frameId) : workerFrame; // Requests from workers lack frameId, because we receive Network.requestWillBeSent
    // on the worker target. However, we receive Fetch.requestPaused on the page target,
    // and lack workerFrame there. Luckily, Fetch.requestPaused provides a frameId.

    if (!frame && requestPausedEvent && requestPausedEvent.frameId) frame = this._page._frameManager.frame(requestPausedEvent.frameId); // Check if it's main resource request interception (targetId === main frame id).

    if (!frame && requestWillBeSentEvent.frameId === this._page._delegate._targetId) {
      // Main resource request for the page is being intercepted so the Frame is not created
      // yet. Precreate it here for the purposes of request interception. It will be updated
      // later as soon as the request continues and we receive frame tree from the page.
      frame = this._page._frameManager.frameAttached(requestWillBeSentEvent.frameId, null);
    } // CORS options request is generated by the network stack. If interception is enabled,
    // we accept all CORS options, assuming that this was intended when setting route.
    //
    // Note: it would be better to match the URL against interception patterns, but
    // that information is only available to the client. Perhaps we can just route to the client?


    if (requestPausedEvent && requestPausedEvent.request.method === 'OPTIONS' && this._page._needsRequestInterception()) {
      const requestHeaders = requestPausedEvent.request.headers;
      const responseHeaders = [{
        name: 'Access-Control-Allow-Origin',
        value: requestHeaders['Origin'] || '*'
      }, {
        name: 'Access-Control-Allow-Methods',
        value: requestHeaders['Access-Control-Request-Method'] || 'GET, POST, OPTIONS, DELETE'
      }, {
        name: 'Access-Control-Allow-Credentials',
        value: 'true'
      }];
      if (requestHeaders['Access-Control-Request-Headers']) responseHeaders.push({
        name: 'Access-Control-Allow-Headers',
        value: requestHeaders['Access-Control-Request-Headers']
      });

      this._client._sendMayFail('Fetch.fulfillRequest', {
        requestId: requestPausedEvent.requestId,
        responseCode: 204,
        responsePhrase: network.STATUS_TEXTS['204'],
        responseHeaders,
        body: ''
      });

      return;
    }

    if (!frame) {
      if (requestPausedEvent) this._client._sendMayFail('Fetch.continueRequest', {
        requestId: requestPausedEvent.requestId
      });
      return;
    }

    let route = null;

    if (requestPausedEvent) {
      // We do not support intercepting redirects.
      if (redirectedFrom) this._client._sendMayFail('Fetch.continueRequest', {
        requestId: requestPausedEvent.requestId
      });else route = new RouteImpl(this._client, requestPausedEvent.requestId);
    }

    const isNavigationRequest = requestWillBeSentEvent.requestId === requestWillBeSentEvent.loaderId && requestWillBeSentEvent.type === 'Document';
    const documentId = isNavigationRequest ? requestWillBeSentEvent.loaderId : undefined;
    const request = new InterceptableRequest({
      frame,
      documentId,
      route,
      requestWillBeSentEvent,
      requestPausedEvent,
      redirectedFrom
    });

    this._requestIdToRequest.set(requestWillBeSentEvent.requestId, request);

    this._page._frameManager.requestStarted(request.request, route || undefined);
  }

  _createResponse(request, responsePayload) {
    var _responsePayload$secu, _responsePayload$secu2, _responsePayload$secu3, _responsePayload$secu4, _responsePayload$secu5;

    const getResponseBody = async () => {
      const response = await this._client.send('Network.getResponseBody', {
        requestId: request._requestId
      });
      return Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
    };

    const timingPayload = responsePayload.timing;
    let timing;

    if (timingPayload) {
      timing = {
        startTime: (timingPayload.requestTime - request._timestamp + request._wallTime) * 1000,
        domainLookupStart: timingPayload.dnsStart,
        domainLookupEnd: timingPayload.dnsEnd,
        connectStart: timingPayload.connectStart,
        secureConnectionStart: timingPayload.sslStart,
        connectEnd: timingPayload.connectEnd,
        requestStart: timingPayload.sendStart,
        responseStart: timingPayload.receiveHeadersEnd
      };
    } else {
      timing = {
        startTime: request._wallTime * 1000,
        domainLookupStart: -1,
        domainLookupEnd: -1,
        connectStart: -1,
        secureConnectionStart: -1,
        connectEnd: -1,
        requestStart: -1,
        responseStart: -1
      };
    }

    const response = new network.Response(request.request, responsePayload.status, responsePayload.statusText, (0, _utils.headersObjectToArray)(responsePayload.headers), timing, getResponseBody, responsePayload.protocol);

    if (responsePayload !== null && responsePayload !== void 0 && responsePayload.remoteIPAddress && typeof (responsePayload === null || responsePayload === void 0 ? void 0 : responsePayload.remotePort) === 'number') {
      response._serverAddrFinished({
        ipAddress: responsePayload.remoteIPAddress,
        port: responsePayload.remotePort
      });
    } else {
      response._serverAddrFinished();
    }

    response._securityDetailsFinished({
      protocol: responsePayload === null || responsePayload === void 0 ? void 0 : (_responsePayload$secu = responsePayload.securityDetails) === null || _responsePayload$secu === void 0 ? void 0 : _responsePayload$secu.protocol,
      subjectName: responsePayload === null || responsePayload === void 0 ? void 0 : (_responsePayload$secu2 = responsePayload.securityDetails) === null || _responsePayload$secu2 === void 0 ? void 0 : _responsePayload$secu2.subjectName,
      issuer: responsePayload === null || responsePayload === void 0 ? void 0 : (_responsePayload$secu3 = responsePayload.securityDetails) === null || _responsePayload$secu3 === void 0 ? void 0 : _responsePayload$secu3.issuer,
      validFrom: responsePayload === null || responsePayload === void 0 ? void 0 : (_responsePayload$secu4 = responsePayload.securityDetails) === null || _responsePayload$secu4 === void 0 ? void 0 : _responsePayload$secu4.validFrom,
      validTo: responsePayload === null || responsePayload === void 0 ? void 0 : (_responsePayload$secu5 = responsePayload.securityDetails) === null || _responsePayload$secu5 === void 0 ? void 0 : _responsePayload$secu5.validTo
    });

    this._responseExtraInfoTracker.processResponse(request._requestId, response, request.wasFulfilled());

    return response;
  }

  _handleRequestRedirect(request, responsePayload, timestamp) {
    const response = this._createResponse(request, responsePayload);

    response._requestFinished((timestamp - request._timestamp) * 1000);

    this._requestIdToRequest.delete(request._requestId);

    if (request._interceptionId) this._attemptedAuthentications.delete(request._interceptionId);

    this._page._frameManager.requestReceivedResponse(response);

    this._page._frameManager.reportRequestFinished(request.request, response);
  }

  _onResponseReceivedExtraInfo(event) {
    this._responseExtraInfoTracker.responseReceivedExtraInfo(event);
  }

  _onResponseReceived(event) {
    this._responseExtraInfoTracker.responseReceived(event);

    const request = this._requestIdToRequest.get(event.requestId); // FileUpload sends a response without a matching request.


    if (!request) return;

    const response = this._createResponse(request, event.response);

    this._page._frameManager.requestReceivedResponse(response);
  }

  _onLoadingFinished(event) {
    this._responseExtraInfoTracker.loadingFinished(event);

    let request = this._requestIdToRequest.get(event.requestId);

    if (!request) request = this._maybeAdoptMainRequest(event.requestId); // For certain requestIds we never receive requestWillBeSent event.
    // @see https://crbug.com/750469

    if (!request) return; // Under certain conditions we never get the Network.responseReceived
    // event from protocol. @see https://crbug.com/883475

    const response = request.request._existingResponse();

    if (response) {
      request.request.responseSize.transferSize = event.encodedDataLength;
      request.request.responseSize.encodedBodySize = event.encodedDataLength - request.request.responseSize.responseHeadersSize;

      response._requestFinished(_helper.helper.secondsToRoundishMillis(event.timestamp - request._timestamp));
    }

    this._requestIdToRequest.delete(request._requestId);

    if (request._interceptionId) this._attemptedAuthentications.delete(request._interceptionId);

    this._page._frameManager.reportRequestFinished(request.request, response);
  }

  _onLoadingFailed(event) {
    this._responseExtraInfoTracker.loadingFailed(event);

    let request = this._requestIdToRequest.get(event.requestId);

    if (!request) request = this._maybeAdoptMainRequest(event.requestId); // For certain requestIds we never receive requestWillBeSent event.
    // @see https://crbug.com/750469

    if (!request) return;

    const response = request.request._existingResponse();

    if (response) response._requestFinished(_helper.helper.secondsToRoundishMillis(event.timestamp - request._timestamp));

    this._requestIdToRequest.delete(request._requestId);

    if (request._interceptionId) this._attemptedAuthentications.delete(request._interceptionId);

    request.request._setFailureText(event.errorText);

    this._page._frameManager.requestFailed(request.request, !!event.canceled);
  }

  _maybeAdoptMainRequest(requestId) {
    // OOPIF has a main request that starts in the parent session but finishes in the child session.
    if (!this._parentManager) return;

    const request = this._parentManager._requestIdToRequest.get(requestId); // Main requests have matching loaderId and requestId.


    if (!request || request._documentId !== requestId) return;

    this._requestIdToRequest.set(requestId, request);

    this._parentManager._requestIdToRequest.delete(requestId);

    if (request._interceptionId && this._parentManager._attemptedAuthentications.has(request._interceptionId)) {
      this._parentManager._attemptedAuthentications.delete(request._interceptionId);

      this._attemptedAuthentications.add(request._interceptionId);
    }

    return request;
  }

}

exports.CRNetworkManager = CRNetworkManager;

class InterceptableRequest {
  constructor(options) {
    this.request = void 0;
    this._requestId = void 0;
    this._interceptionId = void 0;
    this._documentId = void 0;
    this._timestamp = void 0;
    this._wallTime = void 0;
    this._route = void 0;
    this._redirectedFrom = void 0;
    const {
      frame,
      documentId,
      route,
      requestWillBeSentEvent,
      requestPausedEvent,
      redirectedFrom
    } = options;
    this._timestamp = requestWillBeSentEvent.timestamp;
    this._wallTime = requestWillBeSentEvent.wallTime;
    this._requestId = requestWillBeSentEvent.requestId;
    this._interceptionId = requestPausedEvent && requestPausedEvent.requestId;
    this._documentId = documentId;
    this._route = route;
    this._redirectedFrom = redirectedFrom;
    const {
      headers,
      method,
      url,
      postDataEntries = null
    } = requestPausedEvent ? requestPausedEvent.request : requestWillBeSentEvent.request;
    const type = (requestWillBeSentEvent.type || '').toLowerCase();
    let postDataBuffer = null;
    if (postDataEntries && postDataEntries.length && postDataEntries[0].bytes) postDataBuffer = Buffer.from(postDataEntries[0].bytes, 'base64');
    this.request = new network.Request(frame, (redirectedFrom === null || redirectedFrom === void 0 ? void 0 : redirectedFrom.request) || null, documentId, url, type, method, postDataBuffer, (0, _utils.headersObjectToArray)(headers));
  }

  _routeForRedirectChain() {
    let request = this;

    while (request._redirectedFrom) request = request._redirectedFrom;

    return request._route;
  }

  wasFulfilled() {
    var _this$_routeForRedire;

    return ((_this$_routeForRedire = this._routeForRedirectChain()) === null || _this$_routeForRedire === void 0 ? void 0 : _this$_routeForRedire._wasFulfilled) || false;
  }

}

class RouteImpl {
  constructor(client, interceptionId) {
    this._client = void 0;
    this._interceptionId = void 0;
    this._responseInterceptedPromise = void 0;

    this._responseInterceptedCallback = () => {};

    this._interceptingResponse = false;
    this._wasFulfilled = false;
    this._client = client;
    this._interceptionId = interceptionId;
    this._responseInterceptedPromise = new Promise(resolve => this._responseInterceptedCallback = resolve);
  }

  async responseBody() {
    const response = await this._client.send('Fetch.getResponseBody', {
      requestId: this._interceptionId
    });
    return Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
  }

  async continue(request, overrides) {
    this._interceptingResponse = !!overrides.interceptResponse; // In certain cases, protocol will return error if the request was already canceled
    // or the page was closed. We should tolerate these errors.

    await this._client._sendMayFail('Fetch.continueRequest', {
      requestId: this._interceptionId,
      url: overrides.url,
      headers: overrides.headers,
      method: overrides.method,
      postData: overrides.postData ? overrides.postData.toString('base64') : undefined
    });
    if (!this._interceptingResponse) return null;
    const event = await this._responseInterceptedPromise;
    this._interceptionId = event.requestId; // FIXME: plumb status text from browser

    if (event.responseErrorReason) {
      this._client._sendMayFail('Fetch.continueRequest', {
        requestId: event.requestId
      });

      throw new Error(`Request failed: ${event.responseErrorReason}`);
    }

    return new network.InterceptedResponse(request, event.responseStatusCode, '', event.responseHeaders);
  }

  async fulfill(response) {
    this._wasFulfilled = true;
    const body = response.isBase64 ? response.body : Buffer.from(response.body).toString('base64');
    const responseHeaders = splitSetCookieHeader(response.headers); // In certain cases, protocol will return error if the request was already canceled
    // or the page was closed. We should tolerate these errors.

    await this._client._sendMayFail('Fetch.fulfillRequest', {
      requestId: this._interceptionId,
      responseCode: response.status,
      responsePhrase: network.STATUS_TEXTS[String(response.status)],
      responseHeaders,
      body
    });
  }

  async abort(errorCode = 'failed') {
    const errorReason = errorReasons[errorCode];
    (0, _utils.assert)(errorReason, 'Unknown error code: ' + errorCode); // In certain cases, protocol will return error if the request was already canceled
    // or the page was closed. We should tolerate these errors.

    await this._client._sendMayFail('Fetch.failRequest', {
      requestId: this._interceptionId,
      errorReason
    });
  }

}

function splitSetCookieHeader(headers) {
  const index = headers.findIndex(({
    name
  }) => name.toLowerCase() === 'set-cookie');
  if (index === -1) return headers;
  const header = headers[index];
  const values = header.value.split('\n');
  if (values.length === 1) return headers;
  const result = headers.slice();
  result.splice(index, 1, ...values.map(value => ({
    name: header.name,
    value
  })));
  return result;
}

const errorReasons = {
  'aborted': 'Aborted',
  'accessdenied': 'AccessDenied',
  'addressunreachable': 'AddressUnreachable',
  'blockedbyclient': 'BlockedByClient',
  'blockedbyresponse': 'BlockedByResponse',
  'connectionaborted': 'ConnectionAborted',
  'connectionclosed': 'ConnectionClosed',
  'connectionfailed': 'ConnectionFailed',
  'connectionrefused': 'ConnectionRefused',
  'connectionreset': 'ConnectionReset',
  'internetdisconnected': 'InternetDisconnected',
  'namenotresolved': 'NameNotResolved',
  'timedout': 'TimedOut',
  'failed': 'Failed'
};

// This class aligns responses with response headers from extra info:
//   - Network.requestWillBeSent, Network.responseReceived, Network.loadingFinished/loadingFailed are
//     dispatched using one channel.
//   - Network.requestWillBeSentExtraInfo and Network.responseReceivedExtraInfo are dispatches on
//     another channel. Those channels are not associated, so events come in random order.
//
// This class will associate responses with the new headers. These extra info headers will become
// available to client reliably upon requestfinished event only. It consumes CDP
// signals on one end and processResponse(network.Response) signals on the other hands. It then makes
// sure that responses have all the extra headers in place by the time request finises.
//
// The shape of the instrumentation API is deliberately following the CDP, so that it
// what clear what is called when and what this means to the tracker without extra
// documentation.
class ResponseExtraInfoTracker {
  constructor() {
    this._requests = new Map();
  }

  requestWillBeSent(event) {
    const info = this._requests.get(event.requestId);

    if (info && event.redirectResponse) this._innerResponseReceived(info, event.redirectResponse);else this._getOrCreateEntry(event.requestId);
  }

  requestWillBeSentExtraInfo(event) {
    const info = this._getOrCreateEntry(event.requestId);

    if (!info) return;
    info.requestWillBeSentExtraInfo.push(event);

    this._patchHeaders(info, info.requestWillBeSentExtraInfo.length - 1);
  }

  responseReceived(event) {
    const info = this._requests.get(event.requestId);

    if (!info) return;

    this._innerResponseReceived(info, event.response);
  }

  requestPaused(request, event) {
    // requestWillBeSentExtraInfo is not being called when interception
    // is enabled. But interception is mutually exclusive with the redirects.
    // So we can use the headers from the Fetch.requestPausedPayload immediately.
    request.setRawRequestHeaders((0, _utils.headersObjectToArray)(event.request.headers, '\n'));
  }

  _innerResponseReceived(info, response) {
    if (!response.connectionId) {
      // Starting with this response we no longer can guarantee that response and extra info correspond to the same index.
      info.sawResponseWithoutConnectionId = true;
    }
  }

  responseReceivedExtraInfo(event) {
    const info = this._getOrCreateEntry(event.requestId);

    info.responseReceivedExtraInfo.push(event);

    this._patchHeaders(info, info.responseReceivedExtraInfo.length - 1);

    this._checkFinished(info);
  }

  processResponse(requestId, response, wasFulfilled) {
    // We are not interested in ExtraInfo tracking for fulfilled requests, our Blink
    // headers are the ones that contain fulfilled headers.
    if (wasFulfilled) {
      this._stopTracking(requestId);

      return;
    }

    const info = this._requests.get(requestId);

    if (!info || info.sawResponseWithoutConnectionId) return;
    response.setWillReceiveExtraHeaders();
    info.responses.push(response);

    this._patchHeaders(info, info.responses.length - 1);
  }

  loadingFinished(event) {
    const info = this._requests.get(event.requestId);

    if (!info) return;
    info.loadingFinished = event;

    this._checkFinished(info);
  }

  loadingFailed(event) {
    const info = this._requests.get(event.requestId);

    if (!info) return;
    info.loadingFailed = event;

    this._checkFinished(info);
  }

  _getOrCreateEntry(requestId) {
    let info = this._requests.get(requestId);

    if (!info) {
      info = {
        requestId: requestId,
        requestWillBeSentExtraInfo: [],
        responseReceivedExtraInfo: [],
        responses: [],
        sawResponseWithoutConnectionId: false
      };

      this._requests.set(requestId, info);
    }

    return info;
  }

  _patchHeaders(info, index) {
    const response = info.responses[index];
    const requestExtraInfo = info.requestWillBeSentExtraInfo[index];
    if (response && requestExtraInfo) response.request().setRawRequestHeaders((0, _utils.headersObjectToArray)(requestExtraInfo.headers, '\n'));
    const responseExtraInfo = info.responseReceivedExtraInfo[index];

    if (response && responseExtraInfo) {
      var _responseExtraInfo$he;

      response.setRawResponseHeaders((0, _utils.headersObjectToArray)(responseExtraInfo.headers, '\n'));
      response.request().responseSize.responseHeadersSize = ((_responseExtraInfo$he = responseExtraInfo.headersText) === null || _responseExtraInfo$he === void 0 ? void 0 : _responseExtraInfo$he.length) || 0;
    }
  }

  _checkFinished(info) {
    if (!info.loadingFinished && !info.loadingFailed) return;

    if (info.responses.length <= info.responseReceivedExtraInfo.length) {
      // We have extra info for each response.
      // We could have more extra infos because we stopped collecting responses at some point.
      this._stopTracking(info.requestId);

      return;
    } // We are not done yet.

  }

  _stopTracking(requestId) {
    this._requests.delete(requestId);
  }

}