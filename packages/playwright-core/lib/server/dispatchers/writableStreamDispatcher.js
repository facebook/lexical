"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WritableStreamDispatcher = void 0;
var _dispatcher = require("./dispatcher");
var _utils = require("../../utils");
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

class WritableStreamDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, stream) {
    super(scope, {
      guid: 'writableStream@' + (0, _utils.createGuid)(),
      stream
    }, 'WritableStream', {});
    this._type_WritableStream = true;
  }
  async write(params) {
    const stream = this._object.stream;
    await new Promise((fulfill, reject) => {
      stream.write(params.binary, error => {
        if (error) reject(error);else fulfill();
      });
    });
  }
  async close() {
    const stream = this._object.stream;
    await new Promise(fulfill => stream.end(fulfill));
  }
  path() {
    return this._object.stream.path;
  }
}
exports.WritableStreamDispatcher = WritableStreamDispatcher;