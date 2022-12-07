"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Artifact = void 0;
var fs = _interopRequireWildcard(require("fs"));
var _stream = require("./stream");
var _fileUtils = require("../utils/fileUtils");
var _channelOwner = require("./channelOwner");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
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

class Artifact extends _channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }
  async pathAfterFinished() {
    if (this._connection.isRemote()) throw new Error(`Path is not available when connecting remotely. Use saveAs() to save a local copy.`);
    return (await this._channel.pathAfterFinished()).value || null;
  }
  async saveAs(path) {
    if (!this._connection.isRemote()) {
      await this._channel.saveAs({
        path
      });
      return;
    }
    const result = await this._channel.saveAsStream();
    const stream = _stream.Stream.from(result.stream);
    await (0, _fileUtils.mkdirIfNeeded)(path);
    await new Promise((resolve, reject) => {
      stream.stream().pipe(fs.createWriteStream(path)).on('finish', resolve).on('error', reject);
    });
  }
  async failure() {
    return (await this._channel.failure()).error || null;
  }
  async createReadStream() {
    const result = await this._channel.stream();
    if (!result.stream) return null;
    const stream = _stream.Stream.from(result.stream);
    return stream.stream();
  }
  async cancel() {
    return this._channel.cancel();
  }
  async delete() {
    return this._channel.delete();
  }
}
exports.Artifact = Artifact;