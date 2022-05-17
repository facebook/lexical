"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getClientLanguage = getClientLanguage;
exports.getPlaywrightVersion = getPlaywrightVersion;
exports.getUserAgent = getUserAgent;

var _child_process = require("child_process");

var _fs = _interopRequireDefault(require("fs"));

var _os = _interopRequireDefault(require("os"));

var _ubuntuVersion = require("../utils/ubuntuVersion");

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
let cachedUserAgent;

function getUserAgent() {
  if (cachedUserAgent) return cachedUserAgent;

  try {
    cachedUserAgent = determineUserAgent();
  } catch (e) {
    cachedUserAgent = 'Playwright/unknown';
  }

  return cachedUserAgent;
}

function determineUserAgent() {
  let osIdentifier = 'unknown';
  let osVersion = 'unknown';

  if (process.platform === 'win32') {
    const version = _os.default.release().split('.');

    osIdentifier = 'windows';
    osVersion = `${version[0]}.${version[1]}`;
  } else if (process.platform === 'darwin') {
    const version = (0, _child_process.execSync)('sw_vers -productVersion', {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim().split('.');
    osIdentifier = 'macOS';
    osVersion = `${version[0]}.${version[1]}`;
  } else if (process.platform === 'linux') {
    try {
      // List of /etc/os-release values for different distributions could be
      // found here: https://gist.github.com/aslushnikov/8ceddb8288e4cf9db3039c02e0f4fb75
      const osReleaseText = _fs.default.readFileSync('/etc/os-release', 'utf8');

      const fields = (0, _ubuntuVersion.parseOSReleaseText)(osReleaseText);
      osIdentifier = fields.get('id') || 'unknown';
      osVersion = fields.get('version_id') || 'unknown';
    } catch (e) {
      // Linux distribution without /etc/os-release.
      // Default to linux/unknown.
      osIdentifier = 'linux';
    }
  }

  const {
    langName,
    langVersion
  } = getClientLanguage();
  return `Playwright/${getPlaywrightVersion()} (${_os.default.arch()}; ${osIdentifier} ${osVersion}) ${langName}/${langVersion}`;
}

function getClientLanguage() {
  let langName = 'unknown';
  let langVersion = 'unknown';

  if (!process.env.PW_LANG_NAME) {
    langName = 'node';
    langVersion = process.version.substring(1).split('.').slice(0, 2).join('.');
  } else if (['node', 'python', 'java', 'csharp'].includes(process.env.PW_LANG_NAME)) {
    var _process$env$PW_LANG_;

    langName = process.env.PW_LANG_NAME;
    langVersion = (_process$env$PW_LANG_ = process.env.PW_LANG_NAME_VERSION) !== null && _process$env$PW_LANG_ !== void 0 ? _process$env$PW_LANG_ : 'unknown';
  }

  return {
    langName,
    langVersion
  };
}

function getPlaywrightVersion(majorMinorOnly = false) {
  const packageJson = require('./../../package.json');

  return majorMinorOnly ? packageJson.version.split('.').slice(0, 2).join('.') : packageJson.version;
}