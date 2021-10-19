"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PlaywrightDispatcher = void 0;

var _net = _interopRequireDefault(require("net"));

var _fetch = require("../server/fetch");

var _debugLogger = require("../utils/debugLogger");

var _socksProxy = require("../utils/socksProxy");

var _utils = require("../utils/utils");

var _androidDispatcher = require("./androidDispatcher");

var _browserTypeDispatcher = require("./browserTypeDispatcher");

var _dispatcher = require("./dispatcher");

var _electronDispatcher = require("./electronDispatcher");

var _networkDispatchers = require("./networkDispatchers");

var _selectorsDispatcher = require("./selectorsDispatcher");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
class PlaywrightDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, playwright, customSelectors, preLaunchedBrowser) {
    const descriptors = require('../server/deviceDescriptors');

    const deviceDescriptors = Object.entries(descriptors).map(([name, descriptor]) => ({
      name,
      descriptor
    }));
    super(scope, playwright, 'Playwright', {
      chromium: new _browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.chromium),
      firefox: new _browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.firefox),
      webkit: new _browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.webkit),
      android: new _androidDispatcher.AndroidDispatcher(scope, playwright.android),
      electron: new _electronDispatcher.ElectronDispatcher(scope, playwright.electron),
      deviceDescriptors,
      selectors: customSelectors || new _selectorsDispatcher.SelectorsDispatcher(scope, playwright.selectors),
      preLaunchedBrowser
    }, false);
    this._socksProxy = void 0;
  }

  async enableSocksProxy() {
    this._socksProxy = new SocksProxy(this);
    this._object.options.socksProxyPort = await this._socksProxy.listen(0);

    _debugLogger.debugLogger.log('proxy', `Starting socks proxy server on port ${this._object.options.socksProxyPort}`);
  }

  async socksConnected(params) {
    var _this$_socksProxy;

    (_this$_socksProxy = this._socksProxy) === null || _this$_socksProxy === void 0 ? void 0 : _this$_socksProxy.socketConnected(params);
  }

  async socksFailed(params) {
    var _this$_socksProxy2;

    (_this$_socksProxy2 = this._socksProxy) === null || _this$_socksProxy2 === void 0 ? void 0 : _this$_socksProxy2.socketFailed(params);
  }

  async socksData(params) {
    var _this$_socksProxy3;

    (_this$_socksProxy3 = this._socksProxy) === null || _this$_socksProxy3 === void 0 ? void 0 : _this$_socksProxy3.sendSocketData(params);
  }

  async socksError(params) {
    var _this$_socksProxy4;

    (_this$_socksProxy4 = this._socksProxy) === null || _this$_socksProxy4 === void 0 ? void 0 : _this$_socksProxy4.sendSocketError(params);
  }

  async socksEnd(params) {
    var _this$_socksProxy5;

    (_this$_socksProxy5 = this._socksProxy) === null || _this$_socksProxy5 === void 0 ? void 0 : _this$_socksProxy5.sendSocketEnd(params);
  }

  async newRequest(params, metadata) {
    const request = new _fetch.GlobalFetchRequest(this._object, params);
    return {
      request: _networkDispatchers.FetchRequestDispatcher.from(this._scope, request)
    };
  }

}

exports.PlaywrightDispatcher = PlaywrightDispatcher;

class SocksProxy {
  constructor(dispatcher) {
    this._server = void 0;
    this._connections = new Map();
    this._dispatcher = void 0;
    this._dispatcher = dispatcher;
    this._server = new _net.default.Server(socket => {
      const uid = (0, _utils.createGuid)();
      const connection = new _socksProxy.SocksConnection(uid, socket, this);

      this._connections.set(uid, connection);
    });
  }

  async listen(port) {
    return new Promise(f => {
      this._server.listen(port, () => {
        f(this._server.address().port);
      });
    });
  }

  onSocketRequested(uid, host, port) {
    this._dispatcher._dispatchEvent('socksRequested', {
      uid,
      host,
      port
    });
  }

  onSocketData(uid, data) {
    this._dispatcher._dispatchEvent('socksData', {
      uid,
      data: data.toString('base64')
    });
  }

  onSocketClosed(uid) {
    this._dispatcher._dispatchEvent('socksClosed', {
      uid
    });
  }

  socketConnected(params) {
    var _this$_connections$ge;

    (_this$_connections$ge = this._connections.get(params.uid)) === null || _this$_connections$ge === void 0 ? void 0 : _this$_connections$ge.socketConnected(params.host, params.port);
  }

  socketFailed(params) {
    var _this$_connections$ge2;

    (_this$_connections$ge2 = this._connections.get(params.uid)) === null || _this$_connections$ge2 === void 0 ? void 0 : _this$_connections$ge2.socketFailed(params.errorCode);
  }

  sendSocketData(params) {
    var _this$_connections$ge3;

    (_this$_connections$ge3 = this._connections.get(params.uid)) === null || _this$_connections$ge3 === void 0 ? void 0 : _this$_connections$ge3.sendData(Buffer.from(params.data, 'base64'));
  }

  sendSocketEnd(params) {
    var _this$_connections$ge4;

    (_this$_connections$ge4 = this._connections.get(params.uid)) === null || _this$_connections$ge4 === void 0 ? void 0 : _this$_connections$ge4.end();
  }

  sendSocketError(params) {
    var _this$_connections$ge5;

    (_this$_connections$ge5 = this._connections.get(params.uid)) === null || _this$_connections$ge5 === void 0 ? void 0 : _this$_connections$ge5.error(params.error);
  }

}