"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tracing = void 0;
var _artifact = require("./artifact");
var _channelOwner = require("./channelOwner");
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

class Tracing extends _channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
  }
  async start(options = {}) {
    await this._wrapApiCall(async () => {
      await this._channel.tracingStart(options);
      await this._channel.tracingStartChunk({
        title: options.title
      });
    });
  }
  async startChunk(options = {}) {
    await this._channel.tracingStartChunk(options);
  }
  async stopChunk(options = {}) {
    await this._doStopChunk(options.path);
  }
  async stop(options = {}) {
    await this._wrapApiCall(async () => {
      await this._doStopChunk(options.path);
      await this._channel.tracingStop();
    });
  }
  async _doStopChunk(filePath) {
    var _result$sourceEntries;
    const isLocal = !this._connection.isRemote();
    let mode = 'doNotSave';
    if (filePath) {
      if (isLocal) mode = 'compressTraceAndSources';else mode = 'compressTrace';
    }
    const result = await this._channel.tracingStopChunk({
      mode
    });
    if (!filePath) {
      // Not interested in artifacts.
      return;
    }

    // The artifact may be missing if the browser closed while stopping tracing.
    if (!result.artifact) return;

    // Save trace to the final local file.
    const artifact = _artifact.Artifact.from(result.artifact);
    await artifact.saveAs(filePath);
    await artifact.delete();

    // Add local sources to the remote trace if necessary.
    if ((_result$sourceEntries = result.sourceEntries) !== null && _result$sourceEntries !== void 0 && _result$sourceEntries.length) await this._connection.localUtils()._channel.zip({
      zipFile: filePath,
      entries: result.sourceEntries
    });
  }
}
exports.Tracing = Tracing;