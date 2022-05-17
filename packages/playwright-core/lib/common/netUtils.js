"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createSocket = createSocket;
exports.fetchData = fetchData;
exports.httpRequest = httpRequest;

var _http = _interopRequireDefault(require("http"));

var _https = _interopRequireDefault(require("https"));

var _net = _interopRequireDefault(require("net"));

var _utilsBundle = require("../utilsBundle");

var URL = _interopRequireWildcard(require("url"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
async function createSocket(host, port) {
  return new Promise((resolve, reject) => {
    const socket = _net.default.createConnection({
      host,
      port
    });

    socket.on('connect', () => resolve(socket));
    socket.on('error', error => reject(error));
  });
}

function httpRequest(params, onResponse, onError) {
  const parsedUrl = URL.parse(params.url);
  let options = { ...parsedUrl
  };
  options.method = params.method || 'GET';
  options.headers = params.headers;
  const proxyURL = (0, _utilsBundle.getProxyForUrl)(params.url);

  if (proxyURL) {
    if (params.url.startsWith('http:')) {
      const proxy = URL.parse(proxyURL);
      options = {
        path: parsedUrl.href,
        host: proxy.hostname,
        port: proxy.port
      };
    } else {
      const parsedProxyURL = URL.parse(proxyURL);
      parsedProxyURL.secureProxy = parsedProxyURL.protocol === 'https:';
      options.agent = new _utilsBundle.HttpsProxyAgent(parsedProxyURL);
      options.rejectUnauthorized = false;
    }
  }

  const requestCallback = res => {
    const statusCode = res.statusCode || 0;
    if (statusCode >= 300 && statusCode < 400 && res.headers.location) httpRequest({ ...params,
      url: res.headers.location
    }, onResponse, onError);else onResponse(res);
  };

  const request = options.protocol === 'https:' ? _https.default.request(options, requestCallback) : _http.default.request(options, requestCallback);
  request.on('error', onError);

  if (params.timeout !== undefined) {
    const rejectOnTimeout = () => {
      onError(new Error(`Request to ${params.url} timed out after ${params.timeout}ms`));
      request.abort();
    };

    if (params.timeout <= 0) {
      rejectOnTimeout();
      return;
    }

    request.setTimeout(params.timeout, rejectOnTimeout);
  }

  request.end(params.data);
}

function fetchData(params, onError) {
  return new Promise((resolve, reject) => {
    httpRequest(params, async response => {
      if (response.statusCode !== 200) {
        const error = onError ? await onError(params, response) : new Error(`fetch failed: server returned code ${response.statusCode}. URL: ${params.url}`);
        reject(error);
        return;
      }

      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('error', error => reject(error));
      response.on('end', () => resolve(body));
    }, reject);
  });
}