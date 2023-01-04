"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Connection = void 0;
var _browser = require("./browser");
var _browserContext = require("./browserContext");
var _browserType = require("./browserType");
var _channelOwner = require("./channelOwner");
var _elementHandle = require("./elementHandle");
var _frame = require("./frame");
var _jsHandle = require("./jsHandle");
var _network = require("./network");
var _page = require("./page");
var _worker = require("./worker");
var _consoleMessage = require("./consoleMessage");
var _dialog = require("./dialog");
var _serializers = require("../protocol/serializers");
var _cdpSession = require("./cdpSession");
var _playwright = require("./playwright");
var _electron = require("./electron");
var _stream = require("./stream");
var _writableStream = require("./writableStream");
var _debugLogger = require("../common/debugLogger");
var _selectors = require("./selectors");
var _android = require("./android");
var _stackTrace = require("../utils/stackTrace");
var _artifact = require("./artifact");
var _events = require("events");
var _jsonPipe = require("./jsonPipe");
var _fetch = require("./fetch");
var _localUtils = require("./localUtils");
var _tracing = require("./tracing");
var _validator = require("../protocol/validator");
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

class Root extends _channelOwner.ChannelOwner {
  constructor(connection) {
    super(connection, 'Root', '', {});
  }
  async initialize() {
    return _playwright.Playwright.from((await this._channel.initialize({
      sdkLanguage: 'javascript'
    })).playwright);
  }
}
class DummyChannelOwner extends _channelOwner.ChannelOwner {}
class Connection extends _events.EventEmitter {
  // Some connections allow resolving in-process dispatchers.

  constructor(localUtils) {
    super();
    this._objects = new Map();
    this.onmessage = message => {};
    this._lastId = 0;
    this._callbacks = new Map();
    this._rootObject = void 0;
    this._closedErrorMessage = void 0;
    this._isRemote = false;
    this._localUtils = void 0;
    this.toImpl = void 0;
    this._rootObject = new Root(this);
    this._localUtils = localUtils;
  }
  markAsRemote() {
    this._isRemote = true;
  }
  isRemote() {
    return this._isRemote;
  }
  localUtils() {
    return this._localUtils;
  }
  async initializePlaywright() {
    return await this._rootObject.initialize();
  }
  pendingProtocolCalls() {
    return Array.from(this._callbacks.values()).map(callback => callback.stackTrace).filter(Boolean);
  }
  getObjectWithKnownName(guid) {
    return this._objects.get(guid);
  }
  async sendMessageToServer(object, type, method, params, stackTrace) {
    if (this._closedErrorMessage) throw new Error(this._closedErrorMessage);
    const {
      apiName,
      frames
    } = stackTrace || {
      apiName: '',
      frames: []
    };
    const guid = object._guid;
    const id = ++this._lastId;
    const converted = {
      id,
      guid,
      method,
      params
    };
    // Do not include metadata in debug logs to avoid noise.
    _debugLogger.debugLogger.log('channel:command', converted);
    const metadata = {
      stack: frames,
      apiName,
      internal: !apiName
    };
    this.onmessage({
      ...converted,
      metadata
    });
    return await new Promise((resolve, reject) => this._callbacks.set(id, {
      resolve,
      reject,
      stackTrace,
      type,
      method
    }));
  }
  dispatch(message) {
    if (this._closedErrorMessage) return;
    const {
      id,
      guid,
      method,
      params,
      result,
      error
    } = message;
    if (id) {
      _debugLogger.debugLogger.log('channel:response', message);
      const callback = this._callbacks.get(id);
      if (!callback) throw new Error(`Cannot find command to respond: ${id}`);
      this._callbacks.delete(id);
      if (error && !result) {
        callback.reject((0, _serializers.parseError)(error));
      } else {
        const validator = (0, _validator.findValidator)(callback.type, callback.method, 'Result');
        callback.resolve(validator(result, '', {
          tChannelImpl: this._tChannelImplFromWire.bind(this),
          binary: this.isRemote() ? 'fromBase64' : 'buffer'
        }));
      }
      return;
    }
    _debugLogger.debugLogger.log('channel:event', message);
    if (method === '__create__') {
      this._createRemoteObject(guid, params.type, params.guid, params.initializer);
      return;
    }
    const object = this._objects.get(guid);
    if (!object) throw new Error(`Cannot find object to "${method}": ${guid}`);
    if (method === '__adopt__') {
      const child = this._objects.get(params.guid);
      if (!child) throw new Error(`Unknown new child: ${params.guid}`);
      object._adopt(child);
      return;
    }
    if (method === '__dispose__') {
      object._dispose();
      return;
    }
    const validator = (0, _validator.findValidator)(object._type, method, 'Event');
    object._channel.emit(method, validator(params, '', {
      tChannelImpl: this._tChannelImplFromWire.bind(this),
      binary: this.isRemote() ? 'fromBase64' : 'buffer'
    }));
  }
  close(errorMessage = 'Connection closed') {
    const stack = (0, _stackTrace.captureStackTrace)().frameTexts.join('\n');
    if (stack) errorMessage += '\n    ==== Closed by ====\n' + stack + '\n';
    this._closedErrorMessage = errorMessage;
    for (const callback of this._callbacks.values()) callback.reject(new Error(errorMessage));
    this._callbacks.clear();
    this.emit('close');
  }
  _tChannelImplFromWire(names, arg, path, context) {
    if (arg && typeof arg === 'object' && typeof arg.guid === 'string') {
      const object = this._objects.get(arg.guid);
      if (!object) throw new Error(`Object with guid ${arg.guid} was not bound in the connection`);
      if (names !== '*' && !names.includes(object._type)) throw new _validator.ValidationError(`${path}: expected channel ${names.toString()}`);
      return object._channel;
    }
    throw new _validator.ValidationError(`${path}: expected channel ${names.toString()}`);
  }
  _createRemoteObject(parentGuid, type, guid, initializer) {
    const parent = this._objects.get(parentGuid);
    if (!parent) throw new Error(`Cannot find parent object ${parentGuid} to create ${guid}`);
    let result;
    const validator = (0, _validator.findValidator)(type, '', 'Initializer');
    initializer = validator(initializer, '', {
      tChannelImpl: this._tChannelImplFromWire.bind(this),
      binary: this.isRemote() ? 'fromBase64' : 'buffer'
    });
    switch (type) {
      case 'Android':
        result = new _android.Android(parent, type, guid, initializer);
        break;
      case 'AndroidSocket':
        result = new _android.AndroidSocket(parent, type, guid, initializer);
        break;
      case 'AndroidDevice':
        result = new _android.AndroidDevice(parent, type, guid, initializer);
        break;
      case 'APIRequestContext':
        result = new _fetch.APIRequestContext(parent, type, guid, initializer);
        break;
      case 'Artifact':
        result = new _artifact.Artifact(parent, type, guid, initializer);
        break;
      case 'BindingCall':
        result = new _page.BindingCall(parent, type, guid, initializer);
        break;
      case 'Browser':
        result = new _browser.Browser(parent, type, guid, initializer);
        break;
      case 'BrowserContext':
        result = new _browserContext.BrowserContext(parent, type, guid, initializer);
        break;
      case 'BrowserType':
        result = new _browserType.BrowserType(parent, type, guid, initializer);
        break;
      case 'CDPSession':
        result = new _cdpSession.CDPSession(parent, type, guid, initializer);
        break;
      case 'ConsoleMessage':
        result = new _consoleMessage.ConsoleMessage(parent, type, guid, initializer);
        break;
      case 'Dialog':
        result = new _dialog.Dialog(parent, type, guid, initializer);
        break;
      case 'Electron':
        result = new _electron.Electron(parent, type, guid, initializer);
        break;
      case 'ElectronApplication':
        result = new _electron.ElectronApplication(parent, type, guid, initializer);
        break;
      case 'ElementHandle':
        result = new _elementHandle.ElementHandle(parent, type, guid, initializer);
        break;
      case 'Frame':
        result = new _frame.Frame(parent, type, guid, initializer);
        break;
      case 'JSHandle':
        result = new _jsHandle.JSHandle(parent, type, guid, initializer);
        break;
      case 'JsonPipe':
        result = new _jsonPipe.JsonPipe(parent, type, guid, initializer);
        break;
      case 'LocalUtils':
        result = new _localUtils.LocalUtils(parent, type, guid, initializer);
        if (!this._localUtils) this._localUtils = result;
        break;
      case 'Page':
        result = new _page.Page(parent, type, guid, initializer);
        break;
      case 'Playwright':
        result = new _playwright.Playwright(parent, type, guid, initializer);
        break;
      case 'Request':
        result = new _network.Request(parent, type, guid, initializer);
        break;
      case 'Response':
        result = new _network.Response(parent, type, guid, initializer);
        break;
      case 'Route':
        result = new _network.Route(parent, type, guid, initializer);
        break;
      case 'Stream':
        result = new _stream.Stream(parent, type, guid, initializer);
        break;
      case 'Selectors':
        result = new _selectors.SelectorsOwner(parent, type, guid, initializer);
        break;
      case 'SocksSupport':
        result = new DummyChannelOwner(parent, type, guid, initializer);
        break;
      case 'Tracing':
        result = new _tracing.Tracing(parent, type, guid, initializer);
        break;
      case 'WebSocket':
        result = new _network.WebSocket(parent, type, guid, initializer);
        break;
      case 'Worker':
        result = new _worker.Worker(parent, type, guid, initializer);
        break;
      case 'WritableStream':
        result = new _writableStream.WritableStream(parent, type, guid, initializer);
        break;
      default:
        throw new Error('Missing type ' + type);
    }
    return result;
  }
}
exports.Connection = Connection;