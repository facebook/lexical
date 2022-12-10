"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebSocketDispatcher = exports.RouteDispatcher = exports.ResponseDispatcher = exports.RequestDispatcher = exports.APIRequestContextDispatcher = void 0;
var _network = require("../network");
var _dispatcher = require("./dispatcher");
var _tracingDispatcher = require("./tracingDispatcher");
var _frameDispatcher = require("./frameDispatcher");
var _pageDispatcher = require("./pageDispatcher");
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
      frame: _frameDispatcher.FrameDispatcher.fromNullable(scope, request.frame()),
      serviceWorker: _pageDispatcher.WorkerDispatcher.fromNullable(scope, request.serviceWorker()),
      url: request.url(),
      resourceType: request.resourceType(),
      method: request.method(),
      postData: postData === null ? undefined : postData,
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
      response: ResponseDispatcher.fromNullable(this.parentScope(), await this._object.response())
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
      timing: response.timing(),
      fromServiceWorker: response.fromServiceWorker()
    });
    this._type_Response = true;
  }
  async body() {
    return {
      binary: await this._object.body()
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
      request: scope
    });
    this._type_Route = true;
  }
  async continue(params, metadata) {
    // Used to discriminate between continue in tracing.
    metadata.params.requestUrl = this._object.request().url();
    await this._object.continue({
      url: params.url,
      method: params.method,
      headers: params.headers,
      postData: params.postData
    });
  }
  async fulfill(params, metadata) {
    // Used to discriminate between fulfills in tracing.
    metadata.params.requestUrl = this._object.request().url();
    await this._object.fulfill(params);
  }
  async abort(params, metadata) {
    // Used to discriminate between abort in tracing.
    metadata.params.requestUrl = this._object.request().url();
    await this._object.abort(params.errorCode || 'failed');
  }
  async redirectNavigationRequest(params) {
    await this._object.redirectNavigationRequest(params.url);
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
    this.addObjectListener(_network.WebSocket.Events.FrameSent, event => this._dispatchEvent('frameSent', event));
    this.addObjectListener(_network.WebSocket.Events.FrameReceived, event => this._dispatchEvent('frameReceived', event));
    this.addObjectListener(_network.WebSocket.Events.SocketError, error => this._dispatchEvent('socketError', {
      error
    }));
    this.addObjectListener(_network.WebSocket.Events.Close, () => this._dispatchEvent('close', {}));
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
  constructor(parentScope, request) {
    // We will reparent these to the context below.
    const tracing = _tracingDispatcher.TracingDispatcher.from(parentScope, request.tracing());
    super(parentScope, request, 'APIRequestContext', {
      tracing
    });
    this._type_APIRequestContext = true;
    this.adopt(tracing);
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
    return {
      binary: this._object.fetchResponses.get(params.fetchUid)
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