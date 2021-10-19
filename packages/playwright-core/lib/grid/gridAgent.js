"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.launchGridAgent = launchGridAgent;

var _debug = _interopRequireDefault(require("debug"));

var _ws = _interopRequireDefault(require("ws"));

var _child_process = require("child_process");

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
function launchGridAgent(agentId, gridURL) {
  const log = (0, _debug.default)(`[agent ${agentId}]`);
  log('created');
  const params = new URLSearchParams();
  params.set('pwVersion', (0, _utils.getPlaywrightVersion)(true
  /* majorMinorOnly */
  ));
  params.set('agentId', agentId);
  const ws = new _ws.default(gridURL + `/registerAgent?` + params.toString());
  ws.on('message', workerId => {
    log('Worker requested ' + workerId);
    (0, _child_process.fork)(require.resolve('./gridWorker.js'), [gridURL, agentId, workerId], {
      detached: true
    });
  });
  ws.on('close', () => process.exit(0));
}