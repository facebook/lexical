"use strict";

var _ws = _interopRequireDefault(require("ws"));

var _debug = _interopRequireDefault(require("debug"));

var _dispatcher = require("../dispatchers/dispatcher");

var _playwrightDispatcher = require("../dispatchers/playwrightDispatcher");

var _playwright = require("../server/playwright");

var _processLauncher = require("../utils/processLauncher");

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
function launchGridWorker(gridURL, agentId, workerId) {
  const log = (0, _debug.default)(`[worker ${workerId}]`);
  log('created');
  const ws = new _ws.default(gridURL + `/registerWorker?agentId=${agentId}&workerId=${workerId}`);
  const dispatcherConnection = new _dispatcher.DispatcherConnection();

  dispatcherConnection.onmessage = message => ws.send(JSON.stringify(message));

  ws.once('open', () => {
    new _dispatcher.Root(dispatcherConnection, async rootScope => {
      const playwright = (0, _playwright.createPlaywright)('javascript');
      const dispatcher = new _playwrightDispatcher.PlaywrightDispatcher(rootScope, playwright);
      dispatcher.enableSocksProxy();
      return dispatcher;
    });
  });
  ws.on('message', message => dispatcherConnection.dispatch(JSON.parse(message.toString())));
  ws.on('close', async () => {
    // Drop any messages during shutdown on the floor.
    dispatcherConnection.onmessage = () => {};

    setTimeout(() => process.exit(0), 30000); // Meanwhile, try to gracefully close all browsers.

    await (0, _processLauncher.gracefullyCloseAll)();
    process.exit(0);
  });
}

launchGridWorker(process.argv[2], process.argv[3], process.argv[4]);