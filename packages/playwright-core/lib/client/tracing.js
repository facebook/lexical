"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tracing = void 0;

var _artifact = require("./artifact");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _yauzl = _interopRequireDefault(require("yauzl"));

var _yazl = _interopRequireDefault(require("yazl"));

var _utils = require("../utils/utils");

var _async = require("../utils/async");

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
class Tracing {
  constructor(channel) {
    this._context = void 0;
    this._sources = new Set();
    this._instrumentationListener = void 0;
    this._context = channel;
    this._instrumentationListener = {
      onApiCallBegin: (apiCall, stackTrace) => {
        for (const frame of (stackTrace === null || stackTrace === void 0 ? void 0 : stackTrace.frames) || []) this._sources.add(frame.file);
      }
    };
  }

  async start(options = {}) {
    if (options.sources) this._context._instrumentation.addListener(this._instrumentationListener);
    await this._context._wrapApiCall(async channel => {
      await channel.tracingStart(options);
      await channel.tracingStartChunk({
        title: options.title
      });
    });
  }

  async startChunk(options = {}) {
    this._sources = new Set();
    await this._context._wrapApiCall(async channel => {
      await channel.tracingStartChunk(options);
    });
  }

  async stopChunk(options = {}) {
    await this._context._wrapApiCall(async channel => {
      await this._doStopChunk(channel, options.path);
    });
  }

  async stop(options = {}) {
    await this._context._wrapApiCall(async channel => {
      await this._doStopChunk(channel, options.path);
      await channel.tracingStop();
    });
  }

  async _doStopChunk(channel, filePath) {
    const sources = this._sources;
    this._sources = new Set();

    this._context._instrumentation.removeListener(this._instrumentationListener);

    const skipCompress = !this._context._connection.isRemote();
    const result = await channel.tracingStopChunk({
      save: !!filePath,
      skipCompress
    });

    if (!filePath) {
      // Not interested in artifacts.
      return;
    } // If we don't have anything locally and we run against remote Playwright, compress on remote side.


    if (!skipCompress && !sources) {
      const artifact = _artifact.Artifact.from(result.artifact);

      await artifact.saveAs(filePath);
      await artifact.delete();
      return;
    } // We either have sources to append or we were running locally, compress on client side


    const promise = new _async.ManualPromise();
    const zipFile = new _yazl.default.ZipFile();
    zipFile.on('error', error => promise.reject(error)); // Add sources.

    if (sources) {
      for (const source of sources) {
        try {
          if (_fs.default.statSync(source).isFile()) zipFile.addFile(source, 'resources/src@' + (0, _utils.calculateSha1)(source) + '.txt');
        } catch (e) {}
      }
    }

    await _fs.default.promises.mkdir(_path.default.dirname(filePath), {
      recursive: true
    });

    if (skipCompress) {
      // Local scenario, compress the entries.
      for (const entry of result.entries) zipFile.addFile(entry.value, entry.name);

      zipFile.end(undefined, () => {
        zipFile.outputStream.pipe(_fs.default.createWriteStream(filePath)).on('close', () => promise.resolve());
      });
      return promise;
    } // Remote scenario, repack.


    const artifact = _artifact.Artifact.from(result.artifact);

    const tmpPath = filePath + '.tmp';
    await artifact.saveAs(tmpPath);
    await artifact.delete();

    _yauzl.default.open(tmpPath, (err, inZipFile) => {
      if (err) {
        promise.reject(err);
        return;
      }

      (0, _utils.assert)(inZipFile);
      let pendingEntries = inZipFile.entryCount;
      inZipFile.on('entry', entry => {
        inZipFile.openReadStream(entry, (err, readStream) => {
          if (err) {
            promise.reject(err);
            return;
          }

          zipFile.addReadStream(readStream, entry.fileName);

          if (--pendingEntries === 0) {
            zipFile.end(undefined, () => {
              zipFile.outputStream.pipe(_fs.default.createWriteStream(filePath)).on('close', () => {
                _fs.default.promises.unlink(tmpPath).then(() => {
                  promise.resolve();
                });
              });
            });
          }
        });
      });
    });

    return promise;
  }

}

exports.Tracing = Tracing;