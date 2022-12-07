"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JoiningEventEmitter = void 0;
var _events = require("events");
var _multimap = require("../utils/multimap");
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

const originalListener = Symbol('originalListener');
const wrapperListener = Symbol('wrapperListener');
class JoiningEventEmitter {
  constructor() {
    this._emitterDelegate = new _events.EventEmitter();
    this._pendingPromises = new _multimap.MultiMap();
  }
  addListener(event, listener) {
    this._emitterDelegate.addListener(event, this._wrap(event, listener));
    return this;
  }
  on(event, listener) {
    this._emitterDelegate.on(event, this._wrap(event, listener));
    return this;
  }
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
    return this;
  }
  removeListener(event, listener) {
    this._emitterDelegate.removeListener(event, this._wrapper(listener));
    return this;
  }
  off(event, listener) {
    this._emitterDelegate.off(event, this._wrapper(listener));
    return this;
  }
  removeAllListeners(event) {
    this._emitterDelegate.removeAllListeners(event);
    return this;
  }
  setMaxListeners(n) {
    this._emitterDelegate.setMaxListeners(n);
    return this;
  }
  getMaxListeners() {
    return this._emitterDelegate.getMaxListeners();
  }
  listeners(event) {
    return this._emitterDelegate.listeners(event).map(f => this._original(f));
  }
  rawListeners(event) {
    return this._emitterDelegate.rawListeners(event).map(f => this._original(f));
  }
  emit(event, ...args) {
    return this._emitterDelegate.emit(event, ...args);
  }
  listenerCount(event) {
    return this._emitterDelegate.listenerCount(event);
  }
  prependListener(event, listener) {
    this._emitterDelegate.prependListener(event, this._wrap(event, listener));
    return this;
  }
  prependOnceListener(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.prependListener(event, onceWrapper);
    return this;
  }
  eventNames() {
    return this._emitterDelegate.eventNames();
  }
  async _joinPendingEventHandlers() {
    await Promise.all([...this._pendingPromises.values()]);
  }
  _wrap(event, listener) {
    const wrapper = (...args) => {
      const result = listener(...args);
      if (result instanceof Promise) {
        this._pendingPromises.set(event, result);
        result.finally(() => this._pendingPromises.delete(event, result));
      }
    };
    wrapper[originalListener] = listener;
    listener[wrapperListener] = wrapper;
    return wrapper;
  }
  _wrapper(listener) {
    var _wrapperListener;
    // Fallback to original listener if not wrapped to ensure backwards compatibility Node.js's event emitter
    return (_wrapperListener = listener[wrapperListener]) !== null && _wrapperListener !== void 0 ? _wrapperListener : listener;
  }
  _original(wrapper) {
    return wrapper[originalListener];
  }
}
exports.JoiningEventEmitter = JoiningEventEmitter;