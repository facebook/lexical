'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.Tracing = void 0;

var _artifact = require('./artifact');

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
    this._context = channel;
  }

  async start(options = {}) {
    await this._context._wrapApiCall(async (channel) => {
      await channel.tracingStart(options);
      await channel.tracingStartChunk();
    });
  }

  async startChunk() {
    await this._context._wrapApiCall(async (channel) => {
      await channel.tracingStartChunk();
    });
  }

  async stopChunk(options) {
    await this._context._wrapApiCall(async (channel) => {
      await this._doStopChunk(channel, options.path);
    });
  }

  async stop(options = {}) {
    await this._context._wrapApiCall(async (channel) => {
      await this._doStopChunk(channel, options.path);
      await channel.tracingStop();
    });
  }

  async _doStopChunk(channel, path) {
    const result = await channel.tracingStopChunk({
      save: !!path,
    });
    if (!result.artifact) return;

    const artifact = _artifact.Artifact.from(result.artifact);

    await artifact.saveAs(path);
    await artifact.delete();
  }
}

exports.Tracing = Tracing;
