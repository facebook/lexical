"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ElectronApplication = exports.Electron = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _os = _interopRequireDefault(require("os"));

var _path = _interopRequireDefault(require("path"));

var _crBrowser = require("../chromium/crBrowser");

var _crConnection = require("../chromium/crConnection");

var _crExecutionContext = require("../chromium/crExecutionContext");

var js = _interopRequireWildcard(require("../javascript"));

var _timeoutSettings = require("../../common/timeoutSettings");

var _utils = require("../../utils");

var _transport = require("../transport");

var _processLauncher = require("../../utils/processLauncher");

var _browserContext = require("../browserContext");

var _progress = require("../progress");

var _helper = require("../helper");

var _eventsHelper = require("../../utils/eventsHelper");

var readline = _interopRequireWildcard(require("readline"));

var _debugLogger = require("../../common/debugLogger");

var _instrumentation = require("../instrumentation");

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
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const ARTIFACTS_FOLDER = _path.default.join(_os.default.tmpdir(), 'playwright-artifacts-');

class ElectronApplication extends _instrumentation.SdkObject {
  constructor(parent, browser, nodeConnection, process) {
    super(parent, 'electron-app');
    this._browserContext = void 0;
    this._nodeConnection = void 0;
    this._nodeSession = void 0;
    this._nodeExecutionContext = void 0;
    this._nodeElectronHandlePromise = void 0;
    this._timeoutSettings = new _timeoutSettings.TimeoutSettings();
    this._process = void 0;
    this._process = process;
    this._browserContext = browser._defaultContext;

    this._browserContext.on(_browserContext.BrowserContext.Events.Close, () => {
      // Emit application closed after context closed.
      Promise.resolve().then(() => this.emit(ElectronApplication.Events.Close));
    });

    this._nodeConnection = nodeConnection;
    this._nodeSession = nodeConnection.rootSession;
    this._nodeElectronHandlePromise = new Promise(f => {
      this._nodeSession.on('Runtime.executionContextCreated', async event => {
        if (event.context.auxData && event.context.auxData.isDefault) {
          this._nodeExecutionContext = new js.ExecutionContext(this, new _crExecutionContext.CRExecutionContext(this._nodeSession, event.context));
          f(await js.evaluate(this._nodeExecutionContext, false
          /* returnByValue */
          , `process.mainModule.require('electron')`));
        }
      });
    });

    this._browserContext.setCustomCloseHandler(async () => {
      const electronHandle = await this._nodeElectronHandlePromise;
      await electronHandle.evaluate(({
        app
      }) => app.quit());
    });

    this._nodeSession.send('Runtime.enable', {}).catch(e => {});
  }

  process() {
    return this._process;
  }

  context() {
    return this._browserContext;
  }

  async close() {
    const progressController = new _progress.ProgressController((0, _instrumentation.serverSideCallMetadata)(), this);
    const closed = progressController.run(progress => _helper.helper.waitForEvent(progress, this, ElectronApplication.Events.Close).promise);
    await this._browserContext.close((0, _instrumentation.serverSideCallMetadata)());

    this._nodeConnection.close();

    await closed;
  }

  async browserWindow(page) {
    // Assume CRPage as Electron is always Chromium.
    const targetId = page._delegate._targetId;
    const electronHandle = await this._nodeElectronHandlePromise;
    return await electronHandle.evaluateHandle(({
      BrowserWindow,
      webContents
    }, targetId) => {
      const wc = webContents.fromDevToolsTargetId(targetId);
      return BrowserWindow.fromWebContents(wc);
    }, targetId);
  }

}

exports.ElectronApplication = ElectronApplication;
ElectronApplication.Events = {
  Close: 'close'
};

class Electron extends _instrumentation.SdkObject {
  constructor(playwrightOptions) {
    super(playwrightOptions.rootSdkObject, 'electron');
    this._playwrightOptions = void 0;
    this._playwrightOptions = playwrightOptions;
  }

  async launch(options) {
    const {
      args = []
    } = options;
    const controller = new _progress.ProgressController((0, _instrumentation.serverSideCallMetadata)(), this);
    controller.setLogName('browser');
    return controller.run(async progress => {
      let app = undefined;
      const electronArguments = ['--inspect=0', '--remote-debugging-port=0', ...args];

      if (_os.default.platform() === 'linux') {
        const runningAsRoot = process.geteuid && process.geteuid() === 0;
        if (runningAsRoot && electronArguments.indexOf('--no-sandbox') === -1) electronArguments.push('--no-sandbox');
      }

      const artifactsDir = await _fs.default.promises.mkdtemp(ARTIFACTS_FOLDER);
      const browserLogsCollector = new _debugLogger.RecentLogsCollector();
      const env = options.env ? (0, _processLauncher.envArrayToObject)(options.env) : process.env;
      let command;

      if (options.executablePath) {
        command = options.executablePath;
      } else {
        try {
          // By default we fallback to the Electron App executable path.
          // 'electron/index.js' resolves to the actual Electron App.
          command = require('electron/index.js');
        } catch (error) {
          if ((error === null || error === void 0 ? void 0 : error.code) === 'MODULE_NOT_FOUND') {
            throw new Error('\n' + (0, _utils.wrapInASCIIBox)(['Electron executablePath not found!', 'Please install it using `npm install -D electron` or set the executablePath to your Electron executable.'].join('\n'), 1));
          }

          throw error;
        }
      } // When debugging Playwright test that runs Electron, NODE_OPTIONS
      // will make the debugger attach to Electron's Node. But Playwright
      // also needs to attach to drive the automation. Disable external debugging.


      delete env.NODE_OPTIONS;
      const {
        launchedProcess,
        gracefullyClose,
        kill
      } = await (0, _processLauncher.launchProcess)({
        command,
        args: electronArguments,
        env,
        log: message => {
          progress.log(message);
          browserLogsCollector.log(message);
        },
        stdio: 'pipe',
        cwd: options.cwd,
        tempDirectories: [artifactsDir],
        attemptToGracefullyClose: () => app.close(),
        handleSIGINT: true,
        handleSIGTERM: true,
        handleSIGHUP: true,
        onExit: () => {}
      });
      const waitForXserverError = new Promise(async (resolve, reject) => {
        waitForLine(progress, launchedProcess, /Unable to open X display/).then(() => reject(new Error(['Unable to open X display!', `================================`, 'Most likely this is because there is no X server available.', "Use 'xvfb-run' on Linux to launch your tests with an emulated display server.", "For example: 'xvfb-run npm run test:e2e'", `================================`, progress.metadata.log].join('\n')))).catch(() => {});
      });
      const nodeMatch = await waitForLine(progress, launchedProcess, /^Debugger listening on (ws:\/\/.*)$/);
      const nodeTransport = await _transport.WebSocketTransport.connect(progress, nodeMatch[1]);
      const nodeConnection = new _crConnection.CRConnection(nodeTransport, _helper.helper.debugProtocolLogger(), browserLogsCollector); // Immediately release exiting process under debug.

      waitForLine(progress, launchedProcess, /Waiting for the debugger to disconnect\.\.\./).then(() => {
        nodeTransport.close();
      }).catch(() => {});
      const chromeMatch = await Promise.race([waitForLine(progress, launchedProcess, /^DevTools listening on (ws:\/\/.*)$/), waitForXserverError]);
      const chromeTransport = await _transport.WebSocketTransport.connect(progress, chromeMatch[1]);
      const browserProcess = {
        onclose: undefined,
        process: launchedProcess,
        close: gracefullyClose,
        kill
      };
      const contextOptions = { ...options,
        noDefaultViewport: true
      };
      const browserOptions = { ...this._playwrightOptions,
        name: 'electron',
        isChromium: true,
        headful: true,
        persistent: contextOptions,
        browserProcess,
        protocolLogger: _helper.helper.debugProtocolLogger(),
        browserLogsCollector,
        artifactsDir,
        downloadsPath: artifactsDir,
        tracesDir: artifactsDir
      };
      (0, _browserContext.validateBrowserContextOptions)(contextOptions, browserOptions);
      const browser = await _crBrowser.CRBrowser.connect(chromeTransport, browserOptions);
      app = new ElectronApplication(this, browser, nodeConnection, launchedProcess);
      return app;
    }, _timeoutSettings.TimeoutSettings.timeout(options));
  }

}

exports.Electron = Electron;

function waitForLine(progress, process, regex) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stderr
    });
    const failError = new Error('Process failed to launch!');
    const listeners = [_eventsHelper.eventsHelper.addEventListener(rl, 'line', onLine), _eventsHelper.eventsHelper.addEventListener(rl, 'close', reject.bind(null, failError)), _eventsHelper.eventsHelper.addEventListener(process, 'exit', reject.bind(null, failError)), // It is Ok to remove error handler because we did not create process and there is another listener.
    _eventsHelper.eventsHelper.addEventListener(process, 'error', reject.bind(null, failError))];
    progress.cleanupWhenAborted(cleanup);

    function onLine(line) {
      const match = line.match(regex);
      if (!match) return;
      cleanup();
      resolve(match);
    }

    function cleanup() {
      _eventsHelper.eventsHelper.removeEventListeners(listeners);
    }
  });
}