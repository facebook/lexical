"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GridServer = void 0;
var _utilsBundle = require("../utilsBundle");
var _events = require("events");
var _url = require("url");
var _httpServer = require("../utils/httpServer");
var _utils = require("../utils");
var _userAgent = require("../common/userAgent");
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

const defaultOS = 'linux';
const WSErrors = {
  NO_ERROR: {
    code: 1000,
    reason: ''
  },
  AUTH_FAILED: {
    code: 1008,
    reason: 'Grid authentication failed'
  },
  AGENT_CREATION_FAILED: {
    code: 1013,
    reason: 'Grid agent creation failed'
  },
  AGENT_NOT_FOUND: {
    code: 1013,
    reason: 'Grid agent registration failed - agent with given ID not found'
  },
  AGENT_NOT_CONNECTED: {
    code: 1013,
    reason: 'Grid worker registration failed - agent has unsupported status'
  },
  AGENT_CREATION_TIMED_OUT: {
    code: 1013,
    reason: 'Grid agent creation timed out'
  },
  AGENT_RETIRED: {
    code: 1000,
    reason: 'Grid agent was retired'
  },
  CLIENT_SOCKET_ERROR: {
    code: 1011,
    reason: 'Grid client socket error'
  },
  WORKER_SOCKET_ERROR: {
    code: 1011,
    reason: 'Grid worker socket error'
  },
  CLIENT_PLAYWRIGHT_VERSION_MISMATCH: {
    code: 1013,
    reason: 'Grid Playwright and grid client versions are different'
  },
  AGENT_PLAYWRIGHT_VERSION_MISMATCH: {
    code: 1013,
    reason: 'Grid Playwright and grid agent versions are different'
  },
  CLIENT_UNSUPPORTED_OS: {
    code: 1013,
    reason: 'Unsupported OS'
  },
  GRID_SHUTDOWN: {
    code: 1000,
    reason: 'Grid was shutdown'
  },
  AGENT_MANUALLY_STOPPED: {
    code: 1000,
    reason: 'Grid agent was manually stopped'
  }
};
class GridWorker extends _events.EventEmitter {
  constructor(clientSocket, params) {
    super();
    this.workerId = (0, _utils.createGuid)();
    this.params = void 0;
    this._workerSocket = void 0;
    this._clientSocket = void 0;
    this._log = void 0;
    this._bufferedMessages = [];
    this._log = (0, _utilsBundle.debug)(`pw:grid:worker:${this.workerId}`);
    this._clientSocket = clientSocket;
    this.params = params;
    clientSocket.on('close', (code, reason) => this.closeWorker(WSErrors.NO_ERROR));
    clientSocket.on('error', error => this.closeWorker(WSErrors.CLIENT_SOCKET_ERROR));
    // clientSocket.pause() would be preferrable but according to the docs " Some events can still be
    // emitted after it is called, until all buffered data is consumed."
    this._clientSocket.on('message', data => {
      if (this._workerSocket) this._workerSocket.send(data);else this._bufferedMessages.push(data);
    });
  }
  workerConnected(workerSocket) {
    this._log('connected');
    this._workerSocket = workerSocket;
    workerSocket.on('close', (code, reason) => this.closeWorker(WSErrors.NO_ERROR));
    workerSocket.on('error', error => this.closeWorker(WSErrors.WORKER_SOCKET_ERROR));
    workerSocket.on('message', data => this._clientSocket.send(data));
    for (const data of this._bufferedMessages) workerSocket.send(data);
    this._bufferedMessages = [];
  }
  closeWorker(errorCode) {
    var _this$_workerSocket;
    this._log(`close ${errorCode.reason}`);
    (_this$_workerSocket = this._workerSocket) === null || _this$_workerSocket === void 0 ? void 0 : _this$_workerSocket.close(errorCode.code, errorCode.reason);
    this._clientSocket.close(errorCode.code, errorCode.reason);
    this.emit('close');
  }
  debugInfo() {
    return {
      worker: !!this._workerSocket,
      client: !!this._clientSocket
    };
  }
}
class GridAgent extends _events.EventEmitter {
  constructor(os, capacity = Infinity, creationTimeout = 5 * 60000, retireTimeout = 30000) {
    super();
    this._capacity = void 0;
    this.agentId = (0, _utils.createGuid)();
    this.os = void 0;
    this._ws = void 0;
    this.runId = void 0;
    this._workers = new Map();
    this._status = 'none';
    this._workersWaitingForAgentConnected = new Set();
    this._retireTimeout = 30000;
    this._retireTimeoutId = void 0;
    this._log = void 0;
    this._agentCreationTimeoutId = void 0;
    this.os = os;
    this._capacity = capacity;
    this._log = (0, _utilsBundle.debug)(`pw:grid:agent:${this.agentId}`);
    this.setStatus('created');
    this._retireTimeout = retireTimeout;
    this._agentCreationTimeoutId = setTimeout(() => {
      this.closeAgent(WSErrors.AGENT_CREATION_TIMED_OUT);
    }, creationTimeout);
  }
  status() {
    return this._status;
  }
  setStatus(status) {
    this._log(`status ${this._status} => ${status}`);
    this._status = status;
  }
  agentConnected(ws, runId) {
    clearTimeout(this._agentCreationTimeoutId);
    this.setStatus('connected');
    this._ws = ws;
    this.runId = runId;
    for (const worker of this._workersWaitingForAgentConnected) this._sendStartWorkerMessage(worker);
    this._workersWaitingForAgentConnected.clear();
  }
  canCreateWorker(os) {
    return this.os === os && this._workers.size < this._capacity;
  }
  async createWorker(clientSocket, params) {
    if (this._retireTimeoutId) clearTimeout(this._retireTimeoutId);
    if (this._ws) this.setStatus('connected');
    const worker = new GridWorker(clientSocket, params);
    this._log(`create worker: ${worker.workerId}`);
    this._workers.set(worker.workerId, worker);
    worker.on('close', () => {
      this._workers.delete(worker.workerId);
      this._workersWaitingForAgentConnected.delete(worker);
      if (!this._workers.size) {
        this.setStatus('idle');
        if (this._retireTimeoutId) clearTimeout(this._retireTimeoutId);
        if (this._retireTimeout && isFinite(this._retireTimeout)) this._retireTimeoutId = setTimeout(() => this.closeAgent(WSErrors.AGENT_RETIRED), this._retireTimeout);
      }
    });
    if (this._ws) this._sendStartWorkerMessage(worker);else this._workersWaitingForAgentConnected.add(worker);
  }
  workerConnected(workerId, ws) {
    this._log(`worker connected: ${workerId}`);
    const worker = this._workers.get(workerId);
    worker.workerConnected(ws);
  }
  closeAgent(errorCode) {
    var _this$_ws;
    for (const worker of this._workersWaitingForAgentConnected) worker.closeWorker(errorCode);
    for (const worker of this._workers.values()) worker.closeWorker(errorCode);
    this._log('close');
    (_this$_ws = this._ws) === null || _this$_ws === void 0 ? void 0 : _this$_ws.close(errorCode.code, errorCode.reason);
    this.emit('close');
  }
  _sendStartWorkerMessage(worker) {
    const message = JSON.stringify({
      ...worker.params,
      'workerId': worker.workerId
    });
    this._log(`start worker message: ${message}`);
    (0, _utils.assert)(this._ws);
    this._ws.send(message);
  }
}
class GridServer {
  constructor(factory, authToken = '', address = '') {
    this._server = void 0;
    this._wsServer = void 0;
    this._agents = new Map();
    this._log = void 0;
    this._authToken = void 0;
    this._factory = void 0;
    this._pwVersion = void 0;
    this._log = (0, _utilsBundle.debug)(`pw:grid:server`);
    this._log(`using factory ${factory.name}`);
    this._authToken = authToken || '';
    this._server = new _httpServer.HttpServer(address);
    this._factory = factory;
    this._pwVersion = (0, _userAgent.getPlaywrightVersion)(true /* majorMinorOnly */);

    this._server.routePath(this._securePath('/'), (request, response) => {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'text/html');
      response.end(this._state());
      return true;
    });
    this._server.routePath(this._securePath('/stopAll'), (request, response) => {
      for (const agent of this._agents.values()) agent.closeAgent(WSErrors.AGENT_MANUALLY_STOPPED);
      response.statusCode = 302;
      response.setHeader('Location', this._securePath('/'));
      response.end();
      return true;
    });
    this._wsServer = this._server.createWebSocketServer();
    this._wsServer.shouldHandle = request => {
      this._log(request.url);
      if (request.url.startsWith(this._securePath('/claimWorker')) || request.url.startsWith(this._securePath('/registerAgent')) || request.url.startsWith(this._securePath('/registerWorker'))) {
        // shouldHandle claims it accepts promise, except it doesn't.
        return true;
      }
      this._log('rejecting websocket request');
      return false;
    };
    this._wsServer.on('connection', async (ws, request) => {
      var _request$url, _request$url2, _request$url3;
      if ((_request$url = request.url) !== null && _request$url !== void 0 && _request$url.startsWith(this._securePath('/claimWorker'))) {
        var _this$_createAgent;
        const params = new _url.URL('http://localhost/' + request.url).searchParams;
        const version = params.get('pwVersion');
        if (version !== this._pwVersion && !process.env.PWTEST_UNSAFE_GRID_VERSION) {
          this._log(`version mismatch: ${version} !== ${this._pwVersion}`);
          ws.close(WSErrors.CLIENT_PLAYWRIGHT_VERSION_MISMATCH.code, WSErrors.CLIENT_PLAYWRIGHT_VERSION_MISMATCH.reason);
          return;
        }
        const os = params.get('os') || defaultOS;
        const agent = [...this._agents.values()].find(w => w.canCreateWorker(os)) || ((_this$_createAgent = this._createAgent(os)) === null || _this$_createAgent === void 0 ? void 0 : _this$_createAgent.agent);
        if (!agent) {
          this._log(`failed to get agent`);
          ws.close(WSErrors.AGENT_CREATION_FAILED.code, WSErrors.AGENT_CREATION_FAILED.reason);
          return;
        }
        agent.createWorker(ws, {
          browserName: request.headers['x-playwright-browser']
        });
        return;
      }
      if ((_request$url2 = request.url) !== null && _request$url2 !== void 0 && _request$url2.startsWith(this._securePath('/registerAgent'))) {
        const params = new _url.URL('http://localhost/' + request.url).searchParams;
        if (params.get('pwVersion') !== this._pwVersion) {
          ws.close(WSErrors.AGENT_PLAYWRIGHT_VERSION_MISMATCH.code, WSErrors.AGENT_PLAYWRIGHT_VERSION_MISMATCH.reason);
          return;
        }
        const agentId = params.get('agentId');
        const agent = this._agents.get(agentId);
        if (!agent) {
          ws.close(WSErrors.AGENT_NOT_FOUND.code, WSErrors.AGENT_NOT_FOUND.reason);
          return;
        }
        const runId = params.get('runId') || undefined;
        agent.agentConnected(ws, runId);
        return;
      }
      if ((_request$url3 = request.url) !== null && _request$url3 !== void 0 && _request$url3.startsWith(this._securePath('/registerWorker'))) {
        const params = new _url.URL('http://localhost/' + request.url).searchParams;
        const agentId = params.get('agentId');
        const workerId = params.get('workerId');
        const agent = this._agents.get(agentId);
        if (!agent) ws.close(WSErrors.AGENT_NOT_FOUND.code, WSErrors.AGENT_NOT_FOUND.reason);else if (agent.status() !== 'connected') ws.close(WSErrors.AGENT_NOT_CONNECTED.code, WSErrors.AGENT_NOT_CONNECTED.reason);else agent.workerConnected(workerId, ws);
        return;
      }
    });
  }
  async createAgent() {
    const {
      initPromise
    } = this._createAgent(defaultOS);
    return await initPromise;
  }
  _createAgent(os) {
    const agent = new GridAgent(os, this._factory.capacity, this._factory.launchTimeout, this._factory.retireTimeout);
    this._agents.set(agent.agentId, agent);
    agent.on('close', () => {
      this._agents.delete(agent.agentId);
    });
    const initPromise = Promise.resolve().then(() => this._factory.launch({
      agentId: agent.agentId,
      gridURL: this.gridURL(),
      playwrightVersion: (0, _userAgent.getPlaywrightVersion)(),
      os
    })).then(() => {
      this._log('created');
      return {
        error: undefined
      };
    }).catch(error => {
      this._log('failed to launch agent ' + agent.agentId);
      // eslint-disable-next-line no-console
      console.error(error);
      agent.closeAgent(WSErrors.AGENT_CREATION_FAILED);
      return {
        error
      };
    });
    return {
      agent,
      initPromise
    };
  }
  _securePath(suffix) {
    return this._authToken ? '/' + this._authToken + suffix : suffix;
  }
  _state() {
    const linkifyStatus = agent => {
      if (agent.runId && this._factory.statusUrl) return `<a href="${this._factory.statusUrl(agent.runId)}">${agent.status()}</a>`;
      return agent.status();
    };
    return `
        <section style="display: flex; flex-direction: row">
          <div style="display: flex; flex-direction: column; align-items: end; margin-right: 1ex;">
            <span>Grid Playwright Version:</span>
            <span>Agent Factory:</span>
            <span>Agents:</span>
          </div>
          <div style="display: flex; flex-direction: column">
            <span>${this._pwVersion}</span>
            <span>${this._factory.name}</span>
            <span>${this._agents.size} <a href="./stopAll">(Stop All)</a></span>
          </div>
        </section>
        <hr/>
        <ul>
          ${[...this._agents].map(([agentId, agent]) => `
            <li>
              <div>Agent (${agent.os}) <code>${mangle(agentId)}</code>: ${linkifyStatus(agent)}</div>
              <div>Workers: ${agent._workers.size}</div>
              <ul>
                ${[...agent._workers].map(([workerId, worker]) => `
                  <li>worker <code>${mangle(workerId)}</code> - ${JSON.stringify(worker.debugInfo())}</li>
                `).join('')}
              </ul>
            </li>
          `).join('')}
        </ul>
    `;
  }
  async start(port) {
    await this._server.start({
      port
    });
  }
  gridURL() {
    return this._server.urlPrefix() + this._securePath('');
  }
  async stop() {
    for (const agent of this._agents.values()) agent.closeAgent(WSErrors.GRID_SHUTDOWN);
    (0, _utils.assert)(this._agents.size === 0);
    await this._server.stop();
  }
}
exports.GridServer = GridServer;
function mangle(sessionId) {
  return sessionId.replace(/\w{28}/, 'x'.repeat(28));
}