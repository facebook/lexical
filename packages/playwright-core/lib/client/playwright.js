"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Playwright = void 0;

var _dns = _interopRequireDefault(require("dns"));

var _util = _interopRequireDefault(require("util"));

var _errors = require("../utils/errors");

var _netUtils = require("../utils/netUtils");

var _android = require("./android");

var _browserType = require("./browserType");

var _channelOwner = require("./channelOwner");

var _electron = require("./electron");

var _fetch = require("./fetch");

var _selectors = require("./selectors");

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
const dnsLookupAsync = _util.default.promisify(_dns.default.lookup);

class Playwright extends _channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._android = void 0;
    this._electron = void 0;
    this.chromium = void 0;
    this.firefox = void 0;
    this.webkit = void 0;
    this.devices = void 0;
    this.selectors = void 0;
    this.request = void 0;
    this.errors = void 0;
    this._sockets = new Map();
    this._redirectPortForTest = void 0;
    this.request = new _fetch.Fetch(this);
    this.chromium = _browserType.BrowserType.from(initializer.chromium);
    this.chromium._playwright = this;
    this.firefox = _browserType.BrowserType.from(initializer.firefox);
    this.firefox._playwright = this;
    this.webkit = _browserType.BrowserType.from(initializer.webkit);
    this.webkit._playwright = this;
    this._android = _android.Android.from(initializer.android);
    this._electron = _electron.Electron.from(initializer.electron);
    this.devices = {};

    for (const {
      name,
      descriptor
    } of initializer.deviceDescriptors) this.devices[name] = descriptor;

    this.selectors = new _selectors.Selectors();
    this.errors = {
      TimeoutError: _errors.TimeoutError
    };

    const selectorsOwner = _selectors.SelectorsOwner.from(initializer.selectors);

    this.selectors._addChannel(selectorsOwner);

    this._connection.on('close', () => {
      this.selectors._removeChannel(selectorsOwner);

      for (const uid of this._sockets.keys()) this._onSocksClosed(uid);
    });
  }

  _setSelectors(selectors) {
    const selectorsOwner = _selectors.SelectorsOwner.from(this._initializer.selectors);

    this.selectors._removeChannel(selectorsOwner);

    this.selectors = selectors;

    this.selectors._addChannel(selectorsOwner);
  }

  _enablePortForwarding(redirectPortForTest) {
    this._redirectPortForTest = redirectPortForTest;

    this._channel.on('socksRequested', ({
      uid,
      host,
      port
    }) => this._onSocksRequested(uid, host, port));

    this._channel.on('socksData', ({
      uid,
      data
    }) => this._onSocksData(uid, Buffer.from(data, 'base64')));

    this._channel.on('socksClosed', ({
      uid
    }) => this._onSocksClosed(uid));
  }

  async _onSocksRequested(uid, host, port) {
    if (host === 'local.playwright') host = 'localhost';

    try {
      if (this._redirectPortForTest) port = this._redirectPortForTest;
      const {
        address
      } = await dnsLookupAsync(host);
      const socket = await (0, _netUtils.createSocket)(address, port);
      socket.on('data', data => this._channel.socksData({
        uid,
        data: data.toString('base64')
      }).catch(() => {}));
      socket.on('error', error => {
        this._channel.socksError({
          uid,
          error: error.message
        }).catch(() => {});

        this._sockets.delete(uid);
      });
      socket.on('end', () => {
        this._channel.socksEnd({
          uid
        }).catch(() => {});

        this._sockets.delete(uid);
      });
      const localAddress = socket.localAddress;
      const localPort = socket.localPort;

      this._sockets.set(uid, socket);

      this._channel.socksConnected({
        uid,
        host: localAddress,
        port: localPort
      }).catch(() => {});
    } catch (error) {
      this._channel.socksFailed({
        uid,
        errorCode: error.code
      }).catch(() => {});
    }
  }

  _onSocksData(uid, data) {
    var _this$_sockets$get;

    (_this$_sockets$get = this._sockets.get(uid)) === null || _this$_sockets$get === void 0 ? void 0 : _this$_sockets$get.write(data);
  }

  static from(channel) {
    return channel._object;
  }

  _onSocksClosed(uid) {
    var _this$_sockets$get2;

    (_this$_sockets$get2 = this._sockets.get(uid)) === null || _this$_sockets$get2 === void 0 ? void 0 : _this$_sockets$get2.destroy();

    this._sockets.delete(uid);
  }

}

exports.Playwright = Playwright;