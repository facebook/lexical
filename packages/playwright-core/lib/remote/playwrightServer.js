"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PlaywrightServer = void 0;

var _debug = _interopRequireDefault(require("debug"));

var http = _interopRequireWildcard(require("http"));

var ws = _interopRequireWildcard(require("ws"));

var _dispatcher = require("../dispatchers/dispatcher");

var _playwrightDispatcher = require("../dispatchers/playwrightDispatcher");

var _playwright2 = require("../server/playwright");

var _processLauncher = require("../utils/processLauncher");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
const debugLog = (0, _debug.default)('pw:server');

class PlaywrightServer {
  static async startDefault() {
    const cleanup = async () => {
      await (0, _processLauncher.gracefullyCloseAll)().catch(e => {});
    };

    const delegate = {
      path: '/ws',
      allowMultipleClients: false,
      onClose: cleanup,
      onConnect: async connection => {
        let playwright;
        new _dispatcher.Root(connection, async rootScope => {
          playwright = (0, _playwright2.createPlaywright)('javascript');
          const dispatcher = new _playwrightDispatcher.PlaywrightDispatcher(rootScope, playwright);
          if (process.env.PW_SOCKS_PROXY_PORT) await dispatcher.enableSocksProxy();
          return dispatcher;
        });
        return () => {
          var _playwright;

          cleanup();
          (_playwright = playwright) === null || _playwright === void 0 ? void 0 : _playwright.selectors.unregisterAll();
        };
      }
    };
    return new PlaywrightServer(delegate);
  }

  constructor(delegate) {
    this._wsServer = void 0;
    this._clientsCount = 0;
    this._delegate = void 0;
    this._delegate = delegate;
  }

  async listen(port = 0) {
    const server = http.createServer((request, response) => {
      response.end('Running');
    });
    server.on('error', error => debugLog(error));
    const path = this._delegate.path;
    const wsEndpoint = await new Promise((resolve, reject) => {
      server.listen(port, () => {
        const address = server.address();

        if (!address) {
          reject(new Error('Could not bind server socket'));
          return;
        }

        const wsEndpoint = typeof address === 'string' ? `${address}${path}` : `ws://127.0.0.1:${address.port}${path}`;
        resolve(wsEndpoint);
      }).on('error', reject);
    });
    debugLog('Listening at ' + wsEndpoint);
    this._wsServer = new ws.Server({
      server,
      path
    });

    this._wsServer.on('connection', async socket => {
      if (this._clientsCount && !this._delegate.allowMultipleClients) {
        socket.close();
        return;
      }

      this._clientsCount++;
      debugLog('Incoming connection');
      const connection = new _dispatcher.DispatcherConnection();

      connection.onmessage = message => {
        if (socket.readyState !== ws.CLOSING) socket.send(JSON.stringify(message));
      };

      socket.on('message', message => {
        connection.dispatch(JSON.parse(Buffer.from(message).toString()));
      });

      const forceDisconnect = () => socket.close();

      let onDisconnect = () => {};

      const disconnected = () => {
        this._clientsCount--; // Avoid sending any more messages over closed socket.

        connection.onmessage = () => {};

        onDisconnect();
      };

      socket.on('close', () => {
        debugLog('Client closed');
        disconnected();
      });
      socket.on('error', error => {
        debugLog('Client error ' + error);
        disconnected();
      });
      onDisconnect = await this._delegate.onConnect(connection, forceDisconnect);
    });

    return wsEndpoint;
  }

  async close() {
    if (!this._wsServer) return;
    debugLog('Closing server'); // First disconnect all remaining clients.

    await new Promise(f => this._wsServer.close(f));
    await new Promise(f => this._wsServer.options.server.close(f));
    this._wsServer = undefined;
    await this._delegate.onClose();
  }

}

exports.PlaywrightServer = PlaywrightServer;