"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createSocket = createSocket;

var _net = _interopRequireDefault(require("net"));

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
async function createSocket(host, port) {
  return new Promise((resolve, reject) => {
    const socket = _net.default.createConnection({
      host,
      port
    });

    socket.on('connect', () => resolve(socket));
    socket.on('error', error => reject(error));
  });
}