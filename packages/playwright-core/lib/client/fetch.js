"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.APIResponse = exports.APIRequestContext = exports.APIRequest = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var util = _interopRequireWildcard(require("util"));

var _errors = require("../common/errors");

var _utils = require("../utils");

var _fileUtils = require("../utils/fileUtils");

var _channelOwner = require("./channelOwner");

var network = _interopRequireWildcard(require("./network"));

var _clientInstrumentation = require("./clientInstrumentation");

var _tracing = require("./tracing");

let _util$inspect$custom;

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class APIRequest {
  // Instrumentation.
  constructor(playwright) {
    this._playwright = void 0;
    this._contexts = new Set();
    this._onDidCreateContext = void 0;
    this._onWillCloseContext = void 0;
    this._playwright = playwright;
  }

  async newContext(options = {}) {
    var _this$_onDidCreateCon;

    const storageState = typeof options.storageState === 'string' ? JSON.parse(await _fs.default.promises.readFile(options.storageState, 'utf8')) : options.storageState;
    const context = APIRequestContext.from((await this._playwright._channel.newRequest({ ...options,
      extraHTTPHeaders: options.extraHTTPHeaders ? (0, _utils.headersObjectToArray)(options.extraHTTPHeaders) : undefined,
      storageState
    })).request);
    context._tracing._localUtils = this._playwright._utils;

    this._contexts.add(context);

    context._request = this;
    await ((_this$_onDidCreateCon = this._onDidCreateContext) === null || _this$_onDidCreateCon === void 0 ? void 0 : _this$_onDidCreateCon.call(this, context));
    return context;
  }

}

exports.APIRequest = APIRequest;

class APIRequestContext extends _channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer, (0, _clientInstrumentation.createInstrumentation)());
    this._request = void 0;
    this._tracing = void 0;
    this._tracing = _tracing.Tracing.from(initializer.tracing);
  }

  async dispose() {
    var _this$_request, _this$_request$_onWil, _this$_request2;

    await ((_this$_request = this._request) === null || _this$_request === void 0 ? void 0 : (_this$_request$_onWil = _this$_request._onWillCloseContext) === null || _this$_request$_onWil === void 0 ? void 0 : _this$_request$_onWil.call(_this$_request, this));
    await this._channel.dispose();
    (_this$_request2 = this._request) === null || _this$_request2 === void 0 ? void 0 : _this$_request2._contexts.delete(this);
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
    return this._wrapApiCall(async () => {
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
        if ((0, _utils.isString)(options.data)) {
          if (isJsonContentType(headers)) jsonData = options.data;else postDataBuffer = Buffer.from(options.data, 'utf8');
        } else if (Buffer.isBuffer(options.data)) {
          postDataBuffer = options.data;
        } else if (typeof options.data === 'object' || typeof options.data === 'number' || typeof options.data === 'boolean') {
          jsonData = options.data;
        } else {
          throw new Error(`Unexpected 'data' type`);
        }
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
      const result = await this._channel.fetch({
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
      return new APIResponse(this, result.response);
    });
  }

  async storageState(options = {}) {
    const state = await this._channel.storageState();

    if (options.path) {
      await (0, _fileUtils.mkdirIfNeeded)(options.path);
      await _fs.default.promises.writeFile(options.path, JSON.stringify(state, undefined, 2), 'utf8');
    }

    return state;
  }

}

exports.APIRequestContext = APIRequestContext;
_util$inspect$custom = util.inspect.custom;

class APIResponse {
  constructor(context, initializer) {
    this._initializer = void 0;
    this._headers = void 0;
    this._request = void 0;
    this._request = context;
    this._initializer = initializer;
    this._headers = new network.RawHeaders(this._initializer.headers);
  }

  ok() {
    return this._initializer.status >= 200 && this._initializer.status <= 299;
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
    try {
      const result = await this._request._channel.fetchResponseBody({
        fetchUid: this._fetchUid()
      });
      if (result.binary === undefined) throw new Error('Response has been disposed');
      return Buffer.from(result.binary, 'base64');
    } catch (e) {
      if (e.message.includes(_errors.kBrowserOrContextClosedError)) throw new Error('Response has been disposed');
      throw e;
    }
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
    await this._request._channel.disposeAPIResponse({
      fetchUid: this._fetchUid()
    });
  }

  [_util$inspect$custom]() {
    const headers = this.headersArray().map(({
      name,
      value
    }) => `  ${name}: ${value}`);
    return `APIResponse: ${this.status()} ${this.statusText()}\n${headers.join('\n')}`;
  }

  _fetchUid() {
    return this._initializer.fetchUid;
  }

  async _fetchLog() {
    const {
      log
    } = await this._request._channel.fetchLog({
      fetchUid: this._fetchUid()
    });
    return log;
  }

}

exports.APIResponse = APIResponse;

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
    buffer: buffer.toString('base64')
  };
}

function isJsonContentType(headers) {
  if (!headers) return false;

  for (const {
    name,
    value
  } of headers) {
    if (name.toLocaleLowerCase() === 'content-type') return value === 'application/json';
  }

  return false;
}