"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createInstrumentation = createInstrumentation;
exports.internalCallMetadata = internalCallMetadata;
Object.defineProperty(exports, "CallMetadata", {
  enumerable: true,
  get: function () {
    return _callMetadata.CallMetadata;
  }
});
exports.SdkObject = void 0;

var _events = require("events");

var _utils = require("../utils/utils");

var _callMetadata = require("../protocol/callMetadata");

/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
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
class SdkObject extends _events.EventEmitter {
  constructor(parent, guidPrefix, guid) {
    super();
    this.guid = void 0;
    this.attribution = void 0;
    this.instrumentation = void 0;
    this.guid = guid || `${guidPrefix || ''}@${(0, _utils.createGuid)()}`;
    this.setMaxListeners(0);
    this.attribution = { ...parent.attribution
    };
    this.instrumentation = parent.instrumentation;
  }

}

exports.SdkObject = SdkObject;

function createInstrumentation() {
  const listeners = [];
  return new Proxy({}, {
    get: (obj, prop) => {
      if (prop === 'addListener') return listener => listeners.push(listener);
      if (prop === 'removeListener') return listener => listeners.splice(listeners.indexOf(listener), 1);
      if (!prop.startsWith('on')) return obj[prop];
      return async (...params) => {
        for (const listener of listeners) {
          var _prop, _ref;

          await ((_prop = (_ref = listener)[prop]) === null || _prop === void 0 ? void 0 : _prop.call(_ref, ...params));
        }
      };
    }
  });
}

function internalCallMetadata() {
  return {
    id: '',
    startTime: 0,
    endTime: 0,
    type: 'Internal',
    method: '',
    params: {},
    log: [],
    snapshots: []
  };
}