"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebSocketDispatcher = exports.RouteDispatcher = exports.ResponseDispatcher = exports.RequestDispatcher = exports.APIRequestContextDispatcher = void 0;

var _fetch = require("../fetch");

var _network = require("../network");

var _dispatcher = require("./dispatcher");

var _frameDispatcher = require("./frameDispatcher");

var _tracingDispatcher = require("./tracingDispatcher");

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
class RequestDispatcher extends _dispatcher.Dispatcher {
  static from(scope, request) {
    const result = (0, _dispatcher.existingDispatcher)(request);
    return result || new RequestDispatcher(scope, request);
  }

  static fromNullable(scope, request) {
    return request ? RequestDispatcher.from(scope, request) : undefined;
  }

  constructor(scope, request) {
    const postData = request.postDataBuffer();
    super(scope, request, 'Request', {
      frame: _frameDispatcher.FrameDispatcher.from(scope, request.frame()),
      url: request.url(),
      resourceType: request.resourceType(),
      method: request.method(),
      postData: postData === null ? undefined : postData.toString('base64'),
      headers: request.headers(),
      isNavigationRequest: request.isNavigationRequest(),
      redirectedFrom: RequestDispatcher.fromNullable(scope, request.redirectedFrom())
    });
    this._type_Request = void 0;
    this._type_Request = true;
  }

  async rawRequestHeaders(params) {
    return {
      headers: await this._object.rawRequestHeaders()
    };
  }

  async response() {
    return {
      response: (0, _dispatcher.lookupNullableDispatcher)(await this._object.response())
    };
  }

}

exports.RequestDispatcher = RequestDispatcher;

class ResponseDispatcher extends _dispatcher.Dispatcher {
  static from(scope, response) {
    const result = (0, _dispatcher.existingDispatcher)(response);
    return result || new ResponseDispatcher(scope, response);
  }

  static fromNullable(scope, response) {
    return response ? ResponseDispatcher.from(scope, response) : undefined;
  }

  constructor(scope, response) {
    super(scope, response, 'Response', {
      // TODO: responses in popups can point to non-reported requests.
      request: RequestDispatcher.from(scope, response.request()),
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      timing: response.timing()
    });
    this._type_Response = true;
  }

  async body() {
    return {
      binary: (await this._object.body()).toString('base64')
    };
  }

  async securityDetails() {
    return {
      value: (await this._object.securityDetails()) || undefined
    };
  }

  async serverAddr() {
    return {
      value: (await this._object.serverAddr()) || undefined
    };
  }

  async rawResponseHeaders(params) {
    return {
      headers: await this._object.rawResponseHeaders()
    };
  }

  async sizes(params) {
    return {
      sizes: await this._object.sizes()
    };
  }

}

exports.ResponseDispatcher = ResponseDispatcher;

class RouteDispatcher extends _dispatcher.Dispatcher {
  static from(scope, route) {
    const result = (0, _dispatcher.existingDispatcher)(route);
    return result || new RouteDispatcher(scope, route);
  }

  constructor(scope, route) {
    super(scope, route, 'Route', {
      // Context route can point to a non-reported request.
      request: RequestDispatcher.from(scope, route.request())
    });
    this._type_Route = true;
  }

  async continue(params, metadata) {
    await this._object.continue({
      url: params.url,
      method: params.method,
      headers: params.headers,
      postData: params.postData !== undefined ? Buffer.from(params.postData, 'base64') : undefined
    });
  }

  async fulfill(params) {
    await this._object.fulfill(params);
  }

  async abort(params) {
    await this._object.abort(params.errorCode || 'failed');
  }

}

exports.RouteDispatcher = RouteDispatcher;

class WebSocketDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, webSocket) {
    super(scope, webSocket, 'WebSocket', {
      url: webSocket.url()
    });
    this._type_EventTarget = true;
    this._type_WebSocket = true;
    webSocket.on(_network.WebSocket.Events.FrameSent, event => this._dispatchEvent('frameSent', event));
    webSocket.on(_network.WebSocket.Events.FrameReceived, event => this._dispatchEvent('frameReceived', event));
    webSocket.on(_network.WebSocket.Events.SocketError, error => this._dispatchEvent('socketError', {
      error
    }));
    webSocket.on(_network.WebSocket.Events.Close, () => this._dispatchEvent('close', {}));
  }

}

exports.WebSocketDispatcher = WebSocketDispatcher;

class APIRequestContextDispatcher extends _dispatcher.Dispatcher {
  static from(scope, request) {
    const result = (0, _dispatcher.existingDispatcher)(request);
    return result || new APIRequestContextDispatcher(scope, request);
  }

  static fromNullable(scope, request) {
    return request ? APIRequestContextDispatcher.from(scope, request) : undefined;
  }

  constructor(scope, request) {
    super(scope, request, 'APIRequestContext', {
      tracing: _tracingDispatcher.TracingDispatcher.from(scope, request.tracing())
    }, true);
    this._type_APIRequestContext = true;
    request.once(_fetch.APIRequestContext.Events.Dispose, () => {
      if (!this._disposed) super._dispose();
    });
  }

  async storageState(params) {
    return this._object.storageState();
  }

  async dispose(params) {
    await this._object.dispose();
  }

  async fetch(params, metadata) {
    const fetchResponse = await this._object.fetch(params, metadata);
    return {
      response: {
        url: fetchResponse.url,
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: fetchResponse.headers,
        fetchUid: fetchResponse.fetchUid
      }
    };
  }

  async fetchResponseBody(params, metadata) {
    const buffer = this._object.fetchResponses.get(params.fetchUid);

    return {
      binary: buffer ? buffer.toString('base64') : undefined
    };
  }

  async fetchLog(params, metadata) {
    const log = this._object.fetchLog.get(params.fetchUid) || [];
    return {
      log
    };
  }

  async disposeAPIResponse(params, metadata) {
    this._object.disposeResponse(params.fetchUid);
  }

}

exports.APIRequestContextDispatcher = APIRequestContextDispatcher;