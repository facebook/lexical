"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.launch = launch;
exports.timeout = exports.capacity = exports.name = void 0;

var _child_process = _interopRequireDefault(require("child_process"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
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
const name = 'Agents co-located with grid';
exports.name = name;
const capacity = Infinity;
exports.capacity = capacity;
const timeout = 10000;
exports.timeout = timeout;

function launch({
  agentId,
  gridURL
}) {
  _child_process.default.spawn(process.argv[0], [_path.default.join(__dirname, '..', 'cli', 'cli.js'), 'experimental-grid-agent', '--grid-url', gridURL, '--agent-id', agentId], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit'
  });
}