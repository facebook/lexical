"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserTypeDispatcher = void 0;

var _browserDispatcher = require("./browserDispatcher");

var _dispatcher = require("./dispatcher");

var _browserContextDispatcher = require("./browserContextDispatcher");

var _ws = _interopRequireDefault(require("ws"));

var _jsonPipeDispatcher = require("../dispatchers/jsonPipeDispatcher");

var _utils = require("../utils/utils");

var _async = require("../utils/async");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
class BrowserTypeDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, browserType) {
    super(scope, browserType, 'BrowserType', {
      executablePath: browserType.executablePath(),
      name: browserType.name()
    }, true);
  }

  async launch(params, metadata) {
    const browser = await this._object.launch(metadata, params);
    return {
      browser: new _browserDispatcher.BrowserDispatcher(this._scope, browser)
    };
  }

  async launchPersistentContext(params, metadata) {
    const browserContext = await this._object.launchPersistentContext(metadata, params.userDataDir, params);
    return {
      context: new _browserContextDispatcher.BrowserContextDispatcher(this._scope, browserContext)
    };
  }

  async connectOverCDP(params, metadata) {
    const browser = await this._object.connectOverCDP(metadata, params.endpointURL, params, params.timeout);
    const browserDispatcher = new _browserDispatcher.BrowserDispatcher(this._scope, browser);
    return {
      browser: browserDispatcher,
      defaultContext: browser._defaultContext ? new _browserContextDispatcher.BrowserContextDispatcher(browserDispatcher._scope, browser._defaultContext) : undefined
    };
  }

  async connect(params) {
    const waitForNextTask = params.slowMo ? cb => setTimeout(cb, params.slowMo) : (0, _utils.makeWaitForNextTask)();
    const paramsHeaders = Object.assign({
      'User-Agent': (0, _utils.getUserAgent)()
    }, params.headers || {});
    const ws = new _ws.default(params.wsEndpoint, [], {
      perMessageDeflate: false,
      maxPayload: 256 * 1024 * 1024,
      // 256Mb,
      handshakeTimeout: params.timeout,
      headers: paramsHeaders
    });
    const pipe = new _jsonPipeDispatcher.JsonPipeDispatcher(this._scope);
    const openPromise = new _async.ManualPromise();
    ws.on('open', () => openPromise.resolve({
      pipe
    }));
    ws.on('close', () => pipe.wasClosed());
    ws.on('error', error => {
      if (openPromise.isDone()) {
        pipe.wasClosed(error);
      } else {
        pipe.dispose();
        openPromise.reject(error);
      }
    });
    pipe.on('close', () => ws.close());
    pipe.on('message', message => ws.send(JSON.stringify(message)));
    ws.addEventListener('message', event => {
      waitForNextTask(() => {
        try {
          pipe.dispatch(JSON.parse(event.data));
        } catch (e) {
          ws.close();
        }
      });
    });
    return openPromise;
  }

}

exports.BrowserTypeDispatcher = BrowserTypeDispatcher;