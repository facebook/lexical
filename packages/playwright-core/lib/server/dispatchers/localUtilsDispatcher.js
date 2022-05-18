"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LocalUtilsDispatcher = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _manualPromise = require("../../utils/manualPromise");

var _utils = require("../../utils");

var _dispatcher = require("./dispatcher");

var _zipBundle = require("../../zipBundle");

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
class LocalUtilsDispatcher extends _dispatcher.Dispatcher {
  constructor(scope) {
    super(scope, {
      guid: 'localUtils@' + (0, _utils.createGuid)()
    }, 'LocalUtils', {});
    this._type_LocalUtils = void 0;
    this._type_LocalUtils = true;
  }

  async zip(params, metadata) {
    const promise = new _manualPromise.ManualPromise();
    const zipFile = new _zipBundle.yazl.ZipFile();
    zipFile.on('error', error => promise.reject(error));

    for (const entry of params.entries) {
      try {
        if (_fs.default.statSync(entry.value).isFile()) zipFile.addFile(entry.value, entry.name);
      } catch (e) {}
    }

    if (!_fs.default.existsSync(params.zipFile)) {
      // New file, just compress the entries.
      await _fs.default.promises.mkdir(_path.default.dirname(params.zipFile), {
        recursive: true
      });
      zipFile.end(undefined, () => {
        zipFile.outputStream.pipe(_fs.default.createWriteStream(params.zipFile)).on('close', () => promise.resolve());
      });
      return promise;
    } // File already exists. Repack and add new entries.


    const tempFile = params.zipFile + '.tmp';
    await _fs.default.promises.rename(params.zipFile, tempFile);

    _zipBundle.yauzl.open(tempFile, (err, inZipFile) => {
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
              zipFile.outputStream.pipe(_fs.default.createWriteStream(params.zipFile)).on('close', () => {
                _fs.default.promises.unlink(tempFile).then(() => {
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

exports.LocalUtilsDispatcher = LocalUtilsDispatcher;