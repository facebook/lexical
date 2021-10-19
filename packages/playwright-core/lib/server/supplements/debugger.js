"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Debugger = void 0;

var _events = require("events");

var _utils = require("../../utils/utils");

var _debugLogger = require("../../utils/debugLogger");

var _channels = require("../../protocol/channels");

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
const symbol = Symbol('Debugger');

class Debugger extends _events.EventEmitter {
  constructor(context) {
    super();
    this._pauseOnNextStatement = false;
    this._pausedCallsMetadata = new Map();
    this._enabled = void 0;
    this._context = void 0;
    this._muted = false;
    this._context = context;
    this._context[symbol] = this;
    this._enabled = (0, _utils.debugMode)() === 'inspector';
    if (this._enabled) this.pauseOnNextStatement();
  }

  static lookup(context) {
    if (!context) return;
    return context[symbol];
  }

  async setMuted(muted) {
    this._muted = muted;
  }

  async onBeforeCall(sdkObject, metadata) {
    if (this._muted) return;
    if (shouldPauseOnCall(sdkObject, metadata) || this._pauseOnNextStatement && shouldPauseBeforeStep(metadata)) await this.pause(sdkObject, metadata);
  }

  async onBeforeInputAction(sdkObject, metadata) {
    if (this._muted) return;
    if (this._enabled && this._pauseOnNextStatement) await this.pause(sdkObject, metadata);
  }

  async onCallLog(logName, message, sdkObject, metadata) {
    _debugLogger.debugLogger.log(logName, message);
  }

  async pause(sdkObject, metadata) {
    if (this._muted) return;
    this._enabled = true;
    metadata.pauseStartTime = (0, _utils.monotonicTime)();
    const result = new Promise(resolve => {
      this._pausedCallsMetadata.set(metadata, {
        resolve,
        sdkObject
      });
    });
    this.emit(Debugger.Events.PausedStateChanged);
    return result;
  }

  resume(step) {
    this._pauseOnNextStatement = step;
    const endTime = (0, _utils.monotonicTime)();

    for (const [metadata, {
      resolve
    }] of this._pausedCallsMetadata) {
      metadata.pauseEndTime = endTime;
      resolve();
    }

    this._pausedCallsMetadata.clear();

    this.emit(Debugger.Events.PausedStateChanged);
  }

  pauseOnNextStatement() {
    this._pauseOnNextStatement = true;
  }

  isPaused(metadata) {
    if (metadata) return this._pausedCallsMetadata.has(metadata);
    return !!this._pausedCallsMetadata.size;
  }

  pausedDetails() {
    const result = [];

    for (const [metadata, {
      sdkObject
    }] of this._pausedCallsMetadata) result.push({
      metadata,
      sdkObject
    });

    return result;
  }

}

exports.Debugger = Debugger;
Debugger.Events = {
  PausedStateChanged: 'pausedstatechanged'
};

function shouldPauseOnCall(sdkObject, metadata) {
  var _sdkObject$attributio;

  if (!((_sdkObject$attributio = sdkObject.attribution.browser) !== null && _sdkObject$attributio !== void 0 && _sdkObject$attributio.options.headful) && !(0, _utils.isUnderTest)()) return false;
  return metadata.method === 'pause';
}

function shouldPauseBeforeStep(metadata) {
  // Always stop on 'close'
  if (metadata.method === 'close') return true;
  if (metadata.method === 'waitForSelector' || metadata.method === 'waitForEventInfo') return false; // Never stop on those, primarily for the test harness.

  const step = metadata.type + '.' + metadata.method; // Stop before everything that generates snapshot. But don't stop before those marked as pausesBeforeInputActions
  // since we stop in them on a separate instrumentation signal.

  return _channels.commandsWithTracingSnapshots.has(step) && !_channels.pausesBeforeInputActions.has(metadata.type + '.' + metadata.method);
}