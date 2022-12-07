"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Chromium = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _os = _interopRequireDefault(require("os"));
var _path = _interopRequireDefault(require("path"));
var _crBrowser = require("./crBrowser");
var _processLauncher = require("../../utils/processLauncher");
var _crConnection = require("./crConnection");
var _stackTrace = require("../../utils/stackTrace");
var _browserType = require("../browserType");
var _transport = require("../transport");
var _crDevTools = require("./crDevTools");
var _browser = require("../browser");
var _netUtils = require("../../common/netUtils");
var _userAgent = require("../../common/userAgent");
var _utils = require("../../utils");
var _fileUtils = require("../../utils/fileUtils");
var _debugLogger = require("../../common/debugLogger");
var _progress = require("../progress");
var _timeoutSettings = require("../../common/timeoutSettings");
var _helper = require("../helper");
var _http = _interopRequireDefault(require("http"));
var _https = _interopRequireDefault(require("https"));
var _registry = require("../registry");
var _manualPromise = require("../../utils/manualPromise");
var _browserContext = require("../browserContext");
var _chromiumSwitches = require("./chromiumSwitches");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
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

const ARTIFACTS_FOLDER = _path.default.join(_os.default.tmpdir(), 'playwright-artifacts-');
class Chromium extends _browserType.BrowserType {
  constructor(playwrightOptions) {
    super('chromium', playwrightOptions);
    this._devtools = void 0;
    if ((0, _utils.debugMode)()) this._devtools = this._createDevTools();
  }
  async connectOverCDP(metadata, endpointURL, options, timeout) {
    const controller = new _progress.ProgressController(metadata, this);
    controller.setLogName('browser');
    return controller.run(async progress => {
      return await this._connectOverCDPInternal(progress, endpointURL, options);
    }, _timeoutSettings.TimeoutSettings.timeout({
      timeout
    }));
  }
  async _connectOverCDPInternal(progress, endpointURL, options, onClose) {
    let headersMap;
    if (options.headers) headersMap = (0, _utils.headersArrayToObject)(options.headers, false);
    if (!headersMap) headersMap = {
      'User-Agent': (0, _userAgent.getUserAgent)()
    };else if (headersMap && !Object.keys(headersMap).some(key => key.toLowerCase() === 'user-agent')) headersMap['User-Agent'] = (0, _userAgent.getUserAgent)();
    const artifactsDir = await _fs.default.promises.mkdtemp(ARTIFACTS_FOLDER);
    const wsEndpoint = await urlToWSEndpoint(progress, endpointURL);
    progress.throwIfAborted();
    const chromeTransport = await _transport.WebSocketTransport.connect(progress, wsEndpoint, headersMap);
    const cleanedUp = new _manualPromise.ManualPromise();
    const doCleanup = async () => {
      await (0, _fileUtils.removeFolders)([artifactsDir]);
      await (onClose === null || onClose === void 0 ? void 0 : onClose());
      cleanedUp.resolve();
    };
    const doClose = async () => {
      await chromeTransport.closeAndWait();
      await cleanedUp;
    };
    const browserProcess = {
      close: doClose,
      kill: doClose
    };
    const persistent = {
      noDefaultViewport: true
    };
    const browserOptions = {
      ...this._playwrightOptions,
      slowMo: options.slowMo,
      name: 'chromium',
      isChromium: true,
      persistent,
      browserProcess,
      protocolLogger: _helper.helper.debugProtocolLogger(),
      browserLogsCollector: new _debugLogger.RecentLogsCollector(),
      artifactsDir,
      downloadsPath: artifactsDir,
      tracesDir: artifactsDir,
      // On Windows context level proxies only work, if there isn't a global proxy
      // set. This is currently a bug in the CR/Windows networking stack. By
      // passing an arbitrary value we disable the check in PW land which warns
      // users in normal (launch/launchServer) mode since otherwise connectOverCDP
      // does not work at all with proxies on Windows.
      proxy: {
        server: 'per-context'
      },
      originalLaunchOptions: {}
    };
    (0, _browserContext.validateBrowserContextOptions)(persistent, browserOptions);
    progress.throwIfAborted();
    const browser = await _crBrowser.CRBrowser.connect(chromeTransport, browserOptions);
    browser.on(_browser.Browser.Events.Disconnected, doCleanup);
    return browser;
  }
  _createDevTools() {
    // TODO: this is totally wrong when using channels.
    const directory = _registry.registry.findExecutable('chromium').directory;
    return directory ? new _crDevTools.CRDevTools(_path.default.join(directory, 'devtools-preferences.json')) : undefined;
  }
  async _connectToTransport(transport, options) {
    let devtools = this._devtools;
    if (options.__testHookForDevTools) {
      devtools = this._createDevTools();
      await options.__testHookForDevTools(devtools);
    }
    return _crBrowser.CRBrowser.connect(transport, options, devtools);
  }
  _rewriteStartupError(error) {
    if (error.message.includes('Missing X server')) return (0, _stackTrace.rewriteErrorMessage)(error, '\n' + (0, _utils.wrapInASCIIBox)(_browserType.kNoXServerRunningError, 1));
    // These error messages are taken from Chromium source code as of July, 2020:
    // https://github.com/chromium/chromium/blob/70565f67e79f79e17663ad1337dc6e63ee207ce9/content/browser/zygote_host/zygote_host_impl_linux.cc
    if (!error.message.includes('crbug.com/357670') && !error.message.includes('No usable sandbox!') && !error.message.includes('crbug.com/638180')) return error;
    return (0, _stackTrace.rewriteErrorMessage)(error, [`Chromium sandboxing failed!`, `================================`, `To workaround sandboxing issues, do either of the following:`, `  - (preferred): Configure environment to support sandboxing: https://playwright.dev/docs/troubleshooting`, `  - (alternative): Launch Chromium without sandbox using 'chromiumSandbox: false' option`, `================================`, ``].join('\n'));
  }
  _amendEnvironment(env, userDataDir, executable, browserArguments) {
    return env;
  }
  _attemptToGracefullyCloseBrowser(transport) {
    const message = {
      method: 'Browser.close',
      id: _crConnection.kBrowserCloseMessageId,
      params: {}
    };
    transport.send(message);
  }
  async _launchWithSeleniumHub(progress, hubUrl, options) {
    if (!hubUrl.endsWith('/')) hubUrl = hubUrl + '/';
    const args = this._innerDefaultArgs(options);
    args.push('--remote-debugging-port=0');
    const isEdge = options.channel && options.channel.startsWith('msedge');
    let desiredCapabilities = {
      'browserName': isEdge ? 'MicrosoftEdge' : 'chrome',
      [isEdge ? 'ms:edgeOptions' : 'goog:chromeOptions']: {
        args
      }
    };
    try {
      if (process.env.SELENIUM_REMOTE_CAPABILITIES) {
        const parsed = JSON.parse(process.env.SELENIUM_REMOTE_CAPABILITIES);
        desiredCapabilities = {
          ...desiredCapabilities,
          ...parsed
        };
        progress.log(`<selenium> using additional capabilities "${process.env.SELENIUM_REMOTE_CAPABILITIES}"`);
      }
    } catch (e) {
      progress.log(`<selenium> ignoring additional capabilities "${process.env.SELENIUM_REMOTE_CAPABILITIES}": ${e}`);
    }
    progress.log(`<selenium> connecting to ${hubUrl}`);
    const response = await (0, _netUtils.fetchData)({
      url: hubUrl + 'session',
      method: 'POST',
      data: JSON.stringify({
        desiredCapabilities,
        capabilities: {
          alwaysMatch: desiredCapabilities
        }
      }),
      timeout: progress.timeUntilDeadline()
    }, seleniumErrorHandler);
    const value = JSON.parse(response).value;
    const sessionId = value.sessionId;
    progress.log(`<selenium> connected to sessionId=${sessionId}`);
    const disconnectFromSelenium = async () => {
      progress.log(`<selenium> disconnecting from sessionId=${sessionId}`);
      await (0, _netUtils.fetchData)({
        url: hubUrl + 'session/' + sessionId,
        method: 'DELETE'
      }).catch(error => progress.log(`<error disconnecting from selenium>: ${error}`));
      progress.log(`<selenium> disconnected from sessionId=${sessionId}`);
      _processLauncher.gracefullyCloseSet.delete(disconnectFromSelenium);
    };
    _processLauncher.gracefullyCloseSet.add(disconnectFromSelenium);
    try {
      const capabilities = value.capabilities;
      let endpointURL;
      if (capabilities['se:cdp']) {
        // Selenium 4 - use built-in CDP websocket proxy.
        progress.log(`<selenium> using selenium v4`);
        const endpointURLString = addProtocol(capabilities['se:cdp']);
        endpointURL = new URL(endpointURLString);
        if (endpointURL.hostname === 'localhost' || endpointURL.hostname === '127.0.0.1') endpointURL.hostname = new URL(hubUrl).hostname;
        progress.log(`<selenium> retrieved endpoint ${endpointURL.toString()} for sessionId=${sessionId}`);
      } else {
        // Selenium 3 - resolve target node IP to use instead of localhost ws url.
        progress.log(`<selenium> using selenium v3`);
        const maybeChromeOptions = capabilities['goog:chromeOptions'];
        const chromeOptions = maybeChromeOptions && typeof maybeChromeOptions === 'object' ? maybeChromeOptions : undefined;
        const debuggerAddress = chromeOptions && typeof chromeOptions.debuggerAddress === 'string' ? chromeOptions.debuggerAddress : undefined;
        const chromeOptionsURL = typeof maybeChromeOptions === 'string' ? maybeChromeOptions : undefined;
        // TODO(dgozman): figure out if we can make ChromeDriver to return 127.0.0.1 instead of localhost.
        const endpointURLString = addProtocol(debuggerAddress || chromeOptionsURL).replace('localhost', '127.0.0.1');
        progress.log(`<selenium> retrieved endpoint ${endpointURLString} for sessionId=${sessionId}`);
        endpointURL = new URL(endpointURLString);
        if (endpointURL.hostname === 'localhost' || endpointURL.hostname === '127.0.0.1') {
          const sessionInfoUrl = new URL(hubUrl).origin + '/grid/api/testsession?session=' + sessionId;
          try {
            const sessionResponse = await (0, _netUtils.fetchData)({
              url: sessionInfoUrl,
              method: 'GET',
              timeout: progress.timeUntilDeadline()
            }, seleniumErrorHandler);
            const proxyId = JSON.parse(sessionResponse).proxyId;
            endpointURL.hostname = new URL(proxyId).hostname;
            progress.log(`<selenium> resolved endpoint ip ${endpointURL.toString()} for sessionId=${sessionId}`);
          } catch (e) {
            progress.log(`<selenium> unable to resolve endpoint ip for sessionId=${sessionId}, running in standalone?`);
          }
        }
      }
      return await this._connectOverCDPInternal(progress, endpointURL.toString(), {
        slowMo: options.slowMo
      }, disconnectFromSelenium);
    } catch (e) {
      await disconnectFromSelenium();
      throw e;
    }
  }
  _defaultArgs(options, isPersistent, userDataDir) {
    const chromeArguments = this._innerDefaultArgs(options);
    chromeArguments.push(`--user-data-dir=${userDataDir}`);
    if (options.useWebSocket) chromeArguments.push('--remote-debugging-port=0');else chromeArguments.push('--remote-debugging-pipe');
    if (isPersistent) chromeArguments.push('about:blank');else chromeArguments.push('--no-startup-window');
    return chromeArguments;
  }
  _innerDefaultArgs(options) {
    const {
      args = [],
      proxy
    } = options;
    const userDataDirArg = args.find(arg => arg.startsWith('--user-data-dir'));
    if (userDataDirArg) throw new Error('Pass userDataDir parameter to `browserType.launchPersistentContext(userDataDir, ...)` instead of specifying --user-data-dir argument');
    if (args.find(arg => arg.startsWith('--remote-debugging-pipe'))) throw new Error('Playwright manages remote debugging connection itself.');
    if (args.find(arg => !arg.startsWith('-'))) throw new Error('Arguments can not specify page to be opened');
    const chromeArguments = [..._chromiumSwitches.chromiumSwitches];

    // See https://github.com/microsoft/playwright/issues/7362
    if (_os.default.platform() === 'darwin') chromeArguments.push('--enable-use-zoom-for-dsf=false');
    if (options.devtools) chromeArguments.push('--auto-open-devtools-for-tabs');
    if (options.headless) {
      chromeArguments.push('--headless', '--hide-scrollbars', '--mute-audio', '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4');
    }
    if (options.chromiumSandbox !== true) chromeArguments.push('--no-sandbox');
    if (proxy) {
      const proxyURL = new URL(proxy.server);
      const isSocks = proxyURL.protocol === 'socks5:';
      // https://www.chromium.org/developers/design-documents/network-settings
      if (isSocks && !this._playwrightOptions.socksProxyPort) {
        // https://www.chromium.org/developers/design-documents/network-stack/socks-proxy
        chromeArguments.push(`--host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE ${proxyURL.hostname}"`);
      }
      chromeArguments.push(`--proxy-server=${proxy.server}`);
      const proxyBypassRules = [];
      // https://source.chromium.org/chromium/chromium/src/+/master:net/docs/proxy.md;l=548;drc=71698e610121078e0d1a811054dcf9fd89b49578
      if (this._playwrightOptions.socksProxyPort) proxyBypassRules.push('<-loopback>');
      if (proxy.bypass) proxyBypassRules.push(...proxy.bypass.split(',').map(t => t.trim()).map(t => t.startsWith('.') ? '*' + t : t));
      if (!process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK && !proxyBypassRules.includes('<-loopback>')) proxyBypassRules.push('<-loopback>');
      if (proxyBypassRules.length > 0) chromeArguments.push(`--proxy-bypass-list=${proxyBypassRules.join(';')}`);
    }
    chromeArguments.push(...args);
    return chromeArguments;
  }
}
exports.Chromium = Chromium;
async function urlToWSEndpoint(progress, endpointURL) {
  if (endpointURL.startsWith('ws')) return endpointURL;
  progress.log(`<ws preparing> retrieving websocket url from ${endpointURL}`);
  const httpURL = endpointURL.endsWith('/') ? `${endpointURL}json/version/` : `${endpointURL}/json/version/`;
  const request = endpointURL.startsWith('https') ? _https.default : _http.default;
  const json = await new Promise((resolve, reject) => {
    request.get(httpURL, {
      timeout: _netUtils.NET_DEFAULT_TIMEOUT
    }, resp => {
      if (resp.statusCode < 200 || resp.statusCode >= 400) {
        reject(new Error(`Unexpected status ${resp.statusCode} when connecting to ${httpURL}.\n` + `This does not look like a DevTools server, try connecting via ws://.`));
      }
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(data));
    }).on('error', reject);
  });
  return JSON.parse(json).webSocketDebuggerUrl;
}
async function seleniumErrorHandler(params, response) {
  const body = await (0, _utils.streamToString)(response);
  let message = body;
  try {
    const json = JSON.parse(body);
    message = json.value.localizedMessage || json.value.message;
  } catch (e) {}
  return new Error(`Error connecting to Selenium at ${params.url}: ${message}`);
}
function addProtocol(url) {
  if (!['ws://', 'wss://', 'http://', 'https://'].some(protocol => url.startsWith(protocol))) return 'http://' + url;
  return url;
}