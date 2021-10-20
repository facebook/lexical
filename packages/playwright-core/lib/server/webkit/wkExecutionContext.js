"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WKExecutionContext = void 0;

var js = _interopRequireWildcard(require("../javascript"));

var _utilityScriptSerializers = require("../common/utilityScriptSerializers");

var _protocolError = require("../common/protocolError");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Copyright 2017 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
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
class WKExecutionContext {
  constructor(session, contextId) {
    this._session = void 0;
    this._contextId = void 0;

    this._contextDestroyedCallback = () => {};

    this._executionContextDestroyedPromise = void 0;
    this._session = session;
    this._contextId = contextId;
    this._executionContextDestroyedPromise = new Promise((resolve, reject) => {
      this._contextDestroyedCallback = resolve;
    });
  }

  _dispose() {
    this._contextDestroyedCallback();
  }

  async rawEvaluateJSON(expression) {
    try {
      const response = await this._session.send('Runtime.evaluate', {
        expression,
        contextId: this._contextId,
        returnByValue: true
      });
      if (response.wasThrown) throw new js.JavaScriptErrorInEvaluate(response.result.description);
      return response.result.value;
    } catch (error) {
      throw rewriteError(error);
    }
  }

  async rawEvaluateHandle(expression) {
    try {
      const response = await this._session.send('Runtime.evaluate', {
        expression,
        contextId: this._contextId,
        returnByValue: false
      });
      if (response.wasThrown) throw new js.JavaScriptErrorInEvaluate(response.result.description);
      return response.result.objectId;
    } catch (error) {
      throw rewriteError(error);
    }
  }

  rawCallFunctionNoReply(func, ...args) {
    this._session.send('Runtime.callFunctionOn', {
      functionDeclaration: func.toString(),
      objectId: args.find(a => a instanceof js.JSHandle)._objectId,
      arguments: args.map(a => a instanceof js.JSHandle ? {
        objectId: a._objectId
      } : {
        value: a
      }),
      returnByValue: true,
      emulateUserGesture: true
    }).catch(() => {});
  }

  async evaluateWithArguments(expression, returnByValue, utilityScript, values, objectIds) {
    try {
      const response = await Promise.race([this._executionContextDestroyedPromise.then(() => {
        throw new Error(contextDestroyedError);
      }), this._session.send('Runtime.callFunctionOn', {
        functionDeclaration: expression,
        objectId: utilityScript._objectId,
        arguments: [{
          objectId: utilityScript._objectId
        }, ...values.map(value => ({
          value
        })), ...objectIds.map(objectId => ({
          objectId
        }))],
        returnByValue,
        emulateUserGesture: true,
        awaitPromise: true
      })]);
      if (response.wasThrown) throw new js.JavaScriptErrorInEvaluate(response.result.description);
      if (returnByValue) return (0, _utilityScriptSerializers.parseEvaluationResultValue)(response.result.value);
      return utilityScript._context.createHandle(response.result);
    } catch (error) {
      throw rewriteError(error);
    }
  }

  async getProperties(context, objectId) {
    const response = await this._session.send('Runtime.getProperties', {
      objectId,
      ownProperties: true
    });
    const result = new Map();

    for (const property of response.properties) {
      if (!property.enumerable || !property.value) continue;
      result.set(property.name, context.createHandle(property.value));
    }

    return result;
  }

  createHandle(context, remoteObject) {
    const isPromise = remoteObject.className === 'Promise';
    return new js.JSHandle(context, isPromise ? 'promise' : remoteObject.subtype || remoteObject.type, renderPreview(remoteObject), remoteObject.objectId, potentiallyUnserializableValue(remoteObject));
  }

  async releaseHandle(objectId) {
    await this._session.send('Runtime.releaseObject', {
      objectId
    });
  }

}

exports.WKExecutionContext = WKExecutionContext;
const contextDestroyedError = 'Execution context was destroyed.';

function potentiallyUnserializableValue(remoteObject) {
  const value = remoteObject.value;
  const isUnserializable = remoteObject.type === 'number' && ['NaN', '-Infinity', 'Infinity', '-0'].includes(remoteObject.description);
  return isUnserializable ? js.parseUnserializableValue(remoteObject.description) : value;
}

function rewriteError(error) {
  if (!js.isJavaScriptErrorInEvaluate(error) && !(0, _protocolError.isSessionClosedError)(error)) return new Error('Execution context was destroyed, most likely because of a navigation.');
  return error;
}

function renderPreview(object) {
  if (object.type === 'undefined') return 'undefined';
  if ('value' in object) return String(object.value);

  if (object.description === 'Object' && object.preview) {
    const tokens = [];

    for (const {
      name,
      value
    } of object.preview.properties) tokens.push(`${name}: ${value}`);

    return `{${tokens.join(', ')}}`;
  }

  if (object.subtype === 'array' && object.preview) {
    const result = [];

    for (const {
      name,
      value
    } of object.preview.properties) result[+name] = value;

    return '[' + String(result) + ']';
  }

  return object.description;
}