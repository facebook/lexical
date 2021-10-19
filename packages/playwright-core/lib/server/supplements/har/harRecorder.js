"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HarRecorder = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _artifact = require("../../artifact");

var _harTracer = require("./harTracer");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) Microsoft Corporation.
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
class HarRecorder {
  constructor(context, options) {
    this._artifact = void 0;
    this._isFlushed = false;
    this._options = void 0;
    this._tracer = void 0;
    this._entries = [];
    this._artifact = new _artifact.Artifact(context, options.path);
    this._options = options;
    this._tracer = new _harTracer.HarTracer(context, this, {
      content: options.omitContent ? 'omit' : 'embedded',
      waitForContentOnStop: true,
      skipScripts: false
    });

    this._tracer.start();
  }

  onEntryStarted(entry) {
    this._entries.push(entry);
  }

  onEntryFinished(entry) {}

  onContentBlob(sha1, buffer) {}

  async flush() {
    if (this._isFlushed) return;
    this._isFlushed = true;
    await this._tracer.flush();

    const log = this._tracer.stop();

    log.entries = this._entries;
    await _fs.default.promises.writeFile(this._options.path, JSON.stringify({
      log
    }, undefined, 2));
  }

  async export() {
    await this.flush();

    this._artifact.reportFinished();

    return this._artifact;
  }

}

exports.HarRecorder = HarRecorder;