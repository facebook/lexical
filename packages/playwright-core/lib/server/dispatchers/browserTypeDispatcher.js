"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserTypeDispatcher = void 0;

var _browserDispatcher = require("./browserDispatcher");

var _dispatcher = require("./dispatcher");

var _browserContextDispatcher = require("./browserContextDispatcher");

var _jsonPipeDispatcher = require("../dispatchers/jsonPipeDispatcher");

var _userAgent = require("../../common/userAgent");

var socks = _interopRequireWildcard(require("../../common/socksProxy"));

var _events = _interopRequireDefault(require("events"));

var _progress = require("../progress");

var _transport = require("../transport");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
class BrowserTypeDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, browserType) {
    super(scope, browserType, 'BrowserType', {
      executablePath: browserType.executablePath(),
      name: browserType.name()
    }, true);
    this._type_BrowserType = true;
  }

  async launch(params, metadata) {
    const browser = await this._object.launch(metadata, params);
    return {
      browser: new _browserDispatcher.BrowserDispatcher(this._scope, browser)
    };
  }

  async launchPersistentContext(params, metadata) {
    const browserContext = await this._object.launchPersistentContext(metadata, params.userDataDir, params);
    return {
      context: new _browserContextDispatcher.BrowserContextDispatcher(this._scope, browserContext)
    };
  }

  async connectOverCDP(params, metadata) {
    const browser = await this._object.connectOverCDP(metadata, params.endpointURL, params, params.timeout);
    const browserDispatcher = new _browserDispatcher.BrowserDispatcher(this._scope, browser);
    return {
      browser: browserDispatcher,
      defaultContext: browser._defaultContext ? new _browserContextDispatcher.BrowserContextDispatcher(browserDispatcher._scope, browser._defaultContext) : undefined
    };
  }

  async connect(params, metadata) {
    const controller = new _progress.ProgressController(metadata, this._object);
    controller.setLogName('browser');
    return await controller.run(async progress => {
      const paramsHeaders = Object.assign({
        'User-Agent': (0, _userAgent.getUserAgent)()
      }, params.headers || {});
      const transport = await _transport.WebSocketTransport.connect(progress, params.wsEndpoint, paramsHeaders, true);
      let socksInterceptor;
      const pipe = new _jsonPipeDispatcher.JsonPipeDispatcher(this._scope);

      transport.onmessage = json => {
        var _socksInterceptor;

        if (json.method === '__create__' && json.params.type === 'SocksSupport') socksInterceptor = new SocksInterceptor(transport, params.socksProxyRedirectPortForTest, json.params.guid);
        if ((_socksInterceptor = socksInterceptor) !== null && _socksInterceptor !== void 0 && _socksInterceptor.interceptMessage(json)) return;

        const cb = () => {
          try {
            pipe.dispatch(json);
          } catch (e) {
            transport.close();
          }
        };

        if (params.slowMo) setTimeout(cb, params.slowMo);else cb();
      };

      pipe.on('message', message => {
        transport.send(message);
      });

      transport.onclose = () => {
        var _socksInterceptor2;

        (_socksInterceptor2 = socksInterceptor) === null || _socksInterceptor2 === void 0 ? void 0 : _socksInterceptor2.cleanup();
        pipe.wasClosed();
      };

      pipe.on('close', () => transport.close());
      return {
        pipe
      };
    }, params.timeout || 0);
  }

}

exports.BrowserTypeDispatcher = BrowserTypeDispatcher;

class SocksInterceptor {
  constructor(transport, redirectPortForTest, socksSupportObjectGuid) {
    this._handler = void 0;
    this._channel = void 0;
    this._socksSupportObjectGuid = void 0;
    this._ids = new Set();
    this._handler = new socks.SocksProxyHandler(redirectPortForTest);
    this._socksSupportObjectGuid = socksSupportObjectGuid;
    let lastId = -1;
    this._channel = new Proxy(new _events.default(), {
      get: (obj, prop) => {
        if (prop in obj || obj[prop] !== undefined || typeof prop !== 'string') return obj[prop];
        return params => {
          try {
            const id = --lastId;

            this._ids.add(id);

            transport.send({
              id,
              guid: socksSupportObjectGuid,
              method: prop,
              params,
              metadata: {
                stack: [],
                apiName: '',
                internal: true
              }
            });
          } catch (e) {}
        };
      }
    });

    this._handler.on(socks.SocksProxyHandler.Events.SocksConnected, payload => this._channel.socksConnected(payload));

    this._handler.on(socks.SocksProxyHandler.Events.SocksData, payload => this._channel.socksData({
      uid: payload.uid,
      data: payload.data.toString('base64')
    }));

    this._handler.on(socks.SocksProxyHandler.Events.SocksError, payload => this._channel.socksError(payload));

    this._handler.on(socks.SocksProxyHandler.Events.SocksFailed, payload => this._channel.socksFailed(payload));

    this._handler.on(socks.SocksProxyHandler.Events.SocksEnd, payload => this._channel.socksEnd(payload));

    this._channel.on('socksRequested', payload => this._handler.socketRequested(payload));

    this._channel.on('socksClosed', payload => this._handler.socketClosed(payload));

    this._channel.on('socksData', payload => this._handler.sendSocketData({
      uid: payload.uid,
      data: Buffer.from(payload.data, 'base64')
    }));
  }

  cleanup() {
    this._handler.cleanup();
  }

  interceptMessage(message) {
    if (this._ids.has(message.id)) {
      this._ids.delete(message.id);

      return true;
    }

    if (message.guid === this._socksSupportObjectGuid) {
      this._channel.emit(message.method, message.params);

      return true;
    }

    return false;
  }

}