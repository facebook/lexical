"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Firefox = void 0;
var os = _interopRequireWildcard(require("os"));
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _ffBrowser = require("./ffBrowser");
var _ffConnection = require("./ffConnection");
var _browserType = require("../browserType");
var _stackTrace = require("../../utils/stackTrace");
var _utils = require("../../utils");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
/**
 * Copyright 2017 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class Firefox extends _browserType.BrowserType {
  constructor(playwrightOptions) {
    super('firefox', playwrightOptions);
  }
  _connectToTransport(transport, options) {
    return _ffBrowser.FFBrowser.connect(transport, options);
  }
  _rewriteStartupError(error) {
    if (error.message.includes('no DISPLAY environment variable specified')) return (0, _stackTrace.rewriteErrorMessage)(error, '\n' + (0, _utils.wrapInASCIIBox)(_browserType.kNoXServerRunningError, 1));
    return error;
  }
  _amendEnvironment(env, userDataDir, executable, browserArguments) {
    if (!_path.default.isAbsolute(os.homedir())) throw new Error(`Cannot launch Firefox with relative home directory. Did you set ${os.platform() === 'win32' ? 'USERPROFILE' : 'HOME'} to a relative path?`);
    return env;
  }
  _attemptToGracefullyCloseBrowser(transport) {
    const message = {
      method: 'Browser.close',
      params: {},
      id: _ffConnection.kBrowserCloseMessageId
    };
    transport.send(message);
  }
  _defaultArgs(options, isPersistent, userDataDir) {
    const {
      args = [],
      headless
    } = options;
    const userDataDirArg = args.find(arg => arg.startsWith('-profile') || arg.startsWith('--profile'));
    if (userDataDirArg) throw new Error('Pass userDataDir parameter to `browserType.launchPersistentContext(userDataDir, ...)` instead of specifying --profile argument');
    if (args.find(arg => arg.startsWith('-juggler'))) throw new Error('Use the port parameter instead of -juggler argument');
    let firefoxUserPrefs = isPersistent ? undefined : options.firefoxUserPrefs;
    if ((0, _utils.getAsBooleanFromENV)('PLAYWRIGHT_DISABLE_FIREFOX_CROSS_PROCESS')) firefoxUserPrefs = {
      ...kDisableFissionFirefoxUserPrefs,
      ...firefoxUserPrefs
    };
    if (Object.keys(kBandaidFirefoxUserPrefs).length) firefoxUserPrefs = {
      ...kBandaidFirefoxUserPrefs,
      ...firefoxUserPrefs
    };
    if (firefoxUserPrefs) {
      const lines = [];
      for (const [name, value] of Object.entries(firefoxUserPrefs)) lines.push(`user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});`);
      _fs.default.writeFileSync(_path.default.join(userDataDir, 'user.js'), lines.join('\n'));
    }
    const firefoxArguments = ['-no-remote'];
    if (headless) {
      firefoxArguments.push('-headless');
    } else {
      firefoxArguments.push('-wait-for-browser');
      firefoxArguments.push('-foreground');
    }
    firefoxArguments.push(`-profile`, userDataDir);
    firefoxArguments.push('-juggler-pipe');
    firefoxArguments.push(...args);
    if (isPersistent) firefoxArguments.push('about:blank');else firefoxArguments.push('-silent');
    return firefoxArguments;
  }
}

// Prefs for quick fixes that didn't make it to the build.
// Should all be moved to `playwright.cfg`.
exports.Firefox = Firefox;
const kBandaidFirefoxUserPrefs = {};
const kDisableFissionFirefoxUserPrefs = {
  'browser.tabs.remote.useCrossOriginEmbedderPolicy': false,
  'browser.tabs.remote.useCrossOriginOpenerPolicy': false,
  'browser.tabs.remote.separatePrivilegedMozillaWebContentProcess': false,
  'fission.autostart': false,
  'browser.tabs.remote.systemTriggeredAboutBlankAnywhere': true
};