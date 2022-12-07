"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.kBrowserCloseMessageId = exports.ConnectionEvents = exports.CRSessionEvents = exports.CRSession = exports.CRConnection = void 0;
var _utils = require("../../utils");
var _events = require("events");
var _stackTrace = require("../../utils/stackTrace");
var _debugLogger = require("../../common/debugLogger");
var _helper = require("../helper");
var _protocolError = require("../protocolError");
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

const ConnectionEvents = {
  Disconnected: Symbol('ConnectionEvents.Disconnected')
};

// CRPlaywright uses this special id to issue Browser.close command which we
// should ignore.
exports.ConnectionEvents = ConnectionEvents;
const kBrowserCloseMessageId = -9999;
exports.kBrowserCloseMessageId = kBrowserCloseMessageId;
class CRConnection extends _events.EventEmitter {
  constructor(transport, protocolLogger, browserLogsCollector) {
    super();
    this._lastId = 0;
    this._transport = void 0;
    this._sessions = new Map();
    this._protocolLogger = void 0;
    this._browserLogsCollector = void 0;
    this.rootSession = void 0;
    this._closed = false;
    this.setMaxListeners(0);
    this._transport = transport;
    this._protocolLogger = protocolLogger;
    this._browserLogsCollector = browserLogsCollector;
    this.rootSession = new CRSession(this, '', 'browser', '');
    this._sessions.set('', this.rootSession);
    this._transport.onmessage = this._onMessage.bind(this);
    // onclose should be set last, since it can be immediately called.
    this._transport.onclose = this._onClose.bind(this);
  }
  static fromSession(session) {
    return session._connection;
  }
  session(sessionId) {
    return this._sessions.get(sessionId) || null;
  }
  _rawSend(sessionId, method, params) {
    const id = ++this._lastId;
    const message = {
      id,
      method,
      params
    };
    if (sessionId) message.sessionId = sessionId;
    this._protocolLogger('send', message);
    this._transport.send(message);
    return id;
  }
  async _onMessage(message) {
    this._protocolLogger('receive', message);
    if (message.id === kBrowserCloseMessageId) return;
    if (message.method === 'Target.attachedToTarget') {
      const sessionId = message.params.sessionId;
      const rootSessionId = message.sessionId || '';
      const session = new CRSession(this, rootSessionId, message.params.targetInfo.type, sessionId);
      this._sessions.set(sessionId, session);
    } else if (message.method === 'Target.detachedFromTarget') {
      const session = this._sessions.get(message.params.sessionId);
      if (session) {
        session._onClosed(undefined);
        this._sessions.delete(message.params.sessionId);
      }
    }
    const session = this._sessions.get(message.sessionId || '');
    if (session) session._onMessage(message);
  }
  _onClose() {
    this._closed = true;
    this._transport.onmessage = undefined;
    this._transport.onclose = undefined;
    const browserDisconnectedLogs = _helper.helper.formatBrowserLogs(this._browserLogsCollector.recentLogs());
    for (const session of this._sessions.values()) session._onClosed(browserDisconnectedLogs);
    this._sessions.clear();
    Promise.resolve().then(() => this.emit(ConnectionEvents.Disconnected));
  }
  close() {
    if (!this._closed) this._transport.close();
  }
  async createSession(targetInfo) {
    const {
      sessionId
    } = await this.rootSession.send('Target.attachToTarget', {
      targetId: targetInfo.targetId,
      flatten: true
    });
    return this._sessions.get(sessionId);
  }
  async createBrowserSession() {
    const {
      sessionId
    } = await this.rootSession.send('Target.attachToBrowserTarget');
    return this._sessions.get(sessionId);
  }
}
exports.CRConnection = CRConnection;
const CRSessionEvents = {
  Disconnected: Symbol('Events.CDPSession.Disconnected')
};
exports.CRSessionEvents = CRSessionEvents;
class CRSession extends _events.EventEmitter {
  constructor(connection, rootSessionId, targetType, sessionId) {
    super();
    this._connection = void 0;
    this._eventListener = void 0;
    this._callbacks = new Map();
    this._targetType = void 0;
    this._sessionId = void 0;
    this._rootSessionId = void 0;
    this._crashed = false;
    this._browserDisconnectedLogs = void 0;
    this.on = void 0;
    this.addListener = void 0;
    this.off = void 0;
    this.removeListener = void 0;
    this.once = void 0;
    this.guid = void 0;
    this.guid = `cdp-session@${sessionId}`;
    this.setMaxListeners(0);
    this._connection = connection;
    this._rootSessionId = rootSessionId;
    this._targetType = targetType;
    this._sessionId = sessionId;
    this.on = super.on;
    this.addListener = super.addListener;
    this.off = super.removeListener;
    this.removeListener = super.removeListener;
    this.once = super.once;
  }
  _markAsCrashed() {
    this._crashed = true;
  }
  async send(method, params) {
    if (this._crashed) throw new _protocolError.ProtocolError(true, 'Target crashed');
    if (this._browserDisconnectedLogs !== undefined) throw new _protocolError.ProtocolError(true, `Browser closed.` + this._browserDisconnectedLogs);
    if (!this._connection) throw new _protocolError.ProtocolError(true, `Target closed`);
    const id = this._connection._rawSend(this._sessionId, method, params);
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, {
        resolve,
        reject,
        error: new _protocolError.ProtocolError(false),
        method
      });
    });
  }
  _sendMayFail(method, params) {
    return this.send(method, params).catch(error => _debugLogger.debugLogger.log('error', error));
  }
  _onMessage(object) {
    var _object$error;
    if (object.id && this._callbacks.has(object.id)) {
      const callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.error) callback.reject(createProtocolError(callback.error, callback.method, object.error));else callback.resolve(object.result);
    } else if (object.id && ((_object$error = object.error) === null || _object$error === void 0 ? void 0 : _object$error.code) === -32001) {
      // Message to a closed session, just ignore it.
    } else {
      var _object$error2;
      (0, _utils.assert)(!object.id, (object === null || object === void 0 ? void 0 : (_object$error2 = object.error) === null || _object$error2 === void 0 ? void 0 : _object$error2.message) || undefined);
      Promise.resolve().then(() => {
        if (this._eventListener) this._eventListener(object.method, object.params);
        this.emit(object.method, object.params);
      });
    }
  }
  async detach() {
    if (!this._connection) throw new Error(`Session already detached. Most likely the ${this._targetType} has been closed.`);
    const rootSession = this._connection.session(this._rootSessionId);
    if (!rootSession) throw new Error('Root session has been closed');
    await rootSession.send('Target.detachFromTarget', {
      sessionId: this._sessionId
    });
  }
  _onClosed(browserDisconnectedLogs) {
    this._browserDisconnectedLogs = browserDisconnectedLogs;
    const errorMessage = browserDisconnectedLogs !== undefined ? 'Browser closed.' + browserDisconnectedLogs : 'Target closed';
    for (const callback of this._callbacks.values()) {
      callback.error.sessionClosed = true;
      callback.reject((0, _stackTrace.rewriteErrorMessage)(callback.error, errorMessage));
    }
    this._callbacks.clear();
    this._connection = null;
    Promise.resolve().then(() => this.emit(CRSessionEvents.Disconnected));
  }
}
exports.CRSession = CRSession;
function createProtocolError(error, method, protocolError) {
  let message = `Protocol error (${method}): ${protocolError.message}`;
  if ('data' in protocolError) message += ` ${protocolError.data}`;
  return (0, _stackTrace.rewriteErrorMessage)(error, message);
}