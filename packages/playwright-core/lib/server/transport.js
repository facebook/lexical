"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebSocketTransport = void 0;
var _utilsBundle = require("../utilsBundle");
var _utils = require("../utils");
/**
 * Copyright 2018 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class WebSocketTransport {
  static async connect(progress, url, headers, followRedirects) {
    progress === null || progress === void 0 ? void 0 : progress.log(`<ws connecting> ${url}`);
    const transport = new WebSocketTransport(progress, url, headers, followRedirects);
    let success = false;
    progress === null || progress === void 0 ? void 0 : progress.cleanupWhenAborted(async () => {
      if (!success) await transport.closeAndWait().catch(e => null);
    });
    await new Promise((fulfill, reject) => {
      transport._ws.on('open', async () => {
        progress === null || progress === void 0 ? void 0 : progress.log(`<ws connected> ${url}`);
        fulfill(transport);
      });
      transport._ws.on('error', event => {
        progress === null || progress === void 0 ? void 0 : progress.log(`<ws connect error> ${url} ${event.message}`);
        reject(new Error('WebSocket error: ' + event.message));
        transport._ws.close();
      });
      transport._ws.on('unexpected-response', (request, response) => {
        const chunks = [];
        const errorPrefix = `${url} ${response.statusCode} ${response.statusMessage}`;
        response.on('data', chunk => chunks.push(chunk));
        response.on('close', () => {
          const error = chunks.length ? `${errorPrefix}\n${Buffer.concat(chunks)}` : errorPrefix;
          progress === null || progress === void 0 ? void 0 : progress.log(`<ws unexpected response> ${error}`);
          reject(new Error('WebSocket error: ' + error));
          transport._ws.close();
        });
      });
    });
    success = true;
    return transport;
  }
  constructor(progress, url, headers, followRedirects) {
    var _progress$timeUntilDe;
    this._ws = void 0;
    this._progress = void 0;
    this.onmessage = void 0;
    this.onclose = void 0;
    this.wsEndpoint = void 0;
    this.wsEndpoint = url;
    this._ws = new _utilsBundle.ws(url, [], {
      perMessageDeflate: false,
      maxPayload: 256 * 1024 * 1024,
      // 256Mb,
      // Prevent internal http client error when passing negative timeout.
      handshakeTimeout: Math.max((_progress$timeUntilDe = progress === null || progress === void 0 ? void 0 : progress.timeUntilDeadline()) !== null && _progress$timeUntilDe !== void 0 ? _progress$timeUntilDe : 30_000, 1),
      headers,
      followRedirects
    });
    this._progress = progress;
    // The 'ws' module in node sometimes sends us multiple messages in a single task.
    // In Web, all IO callbacks (e.g. WebSocket callbacks)
    // are dispatched into separate tasks, so there's no need
    // to do anything extra.
    const messageWrap = (0, _utils.makeWaitForNextTask)();
    this._ws.addEventListener('message', event => {
      messageWrap(() => {
        try {
          if (this.onmessage) this.onmessage.call(null, JSON.parse(event.data));
        } catch (e) {
          this._ws.close();
        }
      });
    });
    this._ws.addEventListener('close', event => {
      var _this$_progress;
      (_this$_progress = this._progress) === null || _this$_progress === void 0 ? void 0 : _this$_progress.log(`<ws disconnected> ${url} code=${event.code} reason=${event.reason}`);
      if (this.onclose) this.onclose.call(null);
    });
    // Prevent Error: read ECONNRESET.
    this._ws.addEventListener('error', error => {
      var _this$_progress2;
      return (_this$_progress2 = this._progress) === null || _this$_progress2 === void 0 ? void 0 : _this$_progress2.log(`<ws error> ${error.type} ${error.message}`);
    });
  }
  send(message) {
    this._ws.send(JSON.stringify(message));
  }
  close() {
    var _this$_progress3;
    (_this$_progress3 = this._progress) === null || _this$_progress3 === void 0 ? void 0 : _this$_progress3.log(`<ws disconnecting> ${this._ws.url}`);
    this._ws.close();
  }
  async closeAndWait() {
    if (this._ws.readyState === _utilsBundle.ws.CLOSED) return;
    const promise = new Promise(f => this._ws.once('close', f));
    this.close();
    await promise; // Make sure to await the actual disconnect.
  }
}
exports.WebSocketTransport = WebSocketTransport;