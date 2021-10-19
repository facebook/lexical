"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GridClient = void 0;

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
class GridClient {
  static async connect(gridURL) {
    const params = new URLSearchParams();
    params.set('pwVersion', (0, _utils.getPlaywrightVersion)(true
    /* majorMinorOnly */
    ));
    const ws = new _ws.default(`${gridURL}/claimWorker?` + params.toString());
    const errorText = await Promise.race([new Promise(f => ws.once('message', () => f(undefined))), new Promise(f => ws.once('close', (code, reason) => f(reason)))]);
    if (errorText) throw errorText;
    const connection = new _connection.Connection();
    connection.markAsRemote();

    connection.onmessage = message => ws.send(JSON.stringify(message));

    ws.on('message', message => connection.dispatch(JSON.parse(message.toString())));
    ws.on('close', (code, reason) => connection.close(reason));
    const playwright = await connection.initializePlaywright();

    playwright._enablePortForwarding();

    return new GridClient(ws, playwright);
  }

  constructor(ws, playwright) {
    this._ws = void 0;
    this._playwright = void 0;
    this._ws = ws;
    this._playwright = playwright;
  }

  playwright() {
    return this._playwright;
  }

  close() {
    this._ws.close();
  }

}

exports.GridClient = GridClient;