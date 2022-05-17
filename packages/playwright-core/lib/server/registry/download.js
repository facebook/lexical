"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.download = download;

var _fs = _interopRequireDefault(require("fs"));

var _utilsBundle = require("../../utilsBundle");

var _netUtils = require("../../common/netUtils");

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
function downloadFile(url, destinationPath, options = {}) {
  const {
    progressCallback,
    log = () => {}
  } = options;
  log(`running download:`);
  log(`-- from url: ${url}`);
  log(`-- to location: ${destinationPath}`);

  let fulfill = ({
    error
  }) => {};

  let downloadedBytes = 0;
  let totalBytes = 0;
  const promise = new Promise(x => {
    fulfill = x;
  });
  (0, _netUtils.httpRequest)({
    url,
    headers: options.userAgent ? {
      'User-Agent': options.userAgent
    } : undefined
  }, response => {
    log(`-- response status code: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      const error = new Error(`Download failed: server returned code ${response.statusCode}. URL: ${url}`); // consume response data to free up memory

      response.resume();
      fulfill({
        error
      });
      return;
    }

    const file = _fs.default.createWriteStream(destinationPath);

    file.on('finish', () => fulfill({
      error: null
    }));
    file.on('error', error => fulfill({
      error
    }));
    response.pipe(file);
    totalBytes = parseInt(response.headers['content-length'] || '0', 10);
    log(`-- total bytes: ${totalBytes}`);
    if (progressCallback) response.on('data', onData);
  }, error => fulfill({
    error
  }));
  return promise;

  function onData(chunk) {
    downloadedBytes += chunk.length;
    progressCallback(downloadedBytes, totalBytes);
  }
}

async function download(url, destination, options = {}) {
  const {
    progressBarName = 'file',
    retryCount = 3,
    log = () => {},
    userAgent
  } = options;

  for (let attempt = 1; attempt <= retryCount; ++attempt) {
    log(`downloading ${progressBarName} - attempt #${attempt}`);
    const {
      error
    } = await downloadFile(url, destination, {
      progressCallback: getDownloadProgress(progressBarName),
      log,
      userAgent
    });

    if (!error) {
      log(`SUCCESS downloading ${progressBarName}`);
      break;
    }

    const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || '';
    log(`attempt #${attempt} - ERROR: ${errorMessage}`);

    if (attempt < retryCount && (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT'))) {
      // Maximum default delay is 3rd retry: 1337.5ms
      const millis = Math.random() * 200 + 250 * Math.pow(1.5, attempt);
      log(`sleeping ${millis}ms before retry...`);
      await new Promise(c => setTimeout(c, millis));
    } else {
      throw error;
    }
  }
}

function getDownloadProgress(progressBarName) {
  if (process.stdout.isTTY) return _getAnimatedDownloadProgress(progressBarName);
  return _getBasicDownloadProgress(progressBarName);
}

function _getAnimatedDownloadProgress(progressBarName) {
  let progressBar;
  let lastDownloadedBytes = 0;
  return (downloadedBytes, totalBytes) => {
    if (!progressBar) {
      progressBar = new _utilsBundle.progress(`Downloading ${progressBarName} - ${toMegabytes(totalBytes)} [:bar] :percent :etas `, {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: totalBytes
      });
    }

    const delta = downloadedBytes - lastDownloadedBytes;
    lastDownloadedBytes = downloadedBytes;
    progressBar.tick(delta);
  };
}

function _getBasicDownloadProgress(progressBarName) {
  // eslint-disable-next-line no-console
  console.log(`Downloading ${progressBarName}...`);
  const totalRows = 10;
  const stepWidth = 8;
  let lastRow = -1;
  return (downloadedBytes, totalBytes) => {
    const percentage = downloadedBytes / totalBytes;
    const row = Math.floor(totalRows * percentage);

    if (row > lastRow) {
      lastRow = row;
      const percentageString = String(percentage * 100 | 0).padStart(3); // eslint-disable-next-line no-console

      console.log(`|${'■'.repeat(row * stepWidth)}${' '.repeat((totalRows - row) * stepWidth)}| ${percentageString}% of ${toMegabytes(totalBytes)}`);
    }
  };
}

function toMegabytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${Math.round(mb * 10) / 10} Mb`;
}