"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Worker = void 0;

var _events = require("./events");

var _channelOwner = require("./channelOwner");

var _jsHandle = require("./jsHandle");

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
class Worker extends _channelOwner.ChannelOwner {
  // Set for web workers.
  // Set for service workers.
  static from(worker) {
    return worker._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._page = void 0;
    this._context = void 0;

    this._channel.on('close', () => {
      if (this._page) this._page._workers.delete(this);
      if (this._context) this._context._serviceWorkers.delete(this);
      this.emit(_events.Events.Worker.Close, this);
    });
  }

  url() {
    return this._initializer.url;
  }

  async evaluate(pageFunction, arg) {
    (0, _jsHandle.assertMaxArguments)(arguments.length, 2);
    return this._wrapApiCall(async channel => {
      const result = await channel.evaluateExpression({
        expression: String(pageFunction),
        isFunction: typeof pageFunction === 'function',
        arg: (0, _jsHandle.serializeArgument)(arg)
      });
      return (0, _jsHandle.parseResult)(result.value);
    });
  }

  async evaluateHandle(pageFunction, arg) {
    (0, _jsHandle.assertMaxArguments)(arguments.length, 2);
    return this._wrapApiCall(async channel => {
      const result = await channel.evaluateExpressionHandle({
        expression: String(pageFunction),
        isFunction: typeof pageFunction === 'function',
        arg: (0, _jsHandle.serializeArgument)(arg)
      });
      return _jsHandle.JSHandle.from(result.handle);
    });
  }

}

exports.Worker = Worker;