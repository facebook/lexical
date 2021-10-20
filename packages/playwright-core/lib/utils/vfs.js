"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ZipFileSystem = exports.RealFileSystem = void 0;

var _path = _interopRequireDefault(require("path"));

var _fs = _interopRequireDefault(require("fs"));

var _yauzl = _interopRequireDefault(require("yauzl"));

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
class BaseFileSystem {
  async read(entryPath) {
    const readStream = await this.readStream(entryPath);
    const buffers = [];
    return new Promise(f => {
      readStream.on('data', d => buffers.push(d));
      readStream.on('end', () => f(Buffer.concat(buffers)));
    });
  }

  close() {}

}

class RealFileSystem extends BaseFileSystem {
  constructor(folder) {
    super();
    this._folder = void 0;
    this._folder = folder;
  }

  async entries() {
    const result = [];

    const visit = dir => {
      for (const name of _fs.default.readdirSync(dir)) {
        const fqn = _path.default.join(dir, name);

        if (_fs.default.statSync(fqn).isDirectory()) visit(fqn);
        if (_fs.default.statSync(fqn).isFile()) result.push(fqn);
      }
    };

    visit(this._folder);
    return result;
  }

  async readStream(entry) {
    return _fs.default.createReadStream(_path.default.join(this._folder, ...entry.split('/')));
  }

}

exports.RealFileSystem = RealFileSystem;

class ZipFileSystem extends BaseFileSystem {
  constructor(fileName) {
    super();
    this._fileName = void 0;
    this._zipFile = void 0;
    this._entries = new Map();
    this._openedPromise = void 0;
    this._fileName = fileName;
    this._openedPromise = this.open();
  }

  async open() {
    await new Promise((fulfill, reject) => {
      _yauzl.default.open(this._fileName, {
        autoClose: false
      }, (e, z) => {
        if (e) {
          reject(e);
          return;
        }

        this._zipFile = z;

        this._zipFile.on('entry', entry => {
          this._entries.set(entry.fileName, entry);
        });

        this._zipFile.on('end', fulfill);
      });
    });
  }

  async entries() {
    await this._openedPromise;
    return [...this._entries.keys()];
  }

  async readStream(entryPath) {
    await this._openedPromise;

    const entry = this._entries.get(entryPath);

    return new Promise((f, r) => {
      this._zipFile.openReadStream(entry, (error, readStream) => {
        if (error || !readStream) {
          r(error || 'Entry not found');
          return;
        }

        f(readStream);
      });
    });
  }

  close() {
    var _this$_zipFile;

    (_this$_zipFile = this._zipFile) === null || _this$_zipFile === void 0 ? void 0 : _this$_zipFile.close();
  }

}

exports.ZipFileSystem = ZipFileSystem;