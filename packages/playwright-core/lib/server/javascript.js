"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JavaScriptErrorInEvaluate = exports.JSHandle = exports.ExecutionContext = void 0;
exports.evaluate = evaluate;
exports.evaluateExpression = evaluateExpression;
exports.evaluateExpressionAndWaitForSignals = evaluateExpressionAndWaitForSignals;
exports.isJavaScriptErrorInEvaluate = isJavaScriptErrorInEvaluate;
exports.normalizeEvaluationExpression = normalizeEvaluationExpression;
exports.parseUnserializableValue = parseUnserializableValue;

var utilityScriptSource = _interopRequireWildcard(require("../generated/utilityScriptSource"));

var _utilityScriptSerializers = require("./isomorphic/utilityScriptSerializers");

var _instrumentation = require("./instrumentation");

var _manualPromise = require("../utils/manualPromise");

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
class ExecutionContext extends _instrumentation.SdkObject {
  constructor(parent, delegate) {
    super(parent, 'execution-context');
    this._delegate = void 0;
    this._utilityScriptPromise = void 0;
    this._destroyedPromise = new _manualPromise.ManualPromise();
    this._delegate = delegate;
  }

  contextDestroyed(error) {
    this._destroyedPromise.resolve(error);
  }

  _raceAgainstContextDestroyed(promise) {
    return Promise.race([this._destroyedPromise.then(e => {
      throw e;
    }), promise]);
  }

  rawEvaluateJSON(expression) {
    return this._raceAgainstContextDestroyed(this._delegate.rawEvaluateJSON(expression));
  }

  rawEvaluateHandle(expression) {
    return this._raceAgainstContextDestroyed(this._delegate.rawEvaluateHandle(expression));
  }

  rawCallFunctionNoReply(func, ...args) {
    this._delegate.rawCallFunctionNoReply(func, ...args);
  }

  evaluateWithArguments(expression, returnByValue, utilityScript, values, objectIds) {
    return this._raceAgainstContextDestroyed(this._delegate.evaluateWithArguments(expression, returnByValue, utilityScript, values, objectIds));
  }

  getProperties(context, objectId) {
    return this._raceAgainstContextDestroyed(this._delegate.getProperties(context, objectId));
  }

  createHandle(remoteObject) {
    return this._delegate.createHandle(this, remoteObject);
  }

  releaseHandle(objectId) {
    return this._delegate.releaseHandle(objectId);
  }

  async waitForSignalsCreatedBy(action) {
    return action();
  }

  adoptIfNeeded(handle) {
    return null;
  }

  utilityScript() {
    if (!this._utilityScriptPromise) {
      const source = `
      (() => {
        const module = {};
        ${utilityScriptSource.source}
        return new module.exports();
      })();`;
      this._utilityScriptPromise = this._raceAgainstContextDestroyed(this._delegate.rawEvaluateHandle(source).then(objectId => new JSHandle(this, 'object', undefined, objectId)));
    }

    return this._utilityScriptPromise;
  }

  async doSlowMo() {// overridden in FrameExecutionContext
  }

}

exports.ExecutionContext = ExecutionContext;

class JSHandle extends _instrumentation.SdkObject {
  constructor(context, type, preview, objectId, value) {
    super(context, 'handle');
    this._context = void 0;
    this._disposed = false;
    this._objectId = void 0;
    this._value = void 0;
    this._objectType = void 0;
    this._preview = void 0;
    this._previewCallback = void 0;
    this._context = context;
    this._objectId = objectId;
    this._value = value;
    this._objectType = type;
    this._preview = this._objectId ? preview || `JSHandle@${this._objectType}` : String(value);
  }

  callFunctionNoReply(func, arg) {
    this._context.rawCallFunctionNoReply(func, this, arg);
  }

  async evaluate(pageFunction, arg) {
    return evaluate(this._context, true
    /* returnByValue */
    , pageFunction, this, arg);
  }

  async evaluateHandle(pageFunction, arg) {
    return evaluate(this._context, false
    /* returnByValue */
    , pageFunction, this, arg);
  }

  async evaluateExpressionAndWaitForSignals(expression, isFunction, returnByValue, arg) {
    const value = await evaluateExpressionAndWaitForSignals(this._context, returnByValue, expression, isFunction, this, arg);
    await this._context.doSlowMo();
    return value;
  }

  async getProperty(propertyName) {
    const objectHandle = await this.evaluateHandle((object, propertyName) => {
      const result = {
        __proto__: null
      };
      result[propertyName] = object[propertyName];
      return result;
    }, propertyName);
    const properties = await objectHandle.getProperties();
    const result = properties.get(propertyName);
    objectHandle.dispose();
    return result;
  }

  async getProperties() {
    if (!this._objectId) return new Map();
    return this._context.getProperties(this._context, this._objectId);
  }

  rawValue() {
    return this._value;
  }

  async jsonValue() {
    if (!this._objectId) return this._value;
    const utilityScript = await this._context.utilityScript();
    const script = `(utilityScript, ...args) => utilityScript.jsonValue(...args)`;
    return this._context.evaluateWithArguments(script, true, utilityScript, [true], [this._objectId]);
  }

  asElement() {
    return null;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (this._objectId) this._context.releaseHandle(this._objectId).catch(e => {});
  }

  toString() {
    return this._preview;
  }

  _setPreviewCallback(callback) {
    this._previewCallback = callback;
  }

  preview() {
    return this._preview;
  }

  _setPreview(preview) {
    this._preview = preview;
    if (this._previewCallback) this._previewCallback(preview);
  }

}

exports.JSHandle = JSHandle;

async function evaluate(context, returnByValue, pageFunction, ...args) {
  return evaluateExpression(context, returnByValue, String(pageFunction), typeof pageFunction === 'function', ...args);
}

async function evaluateExpression(context, returnByValue, expression, isFunction, ...args) {
  const utilityScript = await context.utilityScript();
  expression = normalizeEvaluationExpression(expression, isFunction);
  const handles = [];
  const toDispose = [];

  const pushHandle = handle => {
    handles.push(handle);
    return handles.length - 1;
  };

  args = args.map(arg => (0, _utilityScriptSerializers.serializeAsCallArgument)(arg, handle => {
    if (handle instanceof JSHandle) {
      if (!handle._objectId) return {
        fallThrough: handle._value
      };
      if (handle._disposed) throw new Error('JSHandle is disposed!');
      const adopted = context.adoptIfNeeded(handle);
      if (adopted === null) return {
        h: pushHandle(Promise.resolve(handle))
      };
      toDispose.push(adopted);
      return {
        h: pushHandle(adopted)
      };
    }

    return {
      fallThrough: handle
    };
  }));
  const utilityScriptObjectIds = [];

  for (const handle of await Promise.all(handles)) {
    if (handle._context !== context) throw new Error('JSHandles can be evaluated only in the context they were created!');
    utilityScriptObjectIds.push(handle._objectId);
  } // See UtilityScript for arguments.


  const utilityScriptValues = [isFunction, returnByValue, expression, args.length, ...args];
  const script = `(utilityScript, ...args) => utilityScript.evaluate(...args)`;

  try {
    return await context.evaluateWithArguments(script, returnByValue, utilityScript, utilityScriptValues, utilityScriptObjectIds);
  } finally {
    toDispose.map(handlePromise => handlePromise.then(handle => handle.dispose()));
  }
}

async function evaluateExpressionAndWaitForSignals(context, returnByValue, expression, isFunction, ...args) {
  return await context.waitForSignalsCreatedBy(() => evaluateExpression(context, returnByValue, expression, isFunction, ...args));
}

function parseUnserializableValue(unserializableValue) {
  if (unserializableValue === 'NaN') return NaN;
  if (unserializableValue === 'Infinity') return Infinity;
  if (unserializableValue === '-Infinity') return -Infinity;
  if (unserializableValue === '-0') return -0;
}

function normalizeEvaluationExpression(expression, isFunction) {
  expression = expression.trim();

  if (isFunction) {
    try {
      new Function('(' + expression + ')');
    } catch (e1) {
      // This means we might have a function shorthand. Try another
      // time prefixing 'function '.
      if (expression.startsWith('async ')) expression = 'async function ' + expression.substring('async '.length);else expression = 'function ' + expression;

      try {
        new Function('(' + expression + ')');
      } catch (e2) {
        // We tried hard to serialize, but there's a weird beast here.
        throw new Error('Passed function is not well-serializable!');
      }
    }
  }

  if (/^(async)?\s*function(\s|\()/.test(expression)) expression = '(' + expression + ')';
  return expression;
} // Error inside the expression evaluation as opposed to a protocol error.


class JavaScriptErrorInEvaluate extends Error {}

exports.JavaScriptErrorInEvaluate = JavaScriptErrorInEvaluate;

function isJavaScriptErrorInEvaluate(error) {
  return error instanceof JavaScriptErrorInEvaluate;
}