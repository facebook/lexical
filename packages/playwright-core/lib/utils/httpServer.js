"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HttpServer = void 0;

var http = _interopRequireWildcard(require("http"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _ws = require("ws");

var mime = _interopRequireWildcard(require("mime"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Copyright (c) Microsoft Corporation.
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
class HttpServer {
  constructor() {
    this._server = void 0;
    this._urlPrefix = void 0;
    this._port = 0;
    this._routes = [];
    this._activeSockets = new Set();
    this._urlPrefix = '';
    this._server = http.createServer(this._onRequest.bind(this));
  }

  createWebSocketServer() {
    return new _ws.Server({
      server: this._server
    });
  }

  routePrefix(prefix, handler) {
    this._routes.push({
      prefix,
      handler
    });
  }

  routePath(path, handler) {
    this._routes.push({
      exact: path,
      handler
    });
  }

  port() {
    return this._port;
  }

  async start(port) {
    console.assert(!this._urlPrefix, 'server already started');

    this._server.on('connection', socket => {
      this._activeSockets.add(socket);

      socket.once('close', () => this._activeSockets.delete(socket));
    });

    this._server.listen(port);

    await new Promise(cb => this._server.once('listening', cb));

    const address = this._server.address();

    if (typeof address === 'string') {
      this._urlPrefix = address;
    } else {
      (0, _utils.assert)(address, 'Could not bind server socket');
      this._port = address.port;
      this._urlPrefix = `http://127.0.0.1:${address.port}`;
    }

    return this._urlPrefix;
  }

  async stop() {
    for (const socket of this._activeSockets) socket.destroy();

    await new Promise(cb => this._server.close(cb));
  }

  urlPrefix() {
    return this._urlPrefix;
  }

  serveFile(response, absoluteFilePath, headers) {
    try {
      const content = _fs.default.readFileSync(absoluteFilePath);

      response.statusCode = 200;
      const contentType = mime.getType(_path.default.extname(absoluteFilePath)) || 'application/octet-stream';
      response.setHeader('Content-Type', contentType);
      response.setHeader('Content-Length', content.byteLength);

      for (const [name, value] of Object.entries(headers || {})) response.setHeader(name, value);

      response.end(content);
      return true;
    } catch (e) {
      return false;
    }
  }

  async serveVirtualFile(response, vfs, entry, headers) {
    try {
      const content = await vfs.read(entry);
      response.statusCode = 200;
      const contentType = mime.getType(_path.default.extname(entry)) || 'application/octet-stream';
      response.setHeader('Content-Type', contentType);
      response.setHeader('Content-Length', content.byteLength);

      for (const [name, value] of Object.entries(headers || {})) response.setHeader(name, value);

      response.end(content);
      return true;
    } catch (e) {
      return false;
    }
  }

  _onRequest(request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    if (request.headers.origin) response.setHeader('Access-Control-Allow-Headers', request.headers.origin);

    if (request.method === 'OPTIONS') {
      response.writeHead(200);
      response.end();
      return;
    }

    request.on('error', () => response.end());

    try {
      if (!request.url) {
        response.end();
        return;
      }

      const url = new URL('http://localhost' + request.url);

      for (const route of this._routes) {
        if (route.exact && url.pathname === route.exact && route.handler(request, response)) return;
        if (route.prefix && url.pathname.startsWith(route.prefix) && route.handler(request, response)) return;
      }

      response.statusCode = 404;
      response.end();
    } catch (e) {
      response.end();
    }
  }

}

exports.HttpServer = HttpServer;