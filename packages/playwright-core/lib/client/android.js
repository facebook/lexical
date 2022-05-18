"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AndroidWebView = exports.AndroidSocket = exports.AndroidInput = exports.AndroidDevice = exports.Android = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _utils = require("../utils");

var _events = require("./events");

var _browserContext = require("./browserContext");

var _channelOwner = require("./channelOwner");

var _timeoutSettings = require("../common/timeoutSettings");

var _waiter = require("./waiter");

var _events2 = require("events");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
class Android extends _channelOwner.ChannelOwner {
  static from(android) {
    return android._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._timeoutSettings = void 0;
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings();
  }

  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);

    this._channel.setDefaultTimeoutNoReply({
      timeout
    });
  }

  async devices(options = {}) {
    const {
      devices
    } = await this._channel.devices(options);
    return devices.map(d => AndroidDevice.from(d));
  }

}

exports.Android = Android;

class AndroidDevice extends _channelOwner.ChannelOwner {
  static from(androidDevice) {
    return androidDevice._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._timeoutSettings = void 0;
    this._webViews = new Map();
    this.input = void 0;
    this.input = new AndroidInput(this);
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings(parent._timeoutSettings);

    this._channel.on('webViewAdded', ({
      webView
    }) => this._onWebViewAdded(webView));

    this._channel.on('webViewRemoved', ({
      socketName
    }) => this._onWebViewRemoved(socketName));
  }

  _onWebViewAdded(webView) {
    const view = new AndroidWebView(this, webView);

    this._webViews.set(webView.socketName, view);

    this.emit(_events.Events.AndroidDevice.WebView, view);
  }

  _onWebViewRemoved(socketName) {
    const view = this._webViews.get(socketName);

    this._webViews.delete(socketName);

    if (view) view.emit(_events.Events.AndroidWebView.Close);
  }

  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);

    this._channel.setDefaultTimeoutNoReply({
      timeout
    });
  }

  serial() {
    return this._initializer.serial;
  }

  model() {
    return this._initializer.model;
  }

  webViews() {
    return [...this._webViews.values()];
  }

  async webView(selector, options) {
    const predicate = v => {
      if (selector.pkg) return v.pkg() === selector.pkg;
      if (selector.socketName) return v._socketName() === selector.socketName;
      return false;
    };

    const webView = [...this._webViews.values()].find(predicate);
    if (webView) return webView;
    return this.waitForEvent('webview', { ...options,
      predicate
    });
  }

  async wait(selector, options) {
    await this._channel.wait({
      selector: toSelectorChannel(selector),
      ...options
    });
  }

  async fill(selector, text, options) {
    await this._channel.fill({
      selector: toSelectorChannel(selector),
      text,
      ...options
    });
  }

  async press(selector, key, options) {
    await this.tap(selector, options);
    await this.input.press(key);
  }

  async tap(selector, options) {
    await this._channel.tap({
      selector: toSelectorChannel(selector),
      ...options
    });
  }

  async drag(selector, dest, options) {
    await this._channel.drag({
      selector: toSelectorChannel(selector),
      dest,
      ...options
    });
  }

  async fling(selector, direction, options) {
    await this._channel.fling({
      selector: toSelectorChannel(selector),
      direction,
      ...options
    });
  }

  async longTap(selector, options) {
    await this._channel.longTap({
      selector: toSelectorChannel(selector),
      ...options
    });
  }

  async pinchClose(selector, percent, options) {
    await this._channel.pinchClose({
      selector: toSelectorChannel(selector),
      percent,
      ...options
    });
  }

  async pinchOpen(selector, percent, options) {
    await this._channel.pinchOpen({
      selector: toSelectorChannel(selector),
      percent,
      ...options
    });
  }

  async scroll(selector, direction, percent, options) {
    await this._channel.scroll({
      selector: toSelectorChannel(selector),
      direction,
      percent,
      ...options
    });
  }

  async swipe(selector, direction, percent, options) {
    await this._channel.swipe({
      selector: toSelectorChannel(selector),
      direction,
      percent,
      ...options
    });
  }

  async info(selector) {
    return (await this._channel.info({
      selector: toSelectorChannel(selector)
    })).info;
  }

  async screenshot(options = {}) {
    const {
      binary
    } = await this._channel.screenshot();
    const buffer = Buffer.from(binary, 'base64');
    if (options.path) await _fs.default.promises.writeFile(options.path, buffer);
    return buffer;
  }

  async close() {
    await this._channel.close();
    this.emit(_events.Events.AndroidDevice.Close);
  }

  async shell(command) {
    const {
      result
    } = await this._channel.shell({
      command
    });
    return Buffer.from(result, 'base64');
  }

  async open(command) {
    return AndroidSocket.from((await this._channel.open({
      command
    })).socket);
  }

  async installApk(file, options) {
    await this._channel.installApk({
      file: await loadFile(file),
      args: options && options.args
    });
  }

  async push(file, path, options) {
    await this._channel.push({
      file: await loadFile(file),
      path,
      mode: options ? options.mode : undefined
    });
  }

  async launchBrowser(options = {}) {
    const contextOptions = await (0, _browserContext.prepareBrowserContextParams)(options);
    const {
      context
    } = await this._channel.launchBrowser(contextOptions);
    return _browserContext.BrowserContext.from(context);
  }

  async waitForEvent(event, optionsOrPredicate = {}) {
    return this._wrapApiCall(async () => {
      const timeout = this._timeoutSettings.timeout(typeof optionsOrPredicate === 'function' ? {} : optionsOrPredicate);

      const predicate = typeof optionsOrPredicate === 'function' ? optionsOrPredicate : optionsOrPredicate.predicate;

      const waiter = _waiter.Waiter.createForEvent(this, event);

      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== _events.Events.AndroidDevice.Close) waiter.rejectOnEvent(this, _events.Events.AndroidDevice.Close, new Error('Device closed'));
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }

}

exports.AndroidDevice = AndroidDevice;

class AndroidSocket extends _channelOwner.ChannelOwner {
  static from(androidDevice) {
    return androidDevice._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);

    this._channel.on('data', ({
      data
    }) => this.emit(_events.Events.AndroidSocket.Data, Buffer.from(data, 'base64')));

    this._channel.on('close', () => this.emit(_events.Events.AndroidSocket.Close));
  }

  async write(data) {
    await this._channel.write({
      data: data.toString('base64')
    });
  }

  async close() {
    await this._channel.close();
  }

}

exports.AndroidSocket = AndroidSocket;

async function loadFile(file) {
  if ((0, _utils.isString)(file)) return _fs.default.promises.readFile(file, {
    encoding: 'base64'
  }).toString();
  return file.toString('base64');
}

class AndroidInput {
  constructor(device) {
    this._device = void 0;
    this._device = device;
  }

  async type(text) {
    await this._device._channel.inputType({
      text
    });
  }

  async press(key) {
    await this._device._channel.inputPress({
      key
    });
  }

  async tap(point) {
    await this._device._channel.inputTap({
      point
    });
  }

  async swipe(from, segments, steps) {
    await this._device._channel.inputSwipe({
      segments,
      steps
    });
  }

  async drag(from, to, steps) {
    await this._device._channel.inputDrag({
      from,
      to,
      steps
    });
  }

}

exports.AndroidInput = AndroidInput;

function toSelectorChannel(selector) {
  const {
    checkable,
    checked,
    clazz,
    clickable,
    depth,
    desc,
    enabled,
    focusable,
    focused,
    hasChild,
    hasDescendant,
    longClickable,
    pkg,
    res,
    scrollable,
    selected,
    text
  } = selector;

  const toRegex = value => {
    if (value === undefined) return undefined;
    if ((0, _utils.isRegExp)(value)) return value.source;
    return '^' + value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d') + '$';
  };

  return {
    checkable,
    checked,
    clazz: toRegex(clazz),
    pkg: toRegex(pkg),
    desc: toRegex(desc),
    res: toRegex(res),
    text: toRegex(text),
    clickable,
    depth,
    enabled,
    focusable,
    focused,
    hasChild: hasChild ? {
      selector: toSelectorChannel(hasChild.selector)
    } : undefined,
    hasDescendant: hasDescendant ? {
      selector: toSelectorChannel(hasDescendant.selector),
      maxDepth: hasDescendant.maxDepth
    } : undefined,
    longClickable,
    scrollable,
    selected
  };
}

class AndroidWebView extends _events2.EventEmitter {
  constructor(device, data) {
    super();
    this._device = void 0;
    this._data = void 0;
    this._pagePromise = void 0;
    this._device = device;
    this._data = data;
  }

  pid() {
    return this._data.pid;
  }

  pkg() {
    return this._data.pkg;
  }

  _socketName() {
    return this._data.socketName;
  }

  async page() {
    if (!this._pagePromise) this._pagePromise = this._fetchPage();
    return this._pagePromise;
  }

  async _fetchPage() {
    const {
      context
    } = await this._device._channel.connectToWebView({
      socketName: this._data.socketName
    });
    return _browserContext.BrowserContext.from(context).pages()[0];
  }

}

exports.AndroidWebView = AndroidWebView;