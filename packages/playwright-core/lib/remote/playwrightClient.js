"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PlaywrightClient = void 0;

var _ws = _interopRequireDefault(require("ws"));

var _connection = require("../client/connection");

var _utils = require("../utils/utils");

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
class PlaywrightClient {
  static async connect(options) {
    const {
      wsEndpoint,
      timeout = 30000
    } = options;
    const connection = new _connection.Connection();
    connection.markAsRemote();
    const ws = new _ws.default(wsEndpoint);
    const waitForNextTask = (0, _utils.makeWaitForNextTask)();

    connection.onmessage = message => {
      if (ws.readyState === 2
      /** CLOSING */
      || ws.readyState === 3
      /** CLOSED */
      ) throw new Error('PlaywrightClient: writing to closed WebSocket connection');
      ws.send(JSON.stringify(message));
    };

    ws.on('message', message => waitForNextTask(() => connection.dispatch(JSON.parse(message.toString()))));
    const errorPromise = new Promise((_, reject) => ws.on('error', error => reject(error)));
    const closePromise = new Promise((_, reject) => ws.on('close', () => reject(new Error('Connection closed'))));
    const playwrightClientPromise = new Promise((resolve, reject) => {
      let playwright;
      ws.on('open', async () => {
        playwright = await connection.initializePlaywright();
        resolve(new PlaywrightClient(playwright, ws));
      });
      ws.on('close', (code, reason) => connection.close(reason));
    });
    let timer;

    try {
      await Promise.race([playwrightClientPromise, errorPromise, closePromise, new Promise((_, reject) => timer = setTimeout(() => reject(`Timeout of ${timeout}ms exceeded while connecting.`), timeout))]);
      return await playwrightClientPromise;
    } finally {
      clearTimeout(timer);
    }
  }

  constructor(playwright, ws) {
    this._playwright = void 0;
    this._ws = void 0;
    this._closePromise = void 0;
    this._playwright = playwright;
    this._ws = ws;
    this._closePromise = new Promise(f => ws.on('close', f));
  }

  playwright() {
    return this._playwright;
  }

  async close() {
    this._ws.close();

    await this._closePromise;
  }

}

exports.PlaywrightClient = PlaywrightClient;