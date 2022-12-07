"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.showTraceViewer = showTraceViewer;
var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var consoleApiSource = _interopRequireWildcard(require("../../../generated/consoleApiSource"));
var _httpServer = require("../../../utils/httpServer");
var _registry = require("../../registry");
var _utils = require("../../../utils");
var _crApp = require("../../chromium/crApp");
var _instrumentation = require("../../instrumentation");
var _playwright = require("../../playwright");
var _progress = require("../../progress");
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

async function showTraceViewer(traceUrls, browserName, headless = false, preferredPort) {
  for (const traceUrl of traceUrls) {
    if (!traceUrl.startsWith('http://') && !traceUrl.startsWith('https://') && !_fs.default.existsSync(traceUrl)) {
      // eslint-disable-next-line no-console
      console.error(`Trace file ${traceUrl} does not exist!`);
      process.exit(1);
    }
  }
  const server = new _httpServer.HttpServer();
  server.routePrefix('/trace', (request, response) => {
    const url = new URL('http://localhost' + request.url);
    const relativePath = url.pathname.slice('/trace'.length);
    if (relativePath.startsWith('/file')) {
      try {
        return server.serveFile(request, response, url.searchParams.get('path'));
      } catch (e) {
        return false;
      }
    }
    const absolutePath = _path.default.join(__dirname, '..', '..', '..', 'webpack', 'traceViewer', ...relativePath.split('/'));
    return server.serveFile(request, response, absolutePath);
  });
  const urlPrefix = await server.start({
    preferredPort
  });
  const traceViewerPlaywright = (0, _playwright.createPlaywright)('javascript', true);
  const traceViewerBrowser = (0, _utils.isUnderTest)() ? 'chromium' : browserName;
  const args = traceViewerBrowser === 'chromium' ? ['--app=data:text/html,', '--window-size=1280,800', '--test-type='] : [];
  if ((0, _utils.isUnderTest)()) args.push(`--remote-debugging-port=0`);
  const context = await traceViewerPlaywright[traceViewerBrowser].launchPersistentContext((0, _instrumentation.serverSideCallMetadata)(), '', {
    // TODO: store language in the trace.
    channel: (0, _registry.findChromiumChannel)(traceViewerPlaywright.options.sdkLanguage),
    args,
    noDefaultViewport: true,
    ignoreDefaultArgs: ['--enable-automation'],
    headless,
    colorScheme: 'no-override',
    useWebSocket: (0, _utils.isUnderTest)()
  });
  const controller = new _progress.ProgressController((0, _instrumentation.serverSideCallMetadata)(), context._browser);
  await controller.run(async progress => {
    await context._browser._defaultContext._loadDefaultContextAsIs(progress);
  });
  await context.extendInjectedScript(consoleApiSource.source);
  const [page] = context.pages();
  if (traceViewerBrowser === 'chromium') await (0, _crApp.installAppIcon)(page);
  await (0, _crApp.syncLocalStorageWithSettings)(page, 'traceviewer');
  const params = traceUrls.map(t => `trace=${t}`);
  if ((0, _utils.isUnderTest)()) {
    params.push('isUnderTest=true');
    page.on('close', () => context.close((0, _instrumentation.serverSideCallMetadata)()).catch(() => {}));
  } else {
    page.on('close', () => process.exit());
  }
  const searchQuery = params.length ? '?' + params.join('&') : '';
  await page.mainFrame().goto((0, _instrumentation.serverSideCallMetadata)(), urlPrefix + `/trace/index.html${searchQuery}`);
  return context;
}