"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PlaywrightServer = void 0;

var _utilsBundle = require("../utilsBundle");

var http = _interopRequireWildcard(require("http"));

var _playwrightConnection = require("./playwrightConnection");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
const debugLog = (0, _utilsBundle.debug)('pw:server');
let lastConnectionId = 0;
const kConnectionSymbol = Symbol('kConnection');

function newLogger() {
  const id = ++lastConnectionId;
  return message => debugLog(`[id=${id}] ${message}`);
}

class PlaywrightServer {
  static async startDefault(options = {}) {
    const {
      path = '/ws',
      maxClients = 1,
      enableSocksProxy = true
    } = options;
    return new PlaywrightServer(path, maxClients, enableSocksProxy);
  }

  constructor(path, maxClients, enableSocksProxy, browser) {
    this._path = void 0;
    this._maxClients = void 0;
    this._enableSocksProxy = void 0;
    this._browser = void 0;
    this._wsServer = void 0;
    this._clientsCount = 0;
    this._path = path;
    this._maxClients = maxClients;
    this._enableSocksProxy = enableSocksProxy;
    this._browser = browser;
  }

  async listen(port = 0) {
    const server = http.createServer((request, response) => {
      response.end('Running');
    });
    server.on('error', error => debugLog(error));
    const wsEndpoint = await new Promise((resolve, reject) => {
      server.listen(port, () => {
        const address = server.address();

        if (!address) {
          reject(new Error('Could not bind server socket'));
          return;
        }

        const wsEndpoint = typeof address === 'string' ? `${address}${this._path}` : `ws://127.0.0.1:${address.port}${this._path}`;
        resolve(wsEndpoint);
      }).on('error', reject);
    });
    debugLog('Listening at ' + wsEndpoint);
    this._wsServer = new _utilsBundle.wsServer({
      server,
      path: this._path
    });

    const originalShouldHandle = this._wsServer.shouldHandle.bind(this._wsServer);

    this._wsServer.shouldHandle = request => originalShouldHandle(request) && this._clientsCount < this._maxClients;

    this._wsServer.on('connection', async (ws, request) => {
      if (this._clientsCount >= this._maxClients) {
        ws.close(1013, 'Playwright Server is busy');
        return;
      }

      const url = new URL('http://localhost' + (request.url || ''));
      const browserHeader = request.headers['x-playwright-browser'];
      const browserAlias = url.searchParams.get('browser') || (Array.isArray(browserHeader) ? browserHeader[0] : browserHeader);
      const headlessHeader = request.headers['x-playwright-headless'];
      const headlessValue = url.searchParams.get('headless') || (Array.isArray(headlessHeader) ? headlessHeader[0] : headlessHeader);
      const proxyHeader = request.headers['x-playwright-proxy'];
      const proxyValue = url.searchParams.get('proxy') || (Array.isArray(proxyHeader) ? proxyHeader[0] : proxyHeader);
      const enableSocksProxy = this._enableSocksProxy && proxyValue === '*';
      this._clientsCount++;
      const log = newLogger();
      log(`serving connection: ${request.url}`);
      const connection = new _playwrightConnection.PlaywrightConnection(ws, enableSocksProxy, browserAlias, headlessValue !== '0', this._browser, log, () => this._clientsCount--);
      ws[kConnectionSymbol] = connection;
    });

    return wsEndpoint;
  }

  async close() {
    const server = this._wsServer;
    if (!server) return;
    debugLog('closing websocket server');
    const waitForClose = new Promise(f => server.close(f)); // First disconnect all remaining clients.

    await Promise.all(Array.from(server.clients).map(async ws => {
      const connection = ws[kConnectionSymbol];
      if (connection) await connection.close();

      try {
        ws.terminate();
      } catch (e) {}
    }));
    await waitForClose;
    debugLog('closing http server');
    await new Promise(f => server.options.server.close(f));
    this._wsServer = undefined;
    debugLog('closed server');
  }

}

exports.PlaywrightServer = PlaywrightServer;