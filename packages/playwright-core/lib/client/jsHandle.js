"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.serializeArgument = serializeArgument;
exports.parseResult = parseResult;
exports.assertMaxArguments = assertMaxArguments;
exports.JSHandle = void 0;

var _channelOwner = require("./channelOwner");

var _serializers = require("../protocol/serializers");

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
class JSHandle extends _channelOwner.ChannelOwner {
  static from(handle) {
    return handle._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._preview = void 0;
    this._preview = this._initializer.preview;

    this._channel.on('previewUpdated', ({
      preview
    }) => this._preview = preview);
  }

  async evaluate(pageFunction, arg) {
    return this._wrapApiCall(async channel => {
      const result = await channel.evaluateExpression({
        expression: String(pageFunction),
        isFunction: typeof pageFunction === 'function',
        arg: serializeArgument(arg)
      });
      return parseResult(result.value);
    });
  }

  async evaluateHandle(pageFunction, arg) {
    return this._wrapApiCall(async channel => {
      const result = await channel.evaluateExpressionHandle({
        expression: String(pageFunction),
        isFunction: typeof pageFunction === 'function',
        arg: serializeArgument(arg)
      });
      return JSHandle.from(result.handle);
    });
  }

  async getProperty(propertyName) {
    return this._wrapApiCall(async channel => {
      const result = await channel.getProperty({
        name: propertyName
      });
      return JSHandle.from(result.handle);
    });
  }

  async getProperties() {
    return this._wrapApiCall(async channel => {
      const map = new Map();

      for (const {
        name,
        value
      } of (await channel.getPropertyList()).properties) map.set(name, JSHandle.from(value));

      return map;
    });
  }

  async jsonValue() {
    return this._wrapApiCall(async channel => {
      return parseResult((await channel.jsonValue()).value);
    });
  }

  asElement() {
    return null;
  }

  async dispose() {
    return this._wrapApiCall(async channel => {
      return await channel.dispose();
    });
  }

  toString() {
    return this._preview;
  }

} // This function takes care of converting all JSHandles to their channels,
// so that generic channel serializer converts them to guids.


exports.JSHandle = JSHandle;

function serializeArgument(arg) {
  const handles = [];

  const pushHandle = channel => {
    handles.push(channel);
    return handles.length - 1;
  };

  const value = (0, _serializers.serializeValue)(arg, value => {
    if (value instanceof JSHandle) return {
      h: pushHandle(value._channel)
    };
    return {
      fallThrough: value
    };
  }, new Set());
  return {
    value,
    handles
  };
}

function parseResult(value) {
  return (0, _serializers.parseSerializedValue)(value, undefined);
}

function assertMaxArguments(count, max) {
  if (count > max) throw new Error('Too many arguments. If you need to pass more than 1 argument to the function wrap them in an object.');
}