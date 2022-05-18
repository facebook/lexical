"use strict";

var _utilsBundle = require("../utilsBundle");

var _playwrightConnection = require("../remote/playwrightConnection");

var _processLauncher = require("../utils/processLauncher");

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
function launchGridBrowserWorker(gridURL, agentId, workerId, browserAlias) {
  const log = (0, _utilsBundle.debug)(`pw:grid:worker:${workerId}`);
  log('created');
  const ws = new _utilsBundle.ws(gridURL.replace('http://', 'ws://') + `/registerWorker?agentId=${agentId}&workerId=${workerId}`);
  new _playwrightConnection.PlaywrightConnection(ws, true, browserAlias, true, undefined, log, async () => {
    log('exiting process');
    setTimeout(() => process.exit(0), 30000); // Meanwhile, try to gracefully close all browsers.

    await (0, _processLauncher.gracefullyCloseAll)();
    process.exit(0);
  });
}

launchGridBrowserWorker(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);