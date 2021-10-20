"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RecorderApp = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _progress = require("../../progress");

var _events = require("events");

var _instrumentation = require("../../instrumentation");

var _utils = require("../../../utils/utils");

var mime = _interopRequireWildcard(require("mime"));

var _crApp = require("../../chromium/crApp");

var _registry = require("../../../utils/registry");

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
class RecorderApp extends _events.EventEmitter {
  constructor(page, wsEndpoint) {
    super();
    this._page = void 0;
    this.wsEndpoint = void 0;
    this.setMaxListeners(0);
    this._page = page;
    this.wsEndpoint = wsEndpoint;
  }

  async close() {
    await this._page.context().close((0, _instrumentation.internalCallMetadata)());
  }

  async _init() {
    await (0, _crApp.installAppIcon)(this._page);
    await this._page._setServerRequestInterceptor(async route => {
      if (route.request().url().startsWith('https://playwright/')) {
        const uri = route.request().url().substring('https://playwright/'.length);

        const file = require.resolve('../../../webpack/recorder/' + uri);

        const buffer = await _fs.default.promises.readFile(file);
        await route.fulfill({
          status: 200,
          headers: [{
            name: 'Content-Type',
            value: mime.getType(_path.default.extname(file)) || 'application/octet-stream'
          }],
          body: buffer.toString('base64'),
          isBase64: true
        });
        return;
      }

      await route.continue();
    });
    await this._page.exposeBinding('dispatch', false, (_, data) => this.emit('event', data));

    this._page.once('close', () => {
      this.emit('close');

      this._page.context().close((0, _instrumentation.internalCallMetadata)()).catch(e => console.error(e));
    });

    const mainFrame = this._page.mainFrame();

    await mainFrame.goto((0, _instrumentation.internalCallMetadata)(), 'https://playwright/index.html');
  }

  static async open(sdkLanguage) {
    const recorderPlaywright = require('../../playwright').createPlaywright('javascript', true);

    const args = ['--app=data:text/html,', '--window-size=600,600', '--window-position=1280,10'];
    if (process.env.PWTEST_RECORDER_PORT) args.push(`--remote-debugging-port=${process.env.PWTEST_RECORDER_PORT}`);
    const context = await recorderPlaywright.chromium.launchPersistentContext((0, _instrumentation.internalCallMetadata)(), '', {
      channel: (0, _registry.findChromiumChannel)(sdkLanguage),
      args,
      noDefaultViewport: true,
      headless: !!process.env.PWTEST_CLI_HEADLESS || (0, _utils.isUnderTest)() && !process.env.HEADFUL,
      useWebSocket: !!process.env.PWTEST_RECORDER_PORT
    });
    const controller = new _progress.ProgressController((0, _instrumentation.internalCallMetadata)(), context._browser);
    await controller.run(async progress => {
      await context._browser._defaultContext._loadDefaultContextAsIs(progress);
    });
    const [page] = context.pages();
    const result = new RecorderApp(page, context._browser.options.wsEndpoint);
    await result._init();
    return result;
  }

  async setMode(mode) {
    await this._page.mainFrame().evaluateExpression((mode => {
      window.playwrightSetMode(mode);
    }).toString(), true, mode, 'main').catch(() => {});
  }

  async setFile(file) {
    await this._page.mainFrame().evaluateExpression((file => {
      window.playwrightSetFile(file);
    }).toString(), true, file, 'main').catch(() => {});
  }

  async setPaused(paused) {
    await this._page.mainFrame().evaluateExpression((paused => {
      window.playwrightSetPaused(paused);
    }).toString(), true, paused, 'main').catch(() => {});
  }

  async setSources(sources) {
    await this._page.mainFrame().evaluateExpression((sources => {
      window.playwrightSetSources(sources);
    }).toString(), true, sources, 'main').catch(() => {}); // Testing harness for runCLI mode.

    {
      if (process.env.PWTEST_CLI_EXIT && sources.length) {
        process.stdout.write('\n-------------8<-------------\n');
        process.stdout.write(sources[0].text);
        process.stdout.write('\n-------------8<-------------\n');
      }
    }
  }

  async setSelector(selector, focus) {
    await this._page.mainFrame().evaluateExpression((arg => {
      window.playwrightSetSelector(arg.selector, arg.focus);
    }).toString(), true, {
      selector,
      focus
    }, 'main').catch(() => {});
  }

  async updateCallLogs(callLogs) {
    await this._page.mainFrame().evaluateExpression((callLogs => {
      window.playwrightUpdateLogs(callLogs);
    }).toString(), true, callLogs, 'main').catch(() => {});
  }

  async bringToFront() {
    await this._page.bringToFront();
  }

}

exports.RecorderApp = RecorderApp;