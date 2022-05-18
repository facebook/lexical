"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.start = start;

var _connection = require("./client/connection");

var _transport = require("./protocol/transport");

var childProcess = _interopRequireWildcard(require("child_process"));

var path = _interopRequireWildcard(require("path"));

var _manualPromise = require("./utils/manualPromise");

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
  playwright.driverProcess = client._driverProcess;
  return {
    playwright,
    stop: () => client.stop()
  };
}

class PlaywrightClient {
  constructor(env) {
    this._playwright = void 0;
    this._driverProcess = void 0;
    this._closePromise = new _manualPromise.ManualPromise();
    this._transport = void 0;
    this._stopped = false;
    this._driverProcess = childProcess.fork(path.join(__dirname, 'cli', 'cli.js'), ['run-driver'], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      detached: true,
      env: { ...process.env,
        ...env
      }
    });

    this._driverProcess.unref();

    this._driverProcess.on('exit', this._onExit.bind(this));

    const connection = new _connection.Connection();
    this._transport = new _transport.IpcTransport(this._driverProcess);

    connection.onmessage = message => this._transport.send(JSON.stringify(message));

    this._transport.onmessage = message => connection.dispatch(JSON.parse(message));

    this._transport.onclose = () => this._closePromise.resolve();

    this._playwright = connection.initializePlaywright();
  }

  async stop() {
    this._stopped = true;

    this._transport.close();

    await this._closePromise;
  }

  _onExit(exitCode, signal) {
    if (this._stopped) this._closePromise.resolve();else throw new Error(`Server closed with exitCode=${exitCode} signal=${signal}`);
  }

}