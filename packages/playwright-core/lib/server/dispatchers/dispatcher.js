"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dispatcherSymbol = exports.RootDispatcher = exports.DispatcherConnection = exports.Dispatcher = void 0;
exports.existingDispatcher = existingDispatcher;
var _events = require("events");
var _serializers = require("../../protocol/serializers");
var _validator = require("../../protocol/validator");
var _utils = require("../../utils");
var _errors = require("../../common/errors");
var _instrumentation = require("../instrumentation");
var _stackTrace = require("../../utils/stackTrace");
var _eventsHelper = require("../..//utils/eventsHelper");
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

const dispatcherSymbol = Symbol('dispatcher');
exports.dispatcherSymbol = dispatcherSymbol;
const metadataValidator = (0, _validator.createMetadataValidator)();
function existingDispatcher(object) {
  return object[dispatcherSymbol];
}
class Dispatcher extends _events.EventEmitter {
  // Parent is always "isScope".

  // Only "isScope" channel owners have registered dispatchers inside.

  constructor(parent, object, type, initializer) {
    super();
    this._connection = void 0;
    this._parent = void 0;
    this._dispatchers = new Map();
    this._disposed = false;
    this._eventListeners = [];
    this._guid = void 0;
    this._type = void 0;
    this._object = void 0;
    this._connection = parent instanceof DispatcherConnection ? parent : parent._connection;
    this._parent = parent instanceof DispatcherConnection ? undefined : parent;
    const guid = object.guid;
    (0, _utils.assert)(!this._connection._dispatchers.has(guid));
    this._connection._dispatchers.set(guid, this);
    if (this._parent) {
      (0, _utils.assert)(!this._parent._dispatchers.has(guid));
      this._parent._dispatchers.set(guid, this);
    }
    this._type = type;
    this._guid = guid;
    this._object = object;
    object[dispatcherSymbol] = this;
    if (this._parent) this._connection.sendCreate(this._parent, type, guid, initializer, this._parent._object);
  }
  parentScope() {
    return this._parent;
  }
  addObjectListener(eventName, handler) {
    this._eventListeners.push(_eventsHelper.eventsHelper.addEventListener(this._object, eventName, handler));
  }
  adopt(child) {
    const oldParent = child._parent;
    oldParent._dispatchers.delete(child._guid);
    this._dispatchers.set(child._guid, child);
    child._parent = this;
    this._connection.sendAdopt(this, child);
  }
  _dispatchEvent(method, params) {
    if (this._disposed) {
      if ((0, _utils.isUnderTest)()) throw new Error(`${this._guid} is sending "${String(method)}" event after being disposed`);
      // Just ignore this event outside of tests.
      return;
    }
    const sdkObject = this._object instanceof _instrumentation.SdkObject ? this._object : undefined;
    this._connection.sendEvent(this, method, params, sdkObject);
  }
  _dispose() {
    this._disposeRecursively();
    this._connection.sendDispose(this);
  }
  _disposeRecursively() {
    (0, _utils.assert)(!this._disposed, `${this._guid} is disposed more than once`);
    this._disposed = true;
    _eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);

    // Clean up from parent and connection.
    if (this._parent) this._parent._dispatchers.delete(this._guid);
    this._connection._dispatchers.delete(this._guid);

    // Dispose all children.
    for (const dispatcher of [...this._dispatchers.values()]) dispatcher._disposeRecursively();
    this._dispatchers.clear();
    delete this._object[dispatcherSymbol];
  }
  _debugScopeState() {
    return {
      _guid: this._guid,
      objects: Array.from(this._dispatchers.values()).map(o => o._debugScopeState())
    };
  }
  async waitForEventInfo() {
    // Instrumentation takes care of this.
  }
}
exports.Dispatcher = Dispatcher;
class RootDispatcher extends Dispatcher {
  constructor(connection, createPlaywright) {
    super(connection, {
      guid: ''
    }, 'Root', {});
    this._initialized = false;
    this.createPlaywright = createPlaywright;
  }
  async initialize(params) {
    (0, _utils.assert)(this.createPlaywright);
    (0, _utils.assert)(!this._initialized);
    this._initialized = true;
    return {
      playwright: await this.createPlaywright(this, params)
    };
  }
}
exports.RootDispatcher = RootDispatcher;
class DispatcherConnection {
  constructor(isLocal) {
    this._dispatchers = new Map();
    this.onmessage = message => {};
    this._waitOperations = new Map();
    this._isLocal = void 0;
    this._isLocal = !!isLocal;
  }
  sendEvent(dispatcher, event, params, sdkObject) {
    const validator = (0, _validator.findValidator)(dispatcher._type, event, 'Event');
    params = validator(params, '', {
      tChannelImpl: this._tChannelImplToWire.bind(this),
      binary: this._isLocal ? 'buffer' : 'toBase64'
    });
    this._sendMessageToClient(dispatcher._guid, dispatcher._type, event, params, sdkObject);
  }
  sendCreate(parent, type, guid, initializer, sdkObject) {
    const validator = (0, _validator.findValidator)(type, '', 'Initializer');
    initializer = validator(initializer, '', {
      tChannelImpl: this._tChannelImplToWire.bind(this),
      binary: this._isLocal ? 'buffer' : 'toBase64'
    });
    this._sendMessageToClient(parent._guid, type, '__create__', {
      type,
      initializer,
      guid
    }, sdkObject);
  }
  sendAdopt(parent, dispatcher) {
    this._sendMessageToClient(parent._guid, dispatcher._type, '__adopt__', {
      guid: dispatcher._guid
    });
  }
  sendDispose(dispatcher) {
    this._sendMessageToClient(dispatcher._guid, dispatcher._type, '__dispose__', {});
  }
  _sendMessageToClient(guid, type, method, params, sdkObject) {
    if (sdkObject) {
      var _sdkObject$attributio, _sdkObject$attributio2, _sdkObject$attributio3, _sdkObject$attributio4, _sdkObject$instrument;
      const eventMetadata = {
        id: `event@${++lastEventId}`,
        objectId: sdkObject === null || sdkObject === void 0 ? void 0 : sdkObject.guid,
        pageId: sdkObject === null || sdkObject === void 0 ? void 0 : (_sdkObject$attributio = sdkObject.attribution) === null || _sdkObject$attributio === void 0 ? void 0 : (_sdkObject$attributio2 = _sdkObject$attributio.page) === null || _sdkObject$attributio2 === void 0 ? void 0 : _sdkObject$attributio2.guid,
        frameId: sdkObject === null || sdkObject === void 0 ? void 0 : (_sdkObject$attributio3 = sdkObject.attribution) === null || _sdkObject$attributio3 === void 0 ? void 0 : (_sdkObject$attributio4 = _sdkObject$attributio3.frame) === null || _sdkObject$attributio4 === void 0 ? void 0 : _sdkObject$attributio4.guid,
        wallTime: Date.now(),
        startTime: (0, _utils.monotonicTime)(),
        endTime: 0,
        type,
        method,
        params: params || {},
        log: [],
        snapshots: []
      };
      (_sdkObject$instrument = sdkObject.instrumentation) === null || _sdkObject$instrument === void 0 ? void 0 : _sdkObject$instrument.onEvent(sdkObject, eventMetadata);
    }
    this.onmessage({
      guid,
      method,
      params
    });
  }
  _tChannelImplFromWire(names, arg, path, context) {
    if (arg && typeof arg === 'object' && typeof arg.guid === 'string') {
      const guid = arg.guid;
      const dispatcher = this._dispatchers.get(guid);
      if (!dispatcher) throw new _validator.ValidationError(`${path}: no object with guid ${guid}`);
      if (names !== '*' && !names.includes(dispatcher._type)) throw new _validator.ValidationError(`${path}: object with guid ${guid} has type ${dispatcher._type}, expected ${names.toString()}`);
      return dispatcher;
    }
    throw new _validator.ValidationError(`${path}: expected guid for ${names.toString()}`);
  }
  _tChannelImplToWire(names, arg, path, context) {
    if (arg instanceof Dispatcher) {
      if (names !== '*' && !names.includes(arg._type)) throw new _validator.ValidationError(`${path}: dispatcher with guid ${arg._guid} has type ${arg._type}, expected ${names.toString()}`);
      return {
        guid: arg._guid
      };
    }
    throw new _validator.ValidationError(`${path}: expected dispatcher ${names.toString()}`);
  }
  async dispatch(message) {
    var _sdkObject$attributio5, _sdkObject$attributio6, _sdkObject$attributio7, _sdkObject$attributio8, _params$info;
    const {
      id,
      guid,
      method,
      params,
      metadata
    } = message;
    const dispatcher = this._dispatchers.get(guid);
    if (!dispatcher) {
      this.onmessage({
        id,
        error: (0, _serializers.serializeError)(new Error(_errors.kBrowserOrContextClosedError))
      });
      return;
    }
    let validParams;
    let validMetadata;
    try {
      const validator = (0, _validator.findValidator)(dispatcher._type, method, 'Params');
      validParams = validator(params, '', {
        tChannelImpl: this._tChannelImplFromWire.bind(this),
        binary: this._isLocal ? 'buffer' : 'fromBase64'
      });
      validMetadata = metadataValidator(metadata, '', {
        tChannelImpl: this._tChannelImplFromWire.bind(this),
        binary: this._isLocal ? 'buffer' : 'fromBase64'
      });
      if (typeof dispatcher[method] !== 'function') throw new Error(`Mismatching dispatcher: "${dispatcher._type}" does not implement "${method}"`);
    } catch (e) {
      this.onmessage({
        id,
        error: (0, _serializers.serializeError)(e)
      });
      return;
    }
    const sdkObject = dispatcher._object instanceof _instrumentation.SdkObject ? dispatcher._object : undefined;
    const callMetadata = {
      id: `call@${id}`,
      stack: validMetadata.stack,
      apiName: validMetadata.apiName,
      internal: validMetadata.internal,
      objectId: sdkObject === null || sdkObject === void 0 ? void 0 : sdkObject.guid,
      pageId: sdkObject === null || sdkObject === void 0 ? void 0 : (_sdkObject$attributio5 = sdkObject.attribution) === null || _sdkObject$attributio5 === void 0 ? void 0 : (_sdkObject$attributio6 = _sdkObject$attributio5.page) === null || _sdkObject$attributio6 === void 0 ? void 0 : _sdkObject$attributio6.guid,
      frameId: sdkObject === null || sdkObject === void 0 ? void 0 : (_sdkObject$attributio7 = sdkObject.attribution) === null || _sdkObject$attributio7 === void 0 ? void 0 : (_sdkObject$attributio8 = _sdkObject$attributio7.frame) === null || _sdkObject$attributio8 === void 0 ? void 0 : _sdkObject$attributio8.guid,
      wallTime: Date.now(),
      startTime: (0, _utils.monotonicTime)(),
      endTime: 0,
      type: dispatcher._type,
      method,
      params: params || {},
      log: [],
      snapshots: []
    };
    if (sdkObject && params !== null && params !== void 0 && (_params$info = params.info) !== null && _params$info !== void 0 && _params$info.waitId) {
      // Process logs for waitForNavigation/waitForLoadState/etc.
      const info = params.info;
      switch (info.phase) {
        case 'before':
          {
            this._waitOperations.set(info.waitId, callMetadata);
            await sdkObject.instrumentation.onBeforeCall(sdkObject, callMetadata);
            this.onmessage({
              id
            });
            return;
          }
        case 'log':
          {
            const originalMetadata = this._waitOperations.get(info.waitId);
            originalMetadata.log.push(info.message);
            sdkObject.instrumentation.onCallLog(sdkObject, originalMetadata, 'api', info.message);
            this.onmessage({
              id
            });
            return;
          }
        case 'after':
          {
            const originalMetadata = this._waitOperations.get(info.waitId);
            originalMetadata.endTime = (0, _utils.monotonicTime)();
            originalMetadata.error = info.error ? {
              error: {
                name: 'Error',
                message: info.error
              }
            } : undefined;
            this._waitOperations.delete(info.waitId);
            await sdkObject.instrumentation.onAfterCall(sdkObject, originalMetadata);
            this.onmessage({
              id
            });
            return;
          }
      }
    }
    let error;
    await (sdkObject === null || sdkObject === void 0 ? void 0 : sdkObject.instrumentation.onBeforeCall(sdkObject, callMetadata));
    try {
      const result = await dispatcher[method](validParams, callMetadata);
      const validator = (0, _validator.findValidator)(dispatcher._type, method, 'Result');
      callMetadata.result = validator(result, '', {
        tChannelImpl: this._tChannelImplToWire.bind(this),
        binary: this._isLocal ? 'buffer' : 'toBase64'
      });
    } catch (e) {
      // Dispatching error
      // We want original, unmodified error in metadata.
      callMetadata.error = (0, _serializers.serializeError)(e);
      if (callMetadata.log.length) (0, _stackTrace.rewriteErrorMessage)(e, e.message + formatLogRecording(callMetadata.log));
      error = (0, _serializers.serializeError)(e);
    } finally {
      callMetadata.endTime = (0, _utils.monotonicTime)();
      await (sdkObject === null || sdkObject === void 0 ? void 0 : sdkObject.instrumentation.onAfterCall(sdkObject, callMetadata));
    }
    const response = {
      id
    };
    if (callMetadata.result) response.result = callMetadata.result;
    if (error) response.error = error;
    this.onmessage(response);
  }
}
exports.DispatcherConnection = DispatcherConnection;
function formatLogRecording(log) {
  if (!log.length) return '';
  const header = ` logs `;
  const headerLength = 60;
  const leftLength = (headerLength - header.length) / 2;
  const rightLength = headerLength - header.length - leftLength;
  return `\n${'='.repeat(leftLength)}${header}${'='.repeat(rightLength)}\n${log.join('\n')}\n${'='.repeat(headerLength)}`;
}
let lastEventId = 0;