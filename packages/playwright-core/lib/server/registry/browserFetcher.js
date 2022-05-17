"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.downloadBrowserWithProgressBar = downloadBrowserWithProgressBar;
exports.logPolitely = logPolitely;

var _fs = _interopRequireDefault(require("fs"));

var _os = _interopRequireDefault(require("os"));

var _path = _interopRequireDefault(require("path"));

var _userAgent = require("../../common/userAgent");

var _fileUtils = require("../../utils/fileUtils");

var _debugLogger = require("../../common/debugLogger");

var _download = require("./download");

var _zipBundle = require("../../zipBundle");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
async function downloadBrowserWithProgressBar(title, browserDirectory, executablePath, downloadURL, downloadFileName) {
  if (await (0, _fileUtils.existsAsync)(browserDirectory)) {
    // Already downloaded.
    _debugLogger.debugLogger.log('install', `${title} is already downloaded.`);

    return false;
  }

  const url = downloadURL;

  const zipPath = _path.default.join(_os.default.tmpdir(), downloadFileName);

  try {
    await (0, _download.download)(url, zipPath, {
      progressBarName: title,
      log: _debugLogger.debugLogger.log.bind(_debugLogger.debugLogger, 'install'),
      userAgent: (0, _userAgent.getUserAgent)()
    });

    _debugLogger.debugLogger.log('install', `extracting archive`);

    _debugLogger.debugLogger.log('install', `-- zip: ${zipPath}`);

    _debugLogger.debugLogger.log('install', `-- location: ${browserDirectory}`);

    await (0, _zipBundle.extract)(zipPath, {
      dir: browserDirectory
    });

    _debugLogger.debugLogger.log('install', `fixing permissions at ${executablePath}`);

    await _fs.default.promises.chmod(executablePath, 0o755);
  } catch (e) {
    _debugLogger.debugLogger.log('install', `FAILED installation ${title} with error: ${e}`);

    process.exitCode = 1;
    throw e;
  } finally {
    if (await (0, _fileUtils.existsAsync)(zipPath)) await _fs.default.promises.unlink(zipPath);
  }

  logPolitely(`${title} downloaded to ${browserDirectory}`);
  return true;
}

function logPolitely(toBeLogged) {
  const logLevel = process.env.npm_config_loglevel;
  const logLevelDisplay = ['silent', 'error', 'warn'].indexOf(logLevel || '') > -1;
  if (!logLevelDisplay) console.log(toBeLogged); // eslint-disable-line no-console
}