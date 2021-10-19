"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.start = start;

var _connection = require("./client/connection");

var _transport = require("./protocol/transport");

var childProcess = _interopRequireWildcard(require("child_process"));

var path = _interopRequireWildcard(require("path"));

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
async function start(env = {}) {
  const client = new PlaywrightClient(env);
  const playwright = await client._playwright;

  playwright.stop = () => client.stop();

  playwright.driverProcess = client._driverProcess;
  return playwright;
}

class PlaywrightClient {
  constructor(env) {
    this._playwright = void 0;
    this._driverProcess = void 0;
    this._closePromise = void 0;
    this._onExit = void 0;

    this._onExit = (exitCode, signal) => {
      throw new Error(`Server closed with exitCode=${exitCode} signal=${signal}`);
    };

    this._driverProcess = childProcess.fork(path.join(__dirname, 'cli', 'cli.js'), ['run-driver'], {
      stdio: 'pipe',
      detached: true,
      env: { ...process.env,
        ...env
      }
    });

    this._driverProcess.unref();

    this._driverProcess.on('exit', this._onExit);

    const connection = new _connection.Connection();
    const transport = new _transport.Transport(this._driverProcess.stdin, this._driverProcess.stdout);

    connection.onmessage = message => transport.send(JSON.stringify(message));

    transport.onmessage = message => connection.dispatch(JSON.parse(message));

    this._closePromise = new Promise(f => transport.onclose = f);
    this._playwright = connection.initializePlaywright();
  }

  async stop() {
    this._driverProcess.removeListener('exit', this._onExit);

    this._driverProcess.stdin.destroy();

    this._driverProcess.stdout.destroy();

    this._driverProcess.stderr.destroy();

    await this._closePromise;
  }

}