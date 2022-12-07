"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TimeoutRunnerError = exports.TimeoutRunner = void 0;
exports.raceAgainstTimeout = raceAgainstTimeout;
var _manualPromise = require("./manualPromise");
var _ = require("./");
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

class TimeoutRunnerError extends Error {}
exports.TimeoutRunnerError = TimeoutRunnerError;
class TimeoutRunner {
  constructor(timeout) {
    this._running = void 0;
    this._timeout = void 0;
    this._elapsed = void 0;
    this._timeout = timeout;
    this._elapsed = 0;
  }
  async run(cb) {
    const running = this._running = {
      lastElapsedSync: (0, _.monotonicTime)(),
      timer: undefined,
      timeoutPromise: new _manualPromise.ManualPromise()
    };
    try {
      const resultPromise = Promise.race([cb(), running.timeoutPromise]);
      this._updateTimeout(running, this._timeout);
      return await resultPromise;
    } finally {
      this._updateTimeout(running, 0);
      if (this._running === running) this._running = undefined;
    }
  }
  interrupt() {
    if (this._running) this._updateTimeout(this._running, -1);
  }
  elapsed() {
    this._syncElapsedAndStart();
    return this._elapsed;
  }
  updateTimeout(timeout, elapsed) {
    this._timeout = timeout;
    if (elapsed !== undefined) {
      this._syncElapsedAndStart();
      this._elapsed = elapsed;
    }
    if (this._running) this._updateTimeout(this._running, timeout);
  }
  _syncElapsedAndStart() {
    if (this._running) {
      const now = (0, _.monotonicTime)();
      this._elapsed += now - this._running.lastElapsedSync;
      this._running.lastElapsedSync = now;
    }
  }
  _updateTimeout(running, timeout) {
    if (running.timer) {
      clearTimeout(running.timer);
      running.timer = undefined;
    }
    this._syncElapsedAndStart();
    if (timeout === 0) return;
    timeout = timeout - this._elapsed;
    if (timeout <= 0) running.timeoutPromise.reject(new TimeoutRunnerError());else running.timer = setTimeout(() => running.timeoutPromise.reject(new TimeoutRunnerError()), timeout);
  }
}
exports.TimeoutRunner = TimeoutRunner;
async function raceAgainstTimeout(cb, timeout) {
  const runner = new TimeoutRunner(timeout);
  try {
    return {
      result: await runner.run(cb),
      timedOut: false
    };
  } catch (e) {
    if (e instanceof TimeoutRunnerError) return {
      timedOut: true
    };
    throw e;
  }
}