"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SocksProxyHandler = exports.SocksProxy = void 0;

var _dns = _interopRequireDefault(require("dns"));

var _events = _interopRequireDefault(require("events"));

var _net = _interopRequireDefault(require("net"));

var _util = _interopRequireDefault(require("util"));

var _debugLogger = require("./debugLogger");

var _netUtils = require("./netUtils");

var _utils = require("../utils");

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
const dnsLookupAsync = _util.default.promisify(_dns.default.lookup); // https://tools.ietf.org/html/rfc1928


var SocksAuth;

(function (SocksAuth) {
  SocksAuth[SocksAuth["NO_AUTHENTICATION_REQUIRED"] = 0] = "NO_AUTHENTICATION_REQUIRED";
  SocksAuth[SocksAuth["GSSAPI"] = 1] = "GSSAPI";
  SocksAuth[SocksAuth["USERNAME_PASSWORD"] = 2] = "USERNAME_PASSWORD";
  SocksAuth[SocksAuth["NO_ACCEPTABLE_METHODS"] = 255] = "NO_ACCEPTABLE_METHODS";
})(SocksAuth || (SocksAuth = {}));

var SocksAddressType;

(function (SocksAddressType) {
  SocksAddressType[SocksAddressType["IPv4"] = 1] = "IPv4";
  SocksAddressType[SocksAddressType["FqName"] = 3] = "FqName";
  SocksAddressType[SocksAddressType["IPv6"] = 4] = "IPv6";
})(SocksAddressType || (SocksAddressType = {}));

var SocksCommand;

(function (SocksCommand) {
  SocksCommand[SocksCommand["CONNECT"] = 1] = "CONNECT";
  SocksCommand[SocksCommand["BIND"] = 2] = "BIND";
  SocksCommand[SocksCommand["UDP_ASSOCIATE"] = 3] = "UDP_ASSOCIATE";
})(SocksCommand || (SocksCommand = {}));

var SocksReply;

(function (SocksReply) {
  SocksReply[SocksReply["Succeeded"] = 0] = "Succeeded";
  SocksReply[SocksReply["GeneralServerFailure"] = 1] = "GeneralServerFailure";
  SocksReply[SocksReply["NotAllowedByRuleSet"] = 2] = "NotAllowedByRuleSet";
  SocksReply[SocksReply["NetworkUnreachable"] = 3] = "NetworkUnreachable";
  SocksReply[SocksReply["HostUnreachable"] = 4] = "HostUnreachable";
  SocksReply[SocksReply["ConnectionRefused"] = 5] = "ConnectionRefused";
  SocksReply[SocksReply["TtlExpired"] = 6] = "TtlExpired";
  SocksReply[SocksReply["CommandNotSupported"] = 7] = "CommandNotSupported";
  SocksReply[SocksReply["AddressTypeNotSupported"] = 8] = "AddressTypeNotSupported";
})(SocksReply || (SocksReply = {}));

class SocksConnection {
  constructor(uid, socket, client) {
    this._buffer = Buffer.from([]);
    this._offset = 0;
    this._fence = 0;
    this._fenceCallback = void 0;
    this._socket = void 0;
    this._boundOnData = void 0;
    this._uid = void 0;
    this._client = void 0;
    this._uid = uid;
    this._socket = socket;
    this._client = client;
    this._boundOnData = this._onData.bind(this);
    socket.on('data', this._boundOnData);
    socket.on('close', () => this._onClose());
    socket.on('end', () => this._onClose());
    socket.on('error', () => this._onClose());

    this._run().catch(() => this._socket.end());
  }

  async _run() {
    (0, _utils.assert)(await this._authenticate());
    const {
      command,
      host,
      port
    } = await this._parseRequest();

    if (command !== SocksCommand.CONNECT) {
      this._writeBytes(Buffer.from([0x05, SocksReply.CommandNotSupported, 0x00, // RSV
      0x01, // IPv4
      0x00, 0x00, 0x00, 0x00, // Address
      0x00, 0x00 // Port
      ]));

      return;
    }

    this._socket.off('data', this._boundOnData);

    this._client.onSocketRequested({
      uid: this._uid,
      host,
      port
    });
  }

  async _authenticate() {
    // Request:
    // +----+----------+----------+
    // |VER | NMETHODS | METHODS  |
    // +----+----------+----------+
    // | 1  |    1     | 1 to 255 |
    // +----+----------+----------+
    // Response:
    // +----+--------+
    // |VER | METHOD |
    // +----+--------+
    // | 1  |   1    |
    // +----+--------+
    const version = await this._readByte();
    (0, _utils.assert)(version === 0x05, 'The VER field must be set to x05 for this version of the protocol, was ' + version);
    const nMethods = await this._readByte();
    (0, _utils.assert)(nMethods, 'No authentication methods specified');
    const methods = await this._readBytes(nMethods);

    for (const method of methods) {
      if (method === 0) {
        this._writeBytes(Buffer.from([version, method]));

        return true;
      }
    }

    this._writeBytes(Buffer.from([version, SocksAuth.NO_ACCEPTABLE_METHODS]));

    return false;
  }

  async _parseRequest() {
    // Request.
    // +----+-----+-------+------+----------+----------+
    // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
    // +----+-----+-------+------+----------+----------+
    // | 1  |  1  | X'00' |  1   | Variable |    2     |
    // +----+-----+-------+------+----------+----------+
    // Response.
    // +----+-----+-------+------+----------+----------+
    // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
    // +----+-----+-------+------+----------+----------+
    // | 1  |  1  | X'00' |  1   | Variable |    2     |
    // +----+-----+-------+------+----------+----------+
    const version = await this._readByte();
    (0, _utils.assert)(version === 0x05, 'The VER field must be set to x05 for this version of the protocol, was ' + version);
    const command = await this._readByte();
    await this._readByte(); // skip reserved.

    const addressType = await this._readByte();
    let host = '';

    switch (addressType) {
      case SocksAddressType.IPv4:
        host = (await this._readBytes(4)).join('.');
        break;

      case SocksAddressType.FqName:
        const length = await this._readByte();
        host = (await this._readBytes(length)).toString();
        break;

      case SocksAddressType.IPv6:
        const bytes = await this._readBytes(16);
        const tokens = [];

        for (let i = 0; i < 8; ++i) tokens.push(bytes.readUInt16BE(i * 2));

        host = tokens.join(':');
        break;
    }

    const port = (await this._readBytes(2)).readUInt16BE(0);
    this._buffer = Buffer.from([]);
    this._offset = 0;
    this._fence = 0;
    return {
      command,
      host,
      port
    };
  }

  async _readByte() {
    const buffer = await this._readBytes(1);
    return buffer[0];
  }

  async _readBytes(length) {
    this._fence = this._offset + length;
    if (!this._buffer || this._buffer.length < this._fence) await new Promise(f => this._fenceCallback = f);
    this._offset += length;
    return this._buffer.slice(this._offset - length, this._offset);
  }

  _writeBytes(buffer) {
    if (this._socket.writable) this._socket.write(buffer);
  }

  _onClose() {
    this._client.onSocketClosed({
      uid: this._uid
    });
  }

  _onData(buffer) {
    this._buffer = Buffer.concat([this._buffer, buffer]);

    if (this._fenceCallback && this._buffer.length >= this._fence) {
      const callback = this._fenceCallback;
      this._fenceCallback = undefined;
      callback();
    }
  }

  socketConnected(host, port) {
    this._writeBytes(Buffer.from([0x05, SocksReply.Succeeded, 0x00, // RSV
    0x01, // IPv4
    ...parseIP(host), // Address
    port << 8, port & 0xFF // Port
    ]));

    this._socket.on('data', data => this._client.onSocketData({
      uid: this._uid,
      data
    }));
  }

  socketFailed(errorCode) {
    const buffer = Buffer.from([0x05, 0, 0x00, // RSV
    0x01, // IPv4
    ...parseIP('0.0.0.0'), // Address
    0, 0 // Port
    ]);

    switch (errorCode) {
      case 'ENOENT':
      case 'ENOTFOUND':
      case 'ETIMEDOUT':
      case 'EHOSTUNREACH':
        buffer[1] = SocksReply.HostUnreachable;
        break;

      case 'ENETUNREACH':
        buffer[1] = SocksReply.NetworkUnreachable;
        break;

      case 'ECONNREFUSED':
        buffer[1] = SocksReply.ConnectionRefused;
        break;
    }

    this._writeBytes(buffer);

    this._socket.end();
  }

  sendData(data) {
    this._socket.write(data);
  }

  end() {
    this._socket.end();
  }

  error(error) {
    this._socket.destroy(new Error(error));
  }

}

function parseIP(address) {
  if (!_net.default.isIPv4(address)) throw new Error('IPv6 is not supported');
  return address.split('.', 4).map(t => +t);
}

class SocksProxy extends _events.default {
  constructor() {
    super();
    this._server = void 0;
    this._connections = new Map();
    this._server = new _net.default.Server(socket => {
      const uid = (0, _utils.createGuid)();
      const connection = new SocksConnection(uid, socket, this);

      this._connections.set(uid, connection);
    });
  }

  async listen(port) {
    return new Promise(f => {
      this._server.listen(port, () => {
        const port = this._server.address().port;

        _debugLogger.debugLogger.log('proxy', `Starting socks proxy server on port ${port}`);

        f(port);
      });
    });
  }

  async close() {
    await new Promise(f => this._server.close(f));
  }

  onSocketRequested(payload) {
    this.emit(SocksProxy.Events.SocksRequested, payload);
  }

  onSocketData(payload) {
    this.emit(SocksProxy.Events.SocksData, payload);
  }

  onSocketClosed(payload) {
    this.emit(SocksProxy.Events.SocksClosed, payload);
  }

  socketConnected({
    uid,
    host,
    port
  }) {
    var _this$_connections$ge;

    (_this$_connections$ge = this._connections.get(uid)) === null || _this$_connections$ge === void 0 ? void 0 : _this$_connections$ge.socketConnected(host, port);
  }

  socketFailed({
    uid,
    errorCode
  }) {
    var _this$_connections$ge2;

    (_this$_connections$ge2 = this._connections.get(uid)) === null || _this$_connections$ge2 === void 0 ? void 0 : _this$_connections$ge2.socketFailed(errorCode);
  }

  sendSocketData({
    uid,
    data
  }) {
    var _this$_connections$ge3;

    (_this$_connections$ge3 = this._connections.get(uid)) === null || _this$_connections$ge3 === void 0 ? void 0 : _this$_connections$ge3.sendData(data);
  }

  sendSocketEnd({
    uid
  }) {
    var _this$_connections$ge4;

    (_this$_connections$ge4 = this._connections.get(uid)) === null || _this$_connections$ge4 === void 0 ? void 0 : _this$_connections$ge4.end();
  }

  sendSocketError({
    uid,
    error
  }) {
    var _this$_connections$ge5;

    (_this$_connections$ge5 = this._connections.get(uid)) === null || _this$_connections$ge5 === void 0 ? void 0 : _this$_connections$ge5.error(error);
  }

}

exports.SocksProxy = SocksProxy;
SocksProxy.Events = {
  SocksRequested: 'socksRequested',
  SocksData: 'socksData',
  SocksClosed: 'socksClosed'
};

class SocksProxyHandler extends _events.default {
  constructor(redirectPortForTest) {
    super();
    this._sockets = new Map();
    this._redirectPortForTest = void 0;
    this._redirectPortForTest = redirectPortForTest;
  }

  cleanup() {
    for (const uid of this._sockets.keys()) this.socketClosed({
      uid
    });
  }

  async socketRequested({
    uid,
    host,
    port
  }) {
    if (host === 'local.playwright') host = '127.0.0.1'; // Node.js 17 does resolve localhost to ipv6

    if (host === 'localhost') host = '127.0.0.1';

    try {
      if (this._redirectPortForTest) port = this._redirectPortForTest;
      const {
        address
      } = await dnsLookupAsync(host);
      const socket = await (0, _netUtils.createSocket)(address, port);
      socket.on('data', data => {
        const payload = {
          uid,
          data
        };
        this.emit(SocksProxyHandler.Events.SocksData, payload);
      });
      socket.on('error', error => {
        const payload = {
          uid,
          error: error.message
        };
        this.emit(SocksProxyHandler.Events.SocksError, payload);

        this._sockets.delete(uid);
      });
      socket.on('end', () => {
        const payload = {
          uid
        };
        this.emit(SocksProxyHandler.Events.SocksEnd, payload);

        this._sockets.delete(uid);
      });
      const localAddress = socket.localAddress;
      const localPort = socket.localPort;

      this._sockets.set(uid, socket);

      const payload = {
        uid,
        host: localAddress,
        port: localPort
      };
      this.emit(SocksProxyHandler.Events.SocksConnected, payload);
    } catch (error) {
      const payload = {
        uid,
        errorCode: error.code
      };
      this.emit(SocksProxyHandler.Events.SocksFailed, payload);
    }
  }

  sendSocketData({
    uid,
    data
  }) {
    var _this$_sockets$get;

    (_this$_sockets$get = this._sockets.get(uid)) === null || _this$_sockets$get === void 0 ? void 0 : _this$_sockets$get.write(data);
  }

  socketClosed({
    uid
  }) {
    var _this$_sockets$get2;

    (_this$_sockets$get2 = this._sockets.get(uid)) === null || _this$_sockets$get2 === void 0 ? void 0 : _this$_sockets$get2.destroy();

    this._sockets.delete(uid);
  }

}

exports.SocksProxyHandler = SocksProxyHandler;
SocksProxyHandler.Events = {
  SocksConnected: 'socksConnected',
  SocksData: 'socksData',
  SocksError: 'socksError',
  SocksFailed: 'socksFailed',
  SocksEnd: 'socksEnd'
};