"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
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

const simpleFactory = {
  name: 'Agents co-located with grid',
  capacity: Infinity,
  launchTimeout: 10000,
  retireTimeout: 10000,
  launch: async options => {
    _child_process.default.spawn(process.argv[0], [_path.default.join(__dirname, '..', 'cli', 'cli.js'), 'experimental-grid-agent', '--grid-url', options.gridURL, '--agent-id', options.agentId], {
      cwd: __dirname,
      shell: true,
      stdio: 'inherit'
    });
  }
};
var _default = simpleFactory;
exports.default = _default;