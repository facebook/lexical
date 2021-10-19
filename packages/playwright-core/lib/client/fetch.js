"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FetchResponse = exports.FetchRequest = exports.Fetch = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var mime = _interopRequireWildcard(require("mime"));

var _errors = require("../utils/errors");

var _utils = require("../utils/utils");

var _channelOwner = require("./channelOwner");

var network = _interopRequireWildcard(require("./network"));

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
class Fetch {
  constructor(playwright) {
    this._playwright = void 0;
    this._playwright = playwright;
  }

  async newContext(options = {}) {
    return await this._playwright._wrapApiCall(async channel => {
      const storageState = typeof options.storageState === 'string' ? JSON.parse(await _fs.default.promises.readFile(options.storageState, 'utf8')) : options.storageState;
      return FetchRequest.from((await channel.newRequest({ ...options,
        extraHTTPHeaders: options.extraHTTPHeaders ? (0, _utils.headersObjectToArray)(options.extraHTTPHeaders) : undefined,
        storageState
      })).request);
    });
  }

}

exports.Fetch = Fetch;

class FetchRequest extends _channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
  }

  dispose() {
    return this._wrapApiCall(async channel => {
      await channel.dispose();
    });
  }

  async delete(url, options) {
    return this.fetch(url, { ...options,
      method: 'DELETE'
    });
  }

  async head(url, options) {
    return this.fetch(url, { ...options,
      method: 'HEAD'
    });
  }

  async get(url, options) {
    return this.fetch(url, { ...options,
      method: 'GET'
    });
  }

  async patch(url, options) {
    return this.fetch(url, { ...options,
      method: 'PATCH'
    });
  }

  async post(url, options) {
    return this.fetch(url, { ...options,
      method: 'POST'
    });
  }

  async put(url, options) {
    return this.fetch(url, { ...options,
      method: 'PUT'
    });
  }

  async fetch(urlOrRequest, options = {}) {
    return this._wrapApiCall(async channel => {
      const request = urlOrRequest instanceof network.Request ? urlOrRequest : undefined;
      (0, _utils.assert)(request || typeof urlOrRequest === 'string', 'First argument must be either URL string or Request');
      (0, _utils.assert)((options.data === undefined ? 0 : 1) + (options.form === undefined ? 0 : 1) + (options.multipart === undefined ? 0 : 1) <= 1, `Only one of 'data', 'form' or 'multipart' can be specified`);
      const url = request ? request.url() : urlOrRequest;
      const params = (0, _utils.objectToArray)(options.params);
      const method = options.method || (request === null || request === void 0 ? void 0 : request.method()); // Cannot call allHeaders() here as the request may be paused inside route handler.

      const headersObj = options.headers || (request === null || request === void 0 ? void 0 : request.headers());
      const headers = headersObj ? (0, _utils.headersObjectToArray)(headersObj) : undefined;
      let jsonData;
      let formData;
      let multipartData;
      let postDataBuffer;

      if (options.data !== undefined) {
        if ((0, _utils.isString)(options.data)) postDataBuffer = Buffer.from(options.data, 'utf8');else if (Buffer.isBuffer(options.data)) postDataBuffer = options.data;else if (typeof options.data === 'object') jsonData = options.data;else throw new Error(`Unexpected 'data' type`);
      } else if (options.form) {
        formData = (0, _utils.objectToArray)(options.form);
      } else if (options.multipart) {
        multipartData = []; // Convert file-like values to ServerFilePayload structs.

        for (const [name, value] of Object.entries(options.multipart)) {
          if ((0, _utils.isFilePayload)(value)) {
            const payload = value;
            if (!Buffer.isBuffer(payload.buffer)) throw new Error(`Unexpected buffer type of 'data.${name}'`);
            multipartData.push({
              name,
              file: filePayloadToJson(payload)
            });
          } else if (value instanceof _fs.default.ReadStream) {
            multipartData.push({
              name,
              file: await readStreamToJson(value)
            });
          } else {
            multipartData.push({
              name,
              value: String(value)
            });
          }
        }
      }

      if (postDataBuffer === undefined && jsonData === undefined && formData === undefined && multipartData === undefined) postDataBuffer = (request === null || request === void 0 ? void 0 : request.postDataBuffer()) || undefined;
      const postData = postDataBuffer ? postDataBuffer.toString('base64') : undefined;
      const result = await channel.fetch({
        url,
        params,
        method,
        headers,
        postData,
        jsonData,
        formData,
        multipartData,
        timeout: options.timeout,
        failOnStatusCode: options.failOnStatusCode,
        ignoreHTTPSErrors: options.ignoreHTTPSErrors
      });
      if (result.error) throw new Error(result.error);
      return new FetchResponse(this, result.response);
    });
  }

  async storageState(options = {}) {
    return await this._wrapApiCall(async channel => {
      const state = await channel.storageState();

      if (options.path) {
        await (0, _utils.mkdirIfNeeded)(options.path);
        await _fs.default.promises.writeFile(options.path, JSON.stringify(state, undefined, 2), 'utf8');
      }

      return state;
    });
  }

}

exports.FetchRequest = FetchRequest;

class FetchResponse {
  constructor(context, initializer) {
    this._initializer = void 0;
    this._headers = void 0;
    this._request = void 0;
    this._request = context;
    this._initializer = initializer;
    this._headers = new network.RawHeaders(this._initializer.headers);
  }

  ok() {
    return this._initializer.status === 0 || this._initializer.status >= 200 && this._initializer.status <= 299;
  }

  url() {
    return this._initializer.url;
  }

  status() {
    return this._initializer.status;
  }

  statusText() {
    return this._initializer.statusText;
  }

  headers() {
    return this._headers.headers();
  }

  headersArray() {
    return this._headers.headersArray();
  }

  async body() {
    return this._request._wrapApiCall(async channel => {
      try {
        const result = await channel.fetchResponseBody({
          fetchUid: this._fetchUid()
        });
        if (result.binary === undefined) throw new Error('Response has been disposed');
        return Buffer.from(result.binary, 'base64');
      } catch (e) {
        if (e.message === _errors.kBrowserOrContextClosedError) throw new Error('Response has been disposed');
        throw e;
      }
    });
  }

  async text() {
    const content = await this.body();
    return content.toString('utf8');
  }

  async json() {
    const content = await this.text();
    return JSON.parse(content);
  }

  async dispose() {
    return this._request._wrapApiCall(async channel => {
      await channel.disposeFetchResponse({
        fetchUid: this._fetchUid()
      });
    });
  }

  _fetchUid() {
    return this._initializer.fetchUid;
  }

}

exports.FetchResponse = FetchResponse;

function filePayloadToJson(payload) {
  return {
    name: payload.name,
    mimeType: payload.mimeType,
    buffer: payload.buffer.toString('base64')
  };
}

async function readStreamToJson(stream) {
  const buffer = await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', err => reject(err));
  });
  const streamPath = Buffer.isBuffer(stream.path) ? stream.path.toString('utf8') : stream.path;
  return {
    name: _path.default.basename(streamPath),
    mimeType: mime.getType(streamPath) || 'application/octet-stream',
    buffer: buffer.toString('base64')
  };
}