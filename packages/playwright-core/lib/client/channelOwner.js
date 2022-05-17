"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ChannelOwner = void 0;
exports.renderCallWithParams = renderCallWithParams;

var _events = require("events");

var _validator = require("../protocol/validator");

var _debugLogger = require("../common/debugLogger");

var _stackTrace = require("../utils/stackTrace");

var _utils = require("../utils");

var _zones = require("../utils/zones");

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
class ChannelOwner extends _events.EventEmitter {
  constructor(parent, type, guid, initializer, instrumentation) {
    var _this$_parent;

    super();
    this._connection = void 0;
    this._parent = void 0;
    this._objects = new Map();
    this._type = void 0;
    this._guid = void 0;
    this._channel = void 0;
    this._initializer = void 0;
    this._logger = void 0;
    this._instrumentation = void 0;
    this.setMaxListeners(0);
    this._connection = parent instanceof ChannelOwner ? parent._connection : parent;
    this._type = type;
    this._guid = guid;
    this._parent = parent instanceof ChannelOwner ? parent : undefined;
    this._instrumentation = instrumentation || ((_this$_parent = this._parent) === null || _this$_parent === void 0 ? void 0 : _this$_parent._instrumentation);

    this._connection._objects.set(guid, this);

    if (this._parent) {
      this._parent._objects.set(guid, this);

      this._logger = this._parent._logger;
    }

    this._channel = this._createChannel(new _events.EventEmitter());
    this._initializer = initializer;
  }

  _dispose() {
    // Clean up from parent and connection.
    if (this._parent) this._parent._objects.delete(this._guid);

    this._connection._objects.delete(this._guid); // Dispose all children.


    for (const object of [...this._objects.values()]) object._dispose();

    this._objects.clear();
  }

  _debugScopeState() {
    return {
      _guid: this._guid,
      objects: Array.from(this._objects.values()).map(o => o._debugScopeState())
    };
  }

  _createChannel(base) {
    const channel = new Proxy(base, {
      get: (obj, prop) => {
        if (prop === 'debugScopeState') return params => this._connection.sendMessageToServer(this, prop, params, null);

        if (typeof prop === 'string') {
          const validator = scheme[paramsName(this._type, prop)];

          if (validator) {
            return params => {
              return this._wrapApiCall(apiZone => {
                const {
                  stackTrace,
                  csi,
                  callCookie
                } = apiZone.reported ? {
                  csi: undefined,
                  callCookie: undefined,
                  stackTrace: null
                } : apiZone;
                apiZone.reported = true;
                if (csi && stackTrace && stackTrace.apiName) csi.onApiCallBegin(renderCallWithParams(stackTrace.apiName, params), stackTrace, callCookie);
                return this._connection.sendMessageToServer(this, prop, validator(params, ''), stackTrace);
              });
            };
          }
        }

        return obj[prop];
      }
    });
    channel._object = this;
    return channel;
  }

  async _wrapApiCall(func, isInternal = false, customStackTrace) {
    const logger = this._logger;
    const stack = (0, _stackTrace.captureRawStack)();

    const apiZone = _zones.zones.zoneData('apiZone', stack);

    if (apiZone) return func(apiZone);
    const stackTrace = customStackTrace || (0, _stackTrace.captureStackTrace)(stack);
    if (isInternal) delete stackTrace.apiName;
    const csi = isInternal ? undefined : this._instrumentation;
    const callCookie = {};
    const {
      apiName,
      frameTexts
    } = stackTrace;

    try {
      logApiCall(logger, `=> ${apiName} started`, isInternal);
      const apiZone = {
        stackTrace,
        isInternal,
        reported: false,
        csi,
        callCookie
      };
      const result = await _zones.zones.run('apiZone', apiZone, async () => {
        return await func(apiZone);
      });
      csi === null || csi === void 0 ? void 0 : csi.onApiCallEnd(callCookie);
      logApiCall(logger, `<= ${apiName} succeeded`, isInternal);
      return result;
    } catch (e) {
      const innerError = (process.env.PWDEBUGIMPL || (0, _utils.isUnderTest)()) && e.stack ? '\n<inner error>\n' + e.stack : '';
      e.message = apiName + ': ' + e.message;
      e.stack = e.message + '\n' + frameTexts.join('\n') + innerError;
      csi === null || csi === void 0 ? void 0 : csi.onApiCallEnd(callCookie, e);
      logApiCall(logger, `<= ${apiName} failed`, isInternal);
      throw e;
    }
  }

  _toImpl() {
    var _this$_connection$toI, _this$_connection;

    return (_this$_connection$toI = (_this$_connection = this._connection).toImpl) === null || _this$_connection$toI === void 0 ? void 0 : _this$_connection$toI.call(_this$_connection, this);
  }

  toJSON() {
    // Jest's expect library tries to print objects sometimes.
    // RPC objects can contain links to lots of other objects,
    // which can cause jest to crash. Let's help it out
    // by just returning the important values.
    return {
      _type: this._type,
      _guid: this._guid
    };
  }

}

exports.ChannelOwner = ChannelOwner;

function logApiCall(logger, message, isNested) {
  if (isNested) return;
  if (logger && logger.isEnabled('api', 'info')) logger.log('api', 'info', message, [], {
    color: 'cyan'
  });

  _debugLogger.debugLogger.log('api', message);
}

function paramsName(type, method) {
  return type + method[0].toUpperCase() + method.substring(1) + 'Params';
}

const paramsToRender = ['url', 'selector', 'text', 'key'];

function renderCallWithParams(apiName, params) {
  const paramsArray = [];

  if (params) {
    for (const name of paramsToRender) {
      if (params[name]) paramsArray.push(params[name]);
    }
  }

  const paramsText = paramsArray.length ? '(' + paramsArray.join(', ') + ')' : '';
  return apiName + paramsText;
}

const tChannel = name => {
  return (arg, path) => {
    if (arg._object instanceof ChannelOwner && (name === '*' || arg._object._type === name)) return {
      guid: arg._object._guid
    };
    throw new _validator.ValidationError(`${path}: expected ${name}`);
  };
};

const scheme = (0, _validator.createScheme)(tChannel);