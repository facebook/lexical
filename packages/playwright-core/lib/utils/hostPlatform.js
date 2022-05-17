"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hostPlatform = void 0;

var _os = _interopRequireDefault(require("os"));

var _ubuntuVersion = require("./ubuntuVersion");

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
const hostPlatform = (() => {
  const platform = _os.default.platform();

  if (platform === 'darwin') {
    const ver = _os.default.release().split('.').map(a => parseInt(a, 10));

    let macVersion = '';

    if (ver[0] < 18) {
      // Everything before 10.14 is considered 10.13.
      macVersion = 'mac10.13';
    } else if (ver[0] === 18) {
      macVersion = 'mac10.14';
    } else if (ver[0] === 19) {
      macVersion = 'mac10.15';
    } else {
      // ver[0] >= 20
      const LAST_STABLE_MAC_MAJOR_VERSION = 12; // Best-effort support for MacOS beta versions.

      macVersion = 'mac' + Math.min(ver[0] - 9, LAST_STABLE_MAC_MAJOR_VERSION); // BigSur is the first version that might run on Apple Silicon.

      if (_os.default.cpus().some(cpu => cpu.model.includes('Apple'))) macVersion += '-arm64';
    }

    return macVersion;
  }

  if (platform === 'linux') {
    const archSuffix = _os.default.arch() === 'arm64' ? '-arm64' : '';
    const ubuntuVersion = (0, _ubuntuVersion.getUbuntuVersionSync)();
    if (!ubuntuVersion) return 'generic-linux' + archSuffix;
    if (parseInt(ubuntuVersion, 10) <= 19) return 'ubuntu18.04' + archSuffix;
    return 'ubuntu20.04' + archSuffix;
  }

  if (platform === 'win32') return 'win64';
  return '<unknown>';
})();

exports.hostPlatform = hostPlatform;