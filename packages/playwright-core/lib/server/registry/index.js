"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Registry = void 0;
exports.buildPlaywrightCLICommand = buildPlaywrightCLICommand;
exports.findChromiumChannel = findChromiumChannel;
exports.installBrowsersForNpmInstall = installBrowsersForNpmInstall;
exports.installDefaultBrowsersForNpmInstall = installDefaultBrowsersForNpmInstall;
exports.registryDirectory = exports.registry = void 0;
Object.defineProperty(exports, "writeDockerVersion", {
  enumerable: true,
  get: function () {
    return _dependencies.writeDockerVersion;
  }
});

var os = _interopRequireWildcard(require("os"));

var _path = _interopRequireDefault(require("path"));

var util = _interopRequireWildcard(require("util"));

var fs = _interopRequireWildcard(require("fs"));

var _utilsBundle = require("../../utilsBundle");

var _ubuntuVersion = require("../../utils/ubuntuVersion");

var _netUtils = require("../../common/netUtils");

var _userAgent = require("../../common/userAgent");

var _utils = require("../../utils");

var _fileUtils = require("../../utils/fileUtils");

var _hostPlatform = require("../../utils/hostPlatform");

var _spawnAsync = require("../../utils/spawnAsync");

var _dependencies = require("./dependencies");

var _browserFetcher = require("./browserFetcher");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
const PACKAGE_PATH = _path.default.join(__dirname, '..', '..', '..');

const BIN_PATH = _path.default.join(__dirname, '..', '..', '..', 'bin');

const EXECUTABLE_PATHS = {
  'chromium': {
    'linux': ['chrome-linux', 'chrome'],
    'mac': ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
    'win': ['chrome-win', 'chrome.exe']
  },
  'firefox': {
    'linux': ['firefox', 'firefox'],
    'mac': ['firefox', 'Nightly.app', 'Contents', 'MacOS', 'firefox'],
    'win': ['firefox', 'firefox.exe']
  },
  'webkit': {
    'linux': ['pw_run.sh'],
    'mac': ['pw_run.sh'],
    'win': ['Playwright.exe']
  },
  'ffmpeg': {
    'linux': ['ffmpeg-linux'],
    'mac': ['ffmpeg-mac'],
    'win': ['ffmpeg-win64.exe']
  }
};
const DOWNLOAD_PATHS = {
  'chromium': {
    '<unknown>': undefined,
    'generic-linux': 'builds/chromium/%s/chromium-linux.zip',
    'generic-linux-arm64': 'builds/chromium/%s/chromium-linux-arm64.zip',
    'ubuntu18.04': 'builds/chromium/%s/chromium-linux.zip',
    'ubuntu20.04': 'builds/chromium/%s/chromium-linux.zip',
    'ubuntu18.04-arm64': 'builds/chromium/%s/chromium-linux-arm64.zip',
    'ubuntu20.04-arm64': 'builds/chromium/%s/chromium-linux-arm64.zip',
    'mac10.13': 'builds/chromium/%s/chromium-mac.zip',
    'mac10.14': 'builds/chromium/%s/chromium-mac.zip',
    'mac10.15': 'builds/chromium/%s/chromium-mac.zip',
    'mac11': 'builds/chromium/%s/chromium-mac.zip',
    'mac11-arm64': 'builds/chromium/%s/chromium-mac-arm64.zip',
    'mac12': 'builds/chromium/%s/chromium-mac.zip',
    'mac12-arm64': 'builds/chromium/%s/chromium-mac-arm64.zip',
    'win64': 'builds/chromium/%s/chromium-win64.zip'
  },
  'chromium-tip-of-tree': {
    '<unknown>': undefined,
    'generic-linux': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux.zip',
    'generic-linux-arm64': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip',
    'ubuntu18.04': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux.zip',
    'ubuntu20.04': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux.zip',
    'ubuntu18.04-arm64': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip',
    'ubuntu20.04-arm64': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-linux-arm64.zip',
    'mac10.13': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-mac.zip',
    'mac10.14': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-mac.zip',
    'mac10.15': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-mac.zip',
    'mac11': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-mac.zip',
    'mac11-arm64': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-mac-arm64.zip',
    'mac12': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-mac.zip',
    'mac12-arm64': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-mac-arm64.zip',
    'win64': 'builds/chromium-tip-of-tree/%s/chromium-tip-of-tree-win64.zip'
  },
  'chromium-with-symbols': {
    '<unknown>': undefined,
    'generic-linux': 'builds/chromium/%s/chromium-with-symbols-linux.zip',
    'generic-linux-arm64': 'builds/chromium/%s/chromium-with-symbols-linux-arm64.zip',
    'ubuntu18.04': 'builds/chromium/%s/chromium-with-symbols-linux.zip',
    'ubuntu20.04': 'builds/chromium/%s/chromium-with-symbols-linux.zip',
    'ubuntu18.04-arm64': 'builds/chromium/%s/chromium-with-symbols-linux-arm64.zip',
    'ubuntu20.04-arm64': 'builds/chromium/%s/chromium-with-symbols-linux-arm64.zip',
    'mac10.13': 'builds/chromium/%s/chromium-with-symbols-mac.zip',
    'mac10.14': 'builds/chromium/%s/chromium-with-symbols-mac.zip',
    'mac10.15': 'builds/chromium/%s/chromium-with-symbols-mac.zip',
    'mac11': 'builds/chromium/%s/chromium-with-symbols-mac.zip',
    'mac11-arm64': 'builds/chromium/%s/chromium-with-symbols-mac-arm64.zip',
    'mac12': 'builds/chromium/%s/chromium-with-symbols-mac.zip',
    'mac12-arm64': 'builds/chromium/%s/chromium-with-symbols-mac-arm64.zip',
    'win64': 'builds/chromium/%s/chromium-with-symbols-win64.zip'
  },
  'firefox': {
    '<unknown>': undefined,
    'generic-linux': 'builds/firefox/%s/firefox-ubuntu-20.04.zip',
    'generic-linux-arm64': 'builds/firefox/%s/firefox-ubuntu-20.04-arm64.zip',
    'ubuntu18.04': 'builds/firefox/%s/firefox-ubuntu-18.04.zip',
    'ubuntu20.04': 'builds/firefox/%s/firefox-ubuntu-20.04.zip',
    'ubuntu18.04-arm64': undefined,
    'ubuntu20.04-arm64': 'builds/firefox/%s/firefox-ubuntu-20.04-arm64.zip',
    'mac10.13': 'builds/firefox/%s/firefox-mac-11.zip',
    'mac10.14': 'builds/firefox/%s/firefox-mac-11.zip',
    'mac10.15': 'builds/firefox/%s/firefox-mac-11.zip',
    'mac11': 'builds/firefox/%s/firefox-mac-11.zip',
    'mac11-arm64': 'builds/firefox/%s/firefox-mac-11-arm64.zip',
    'mac12': 'builds/firefox/%s/firefox-mac-11.zip',
    'mac12-arm64': 'builds/firefox/%s/firefox-mac-11-arm64.zip',
    'win64': 'builds/firefox/%s/firefox-win64.zip'
  },
  'firefox-beta': {
    '<unknown>': undefined,
    'generic-linux': 'builds/firefox-beta/%s/firefox-beta-ubuntu-20.04.zip',
    'generic-linux-arm64': undefined,
    'ubuntu18.04': 'builds/firefox-beta/%s/firefox-beta-ubuntu-18.04.zip',
    'ubuntu20.04': 'builds/firefox-beta/%s/firefox-beta-ubuntu-20.04.zip',
    'ubuntu18.04-arm64': undefined,
    'ubuntu20.04-arm64': undefined,
    'mac10.13': 'builds/firefox-beta/%s/firefox-beta-mac-11.zip',
    'mac10.14': 'builds/firefox-beta/%s/firefox-beta-mac-11.zip',
    'mac10.15': 'builds/firefox-beta/%s/firefox-beta-mac-11.zip',
    'mac11': 'builds/firefox-beta/%s/firefox-beta-mac-11.zip',
    'mac11-arm64': 'builds/firefox-beta/%s/firefox-beta-mac-11-arm64.zip',
    'mac12': 'builds/firefox-beta/%s/firefox-beta-mac-11.zip',
    'mac12-arm64': 'builds/firefox-beta/%s/firefox-beta-mac-11-arm64.zip',
    'win64': 'builds/firefox-beta/%s/firefox-beta-win64.zip'
  },
  'webkit': {
    '<unknown>': undefined,
    'generic-linux': 'builds/webkit/%s/webkit-ubuntu-20.04.zip',
    'generic-linux-arm64': 'builds/webkit/%s/webkit-ubuntu-20.04-arm64.zip',
    'ubuntu18.04': 'builds/webkit/%s/webkit-ubuntu-18.04.zip',
    'ubuntu20.04': 'builds/webkit/%s/webkit-ubuntu-20.04.zip',
    'ubuntu18.04-arm64': undefined,
    'ubuntu20.04-arm64': 'builds/webkit/%s/webkit-ubuntu-20.04-arm64.zip',
    'mac10.13': undefined,
    'mac10.14': 'builds/deprecated-webkit-mac-10.14/%s/deprecated-webkit-mac-10.14.zip',
    'mac10.15': 'builds/webkit/%s/webkit-mac-10.15.zip',
    'mac11': 'builds/webkit/%s/webkit-mac-11.zip',
    'mac11-arm64': 'builds/webkit/%s/webkit-mac-11-arm64.zip',
    'mac12': 'builds/webkit/%s/webkit-mac-12.zip',
    'mac12-arm64': 'builds/webkit/%s/webkit-mac-12-arm64.zip',
    'win64': 'builds/webkit/%s/webkit-win64.zip'
  },
  'ffmpeg': {
    '<unknown>': undefined,
    'generic-linux': 'builds/ffmpeg/%s/ffmpeg-linux.zip',
    'generic-linux-arm64': 'builds/ffmpeg/%s/ffmpeg-linux-arm64.zip',
    'ubuntu18.04': 'builds/ffmpeg/%s/ffmpeg-linux.zip',
    'ubuntu20.04': 'builds/ffmpeg/%s/ffmpeg-linux.zip',
    'ubuntu18.04-arm64': 'builds/ffmpeg/%s/ffmpeg-linux-arm64.zip',
    'ubuntu20.04-arm64': 'builds/ffmpeg/%s/ffmpeg-linux-arm64.zip',
    'mac10.13': 'builds/ffmpeg/%s/ffmpeg-mac.zip',
    'mac10.14': 'builds/ffmpeg/%s/ffmpeg-mac.zip',
    'mac10.15': 'builds/ffmpeg/%s/ffmpeg-mac.zip',
    'mac11': 'builds/ffmpeg/%s/ffmpeg-mac.zip',
    'mac11-arm64': 'builds/ffmpeg/%s/ffmpeg-mac-arm64.zip',
    'mac12': 'builds/ffmpeg/%s/ffmpeg-mac.zip',
    'mac12-arm64': 'builds/ffmpeg/%s/ffmpeg-mac-arm64.zip',
    'win64': 'builds/ffmpeg/%s/ffmpeg-win64.zip'
  }
};

const registryDirectory = (() => {
  let result;
  const envDefined = (0, _utils.getFromENV)('PLAYWRIGHT_BROWSERS_PATH');

  if (envDefined === '0') {
    result = _path.default.join(__dirname, '..', '..', '..', '.local-browsers');
  } else if (envDefined) {
    result = envDefined;
  } else {
    let cacheDirectory;
    if (process.platform === 'linux') cacheDirectory = process.env.XDG_CACHE_HOME || _path.default.join(os.homedir(), '.cache');else if (process.platform === 'darwin') cacheDirectory = _path.default.join(os.homedir(), 'Library', 'Caches');else if (process.platform === 'win32') cacheDirectory = process.env.LOCALAPPDATA || _path.default.join(os.homedir(), 'AppData', 'Local');else throw new Error('Unsupported platform: ' + process.platform);
    result = _path.default.join(cacheDirectory, 'ms-playwright');
  }

  if (!_path.default.isAbsolute(result)) {
    // It is important to resolve to the absolute path:
    //   - for unzipping to work correctly;
    //   - so that registry directory matches between installation and execution.
    // INIT_CWD points to the root of `npm/yarn install` and is probably what
    // the user meant when typing the relative path.
    result = _path.default.resolve((0, _utils.getFromENV)('INIT_CWD') || process.cwd(), result);
  }

  return result;
})();

exports.registryDirectory = registryDirectory;

function isBrowserDirectory(browserDirectory) {
  const baseName = _path.default.basename(browserDirectory);

  for (const browserName of allDownloadable) {
    if (baseName.startsWith(browserName + '-')) return true;
  }

  return false;
}

function readDescriptors(browsersJSON) {
  return browsersJSON['browsers'].map(obj => {
    const name = obj.name;
    const revisionOverride = (obj.revisionOverrides || {})[_hostPlatform.hostPlatform];
    const revision = revisionOverride || obj.revision;
    const browserDirectoryPrefix = revisionOverride ? `${name}_${_hostPlatform.hostPlatform}_special` : `${name}`;
    const descriptor = {
      name,
      revision,
      // We only put browser version for the supported operating systems.
      browserVersion: revisionOverride ? undefined : obj.browserVersion,
      installByDefault: !!obj.installByDefault,
      // Method `isBrowserDirectory` determines directory to be browser iff
      // it starts with some browser name followed by '-'. Some browser names
      // are prefixes of others, e.g. 'webkit' is a prefix of `webkit-technology-preview`.
      // To avoid older registries erroneously removing 'webkit-technology-preview', we have to
      // ensure that browser folders to never include dashes inside.
      dir: _path.default.join(registryDirectory, browserDirectoryPrefix.replace(/-/g, '_') + '-' + revision)
    };
    return descriptor;
  });
}

const allDownloadable = ['chromium', 'firefox', 'webkit', 'ffmpeg', 'firefox-beta', 'chromium-with-symbols', 'chromium-tip-of-tree'];

class Registry {
  constructor(browsersJSON) {
    this._executables = void 0;
    const descriptors = readDescriptors(browsersJSON);

    const findExecutablePath = (dir, name) => {
      let tokens = undefined;
      if (_hostPlatform.hostPlatform.startsWith('ubuntu') || _hostPlatform.hostPlatform.startsWith('generic-linux')) tokens = EXECUTABLE_PATHS[name]['linux'];else if (_hostPlatform.hostPlatform.startsWith('mac')) tokens = EXECUTABLE_PATHS[name]['mac'];else if (_hostPlatform.hostPlatform.startsWith('win')) tokens = EXECUTABLE_PATHS[name]['win'];
      return tokens ? _path.default.join(dir, ...tokens) : undefined;
    };

    const executablePathOrDie = (name, e, installByDefault, sdkLanguage) => {
      if (!e) throw new Error(`${name} is not supported on ${_hostPlatform.hostPlatform}`);
      const installCommand = buildPlaywrightCLICommand(sdkLanguage, `install${installByDefault ? '' : ' ' + name}`);

      if (!(0, _fileUtils.canAccessFile)(e)) {
        const prettyMessage = [`Looks like ${sdkLanguage === 'javascript' ? 'Playwright Test or ' : ''}Playwright was just installed or updated.`, `Please run the following command to download new browser${installByDefault ? 's' : ''}:`, ``, `    ${installCommand}`, ``, `<3 Playwright Team`].join('\n');
        throw new Error(`Executable doesn't exist at ${e}\n${(0, _utils.wrapInASCIIBox)(prettyMessage, 1)}`);
      }

      return e;
    };

    this._executables = [];
    const chromium = descriptors.find(d => d.name === 'chromium');
    const chromiumExecutable = findExecutablePath(chromium.dir, 'chromium');

    this._executables.push({
      type: 'browser',
      name: 'chromium',
      browserName: 'chromium',
      directory: chromium.dir,
      executablePath: () => chromiumExecutable,
      executablePathOrDie: sdkLanguage => executablePathOrDie('chromium', chromiumExecutable, chromium.installByDefault, sdkLanguage),
      installType: chromium.installByDefault ? 'download-by-default' : 'download-on-demand',
      validateHostRequirements: sdkLanguage => this._validateHostRequirements(sdkLanguage, 'chromium', chromium.dir, ['chrome-linux'], [], ['chrome-win']),
      _install: () => this._downloadExecutable(chromium, chromiumExecutable, DOWNLOAD_PATHS['chromium'][_hostPlatform.hostPlatform], 'PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST'),
      _dependencyGroup: 'chromium',
      _isHermeticInstallation: true
    });

    const chromiumWithSymbols = descriptors.find(d => d.name === 'chromium-with-symbols');
    const chromiumWithSymbolsExecutable = findExecutablePath(chromiumWithSymbols.dir, 'chromium');

    this._executables.push({
      type: 'tool',
      name: 'chromium-with-symbols',
      browserName: 'chromium',
      directory: chromiumWithSymbols.dir,
      executablePath: () => chromiumWithSymbolsExecutable,
      executablePathOrDie: sdkLanguage => executablePathOrDie('chromium-with-symbols', chromiumWithSymbolsExecutable, chromiumWithSymbols.installByDefault, sdkLanguage),
      installType: chromiumWithSymbols.installByDefault ? 'download-by-default' : 'download-on-demand',
      validateHostRequirements: sdkLanguage => this._validateHostRequirements(sdkLanguage, 'chromium', chromiumWithSymbols.dir, ['chrome-linux'], [], ['chrome-win']),
      _install: () => this._downloadExecutable(chromiumWithSymbols, chromiumWithSymbolsExecutable, DOWNLOAD_PATHS['chromium-with-symbols'][_hostPlatform.hostPlatform], 'PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST'),
      _dependencyGroup: 'chromium',
      _isHermeticInstallation: true
    });

    const chromiumTipOfTree = descriptors.find(d => d.name === 'chromium-tip-of-tree');
    const chromiumTipOfTreeExecutable = findExecutablePath(chromiumTipOfTree.dir, 'chromium');

    this._executables.push({
      type: 'tool',
      name: 'chromium-tip-of-tree',
      browserName: 'chromium',
      directory: chromiumTipOfTree.dir,
      executablePath: () => chromiumTipOfTreeExecutable,
      executablePathOrDie: sdkLanguage => executablePathOrDie('chromium-tip-of-tree', chromiumTipOfTreeExecutable, chromiumTipOfTree.installByDefault, sdkLanguage),
      installType: chromiumTipOfTree.installByDefault ? 'download-by-default' : 'download-on-demand',
      validateHostRequirements: sdkLanguage => this._validateHostRequirements(sdkLanguage, 'chromium', chromiumTipOfTree.dir, ['chrome-linux'], [], ['chrome-win']),
      _install: () => this._downloadExecutable(chromiumTipOfTree, chromiumTipOfTreeExecutable, DOWNLOAD_PATHS['chromium-tip-of-tree'][_hostPlatform.hostPlatform], 'PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST'),
      _dependencyGroup: 'chromium',
      _isHermeticInstallation: true
    });

    this._executables.push(this._createChromiumChannel('chrome', {
      'linux': '/opt/google/chrome/chrome',
      'darwin': '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'win32': `\\Google\\Chrome\\Application\\chrome.exe`
    }, () => this._installChromiumChannel('chrome', {
      'linux': 'reinstall_chrome_stable_linux.sh',
      'darwin': 'reinstall_chrome_stable_mac.sh',
      'win32': 'reinstall_chrome_stable_win.ps1'
    })));

    this._executables.push(this._createChromiumChannel('chrome-beta', {
      'linux': '/opt/google/chrome-beta/chrome',
      'darwin': '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
      'win32': `\\Google\\Chrome Beta\\Application\\chrome.exe`
    }, () => this._installChromiumChannel('chrome-beta', {
      'linux': 'reinstall_chrome_beta_linux.sh',
      'darwin': 'reinstall_chrome_beta_mac.sh',
      'win32': 'reinstall_chrome_beta_win.ps1'
    })));

    this._executables.push(this._createChromiumChannel('chrome-dev', {
      'linux': '/opt/google/chrome-unstable/chrome',
      'darwin': '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
      'win32': `\\Google\\Chrome Dev\\Application\\chrome.exe`
    }));

    this._executables.push(this._createChromiumChannel('chrome-canary', {
      'linux': '',
      'darwin': '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      'win32': `\\Google\\Chrome SxS\\Application\\chrome.exe`
    }));

    this._executables.push(this._createChromiumChannel('msedge', {
      'linux': '/opt/microsoft/msedge/msedge',
      'darwin': '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      'win32': `\\Microsoft\\Edge\\Application\\msedge.exe`
    }, () => this._installMSEdgeChannel('msedge', {
      'linux': 'reinstall_msedge_stable_linux.sh',
      'darwin': 'reinstall_msedge_stable_mac.sh',
      'win32': 'reinstall_msedge_stable_win.ps1'
    })));

    this._executables.push(this._createChromiumChannel('msedge-beta', {
      'linux': '/opt/microsoft/msedge-beta/msedge',
      'darwin': '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
      'win32': `\\Microsoft\\Edge Beta\\Application\\msedge.exe`
    }, () => this._installMSEdgeChannel('msedge-beta', {
      'darwin': 'reinstall_msedge_beta_mac.sh',
      'linux': 'reinstall_msedge_beta_linux.sh',
      'win32': 'reinstall_msedge_beta_win.ps1'
    })));

    this._executables.push(this._createChromiumChannel('msedge-dev', {
      'linux': '/opt/microsoft/msedge-dev/msedge',
      'darwin': '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
      'win32': `\\Microsoft\\Edge Dev\\Application\\msedge.exe`
    }, () => this._installMSEdgeChannel('msedge-dev', {
      'darwin': 'reinstall_msedge_dev_mac.sh',
      'linux': 'reinstall_msedge_dev_linux.sh',
      'win32': 'reinstall_msedge_dev_win.ps1'
    })));

    this._executables.push(this._createChromiumChannel('msedge-canary', {
      'linux': '',
      'darwin': '/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary',
      'win32': `\\Microsoft\\Edge SxS\\Application\\msedge.exe`
    }));

    const firefox = descriptors.find(d => d.name === 'firefox');
    const firefoxExecutable = findExecutablePath(firefox.dir, 'firefox');

    this._executables.push({
      type: 'browser',
      name: 'firefox',
      browserName: 'firefox',
      directory: firefox.dir,
      executablePath: () => firefoxExecutable,
      executablePathOrDie: sdkLanguage => executablePathOrDie('firefox', firefoxExecutable, firefox.installByDefault, sdkLanguage),
      installType: firefox.installByDefault ? 'download-by-default' : 'download-on-demand',
      validateHostRequirements: sdkLanguage => this._validateHostRequirements(sdkLanguage, 'firefox', firefox.dir, ['firefox'], [], ['firefox']),
      _install: () => this._downloadExecutable(firefox, firefoxExecutable, DOWNLOAD_PATHS['firefox'][_hostPlatform.hostPlatform], 'PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST'),
      _dependencyGroup: 'firefox',
      _isHermeticInstallation: true
    });

    const firefoxBeta = descriptors.find(d => d.name === 'firefox-beta');
    const firefoxBetaExecutable = findExecutablePath(firefoxBeta.dir, 'firefox');

    this._executables.push({
      type: 'tool',
      name: 'firefox-beta',
      browserName: 'firefox',
      directory: firefoxBeta.dir,
      executablePath: () => firefoxBetaExecutable,
      executablePathOrDie: sdkLanguage => executablePathOrDie('firefox-beta', firefoxBetaExecutable, firefoxBeta.installByDefault, sdkLanguage),
      installType: firefoxBeta.installByDefault ? 'download-by-default' : 'download-on-demand',
      validateHostRequirements: sdkLanguage => this._validateHostRequirements(sdkLanguage, 'firefox', firefoxBeta.dir, ['firefox'], [], ['firefox']),
      _install: () => this._downloadExecutable(firefoxBeta, firefoxBetaExecutable, DOWNLOAD_PATHS['firefox-beta'][_hostPlatform.hostPlatform], 'PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST'),
      _dependencyGroup: 'firefox',
      _isHermeticInstallation: true
    });

    const webkit = descriptors.find(d => d.name === 'webkit');
    const webkitExecutable = findExecutablePath(webkit.dir, 'webkit');
    const webkitLinuxLddDirectories = [_path.default.join('minibrowser-gtk'), _path.default.join('minibrowser-gtk', 'bin'), _path.default.join('minibrowser-gtk', 'lib'), _path.default.join('minibrowser-gtk', 'sys', 'lib'), _path.default.join('minibrowser-wpe'), _path.default.join('minibrowser-wpe', 'bin'), _path.default.join('minibrowser-wpe', 'lib'), _path.default.join('minibrowser-wpe', 'sys', 'lib')];

    this._executables.push({
      type: 'browser',
      name: 'webkit',
      browserName: 'webkit',
      directory: webkit.dir,
      executablePath: () => webkitExecutable,
      executablePathOrDie: sdkLanguage => executablePathOrDie('webkit', webkitExecutable, webkit.installByDefault, sdkLanguage),
      installType: webkit.installByDefault ? 'download-by-default' : 'download-on-demand',
      validateHostRequirements: sdkLanguage => this._validateHostRequirements(sdkLanguage, 'webkit', webkit.dir, webkitLinuxLddDirectories, ['libGLESv2.so.2', 'libx264.so'], ['']),
      _install: () => this._downloadExecutable(webkit, webkitExecutable, DOWNLOAD_PATHS['webkit'][_hostPlatform.hostPlatform], 'PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST'),
      _dependencyGroup: 'webkit',
      _isHermeticInstallation: true
    });

    const ffmpeg = descriptors.find(d => d.name === 'ffmpeg');
    const ffmpegExecutable = findExecutablePath(ffmpeg.dir, 'ffmpeg');

    this._executables.push({
      type: 'tool',
      name: 'ffmpeg',
      browserName: undefined,
      directory: ffmpeg.dir,
      executablePath: () => ffmpegExecutable,
      executablePathOrDie: sdkLanguage => executablePathOrDie('ffmpeg', ffmpegExecutable, ffmpeg.installByDefault, sdkLanguage),
      installType: ffmpeg.installByDefault ? 'download-by-default' : 'download-on-demand',
      validateHostRequirements: () => Promise.resolve(),
      _install: () => this._downloadExecutable(ffmpeg, ffmpegExecutable, DOWNLOAD_PATHS['ffmpeg'][_hostPlatform.hostPlatform], 'PLAYWRIGHT_FFMPEG_DOWNLOAD_HOST'),
      _dependencyGroup: 'tools',
      _isHermeticInstallation: true
    });
  }

  _createChromiumChannel(name, lookAt, install) {
    const executablePath = (sdkLanguage, shouldThrow) => {
      const suffix = lookAt[process.platform];

      if (!suffix) {
        if (shouldThrow) throw new Error(`Chromium distribution '${name}' is not supported on ${process.platform}`);
        return undefined;
      }

      const prefixes = process.platform === 'win32' ? [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(Boolean) : [''];

      for (const prefix of prefixes) {
        const executablePath = _path.default.join(prefix, suffix);

        if ((0, _fileUtils.canAccessFile)(executablePath)) return executablePath;
      }

      if (!shouldThrow) return undefined;
      const location = prefixes.length ? ` at ${_path.default.join(prefixes[0], suffix)}` : ``; // TODO: language-specific error message

      const installation = install ? `\nRun "${buildPlaywrightCLICommand(sdkLanguage, 'install ' + name)}"` : '';
      throw new Error(`Chromium distribution '${name}' is not found${location}${installation}`);
    };

    return {
      type: 'channel',
      name,
      browserName: 'chromium',
      directory: undefined,
      executablePath: sdkLanguage => executablePath(sdkLanguage, false),
      executablePathOrDie: sdkLanguage => executablePath(sdkLanguage, true),
      installType: install ? 'install-script' : 'none',
      validateHostRequirements: () => Promise.resolve(),
      _isHermeticInstallation: false,
      _install: install
    };
  }

  executables() {
    return this._executables;
  }

  findExecutable(name) {
    return this._executables.find(b => b.name === name);
  }

  defaultExecutables() {
    return this._executables.filter(e => e.installType === 'download-by-default');
  }

  _addRequirementsAndDedupe(executables) {
    const set = new Set();

    for (const executable of executables) {
      set.add(executable);
      if (executable.browserName === 'chromium') set.add(this.findExecutable('ffmpeg'));
    }

    return Array.from(set);
  }

  async _validateHostRequirements(sdkLanguage, browserName, browserDirectory, linuxLddDirectories, dlOpenLibraries, windowsExeAndDllDirectories) {
    if ((0, _utils.getAsBooleanFromENV)('PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS')) {
      process.stdout.write('Skipping host requirements validation logic because `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS` env variable is set.\n');
      return;
    }

    const ubuntuVersion = await (0, _ubuntuVersion.getUbuntuVersion)();
    if (browserName === 'firefox' && ubuntuVersion === '16.04') throw new Error(`Cannot launch Firefox on Ubuntu 16.04! Minimum required Ubuntu version for Firefox browser is 18.04`);
    if (os.platform() === 'linux') return await (0, _dependencies.validateDependenciesLinux)(sdkLanguage, linuxLddDirectories.map(d => _path.default.join(browserDirectory, d)), dlOpenLibraries);
    if (os.platform() === 'win32' && os.arch() === 'x64') return await (0, _dependencies.validateDependenciesWindows)(windowsExeAndDllDirectories.map(d => _path.default.join(browserDirectory, d)));
  }

  async installDeps(executablesToInstallDeps, dryRun) {
    const executables = this._addRequirementsAndDedupe(executablesToInstallDeps);

    const targets = new Set();

    for (const executable of executables) {
      if (executable._dependencyGroup) targets.add(executable._dependencyGroup);
    }

    targets.add('tools');
    if (os.platform() === 'win32') return await (0, _dependencies.installDependenciesWindows)(targets, dryRun);
    if (os.platform() === 'linux') return await (0, _dependencies.installDependenciesLinux)(targets, dryRun);
  }

  async install(executablesToInstall, forceReinstall) {
    const executables = this._addRequirementsAndDedupe(executablesToInstall);

    await fs.promises.mkdir(registryDirectory, {
      recursive: true
    });

    const lockfilePath = _path.default.join(registryDirectory, '__dirlock');

    const linksDir = _path.default.join(registryDirectory, '.links');

    let releaseLock;

    try {
      releaseLock = await _utilsBundle.lockfile.lock(registryDirectory, {
        retries: {
          // Retry 20 times during 10 minutes with
          // exponential back-off.
          // See documentation at: https://www.npmjs.com/package/retry#retrytimeoutsoptions
          retries: 20,
          factor: 1.27579
        },
        onCompromised: err => {
          throw new Error(`${err.message} Path: ${lockfilePath}`);
        },
        lockfilePath
      }); // Create a link first, so that cache validation does not remove our own browsers.

      await fs.promises.mkdir(linksDir, {
        recursive: true
      });
      await fs.promises.writeFile(_path.default.join(linksDir, (0, _utils.calculateSha1)(PACKAGE_PATH)), PACKAGE_PATH); // Remove stale browsers.

      await this._validateInstallationCache(linksDir); // Install browsers for this package.

      for (const executable of executables) {
        if (!executable._install) throw new Error(`ERROR: Playwright does not support installing ${executable.name}`);
        const {
          langName
        } = (0, _userAgent.getClientLanguage)();

        if (!(0, _utils.getAsBooleanFromENV)('CI') && !executable._isHermeticInstallation && !forceReinstall && executable.executablePath(langName)) {
          const command = buildPlaywrightCLICommand(langName, 'install --force ' + executable.name);
          throw new Error('\n' + (0, _utils.wrapInASCIIBox)([`ATTENTION: "${executable.name}" is already installed on the system!`, ``, `"${executable.name}" installation is not hermetic; installing newer version`, `requires *removal* of a current installation first.`, ``, `To *uninstall* current version and re-install latest "${executable.name}":`, ``, `- Close all running instances of "${executable.name}", if any`, `- Use "--force" to install browser:`, ``, `    ${command}`, ``, `<3 Playwright Team`].join('\n'), 1));
        }

        await executable._install();
      }
    } catch (e) {
      if (e.code === 'ELOCKED') {
        const rmCommand = process.platform === 'win32' ? 'rm -R' : 'rm -rf';
        throw new Error('\n' + (0, _utils.wrapInASCIIBox)([`An active lockfile is found at:`, ``, `  ${lockfilePath}`, ``, `Either:`, `- wait a few minutes if other Playwright is installing browsers in parallel`, `- remove lock manually with:`, ``, `    ${rmCommand} ${lockfilePath}`, ``, `<3 Playwright Team`].join('\n'), 1));
      } else {
        throw e;
      }
    } finally {
      if (releaseLock) await releaseLock();
    }
  }

  async _downloadExecutable(descriptor, executablePath, downloadPathTemplate, downloadHostEnv) {
    if (!downloadPathTemplate || !executablePath) throw new Error(`ERROR: Playwright does not support ${descriptor.name} on ${_hostPlatform.hostPlatform}`);
    if (_hostPlatform.hostPlatform === 'generic-linux' || _hostPlatform.hostPlatform === 'generic-linux-arm64') (0, _browserFetcher.logPolitely)('BEWARE: your OS is not officially supported by Playwright; downloading Ubuntu build as a fallback.');
    const downloadHost = downloadHostEnv && (0, _utils.getFromENV)(downloadHostEnv) || (0, _utils.getFromENV)('PLAYWRIGHT_DOWNLOAD_HOST') || 'https://playwright.azureedge.net';
    const downloadPath = util.format(downloadPathTemplate, descriptor.revision);
    const downloadURL = `${downloadHost}/${downloadPath}`;
    const displayName = descriptor.name.split('-').map(word => {
      return word === 'ffmpeg' ? 'FFMPEG' : word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
    const title = descriptor.browserVersion ? `${displayName} ${descriptor.browserVersion} (playwright build v${descriptor.revision})` : `${displayName} playwright build v${descriptor.revision}`;
    const downloadFileName = `playwright-download-${descriptor.name}-${_hostPlatform.hostPlatform}-${descriptor.revision}.zip`;
    await (0, _browserFetcher.downloadBrowserWithProgressBar)(title, descriptor.dir, executablePath, downloadURL, downloadFileName).catch(e => {
      throw new Error(`Failed to download ${title}, caused by\n${e.stack}`);
    });
    await fs.promises.writeFile(markerFilePath(descriptor.dir), '');
  }

  async _installMSEdgeChannel(channel, scripts) {
    const scriptArgs = [];

    if (process.platform !== 'linux') {
      const products = JSON.parse(await (0, _netUtils.fetchData)({
        url: 'https://edgeupdates.microsoft.com/api/products'
      }));
      const productName = {
        'msedge': 'Stable',
        'msedge-beta': 'Beta',
        'msedge-dev': 'Dev'
      }[channel];
      const product = products.find(product => product.Product === productName);
      const searchConfig = {
        darwin: {
          platform: 'MacOS',
          arch: 'universal',
          artifact: 'pkg'
        },
        win32: {
          platform: 'Windows',
          arch: 'x64',
          artifact: 'msi'
        }
      }[process.platform];
      const release = searchConfig ? product.Releases.find(release => release.Platform === searchConfig.platform && release.Architecture === searchConfig.arch) : null;
      const artifact = release ? release.Artifacts.find(artifact => artifact.ArtifactName === searchConfig.artifact) : null;
      if (artifact) scriptArgs.push(artifact.Location
      /* url */
      );else throw new Error(`Cannot install ${channel} on ${process.platform}`);
    }

    await this._installChromiumChannel(channel, scripts, scriptArgs);
  }

  async _installChromiumChannel(channel, scripts, scriptArgs = []) {
    const scriptName = scripts[process.platform];
    if (!scriptName) throw new Error(`Cannot install ${channel} on ${process.platform}`);
    const cwd = BIN_PATH;
    const isPowerShell = scriptName.endsWith('.ps1');

    if (isPowerShell) {
      const args = ['-ExecutionPolicy', 'Bypass', '-File', _path.default.join(BIN_PATH, scriptName), ...scriptArgs];
      const {
        code
      } = await (0, _spawnAsync.spawnAsync)('powershell.exe', args, {
        cwd,
        stdio: 'inherit'
      });
      if (code !== 0) throw new Error(`Failed to install ${channel}`);
    } else {
      const {
        command,
        args,
        elevatedPermissions
      } = await (0, _dependencies.transformCommandsForRoot)([`bash "${_path.default.join(BIN_PATH, scriptName)}" ${scriptArgs.join('')}`]);
      if (elevatedPermissions) console.log('Switching to root user to install dependencies...'); // eslint-disable-line no-console

      const {
        code
      } = await (0, _spawnAsync.spawnAsync)(command, args, {
        cwd,
        stdio: 'inherit'
      });
      if (code !== 0) throw new Error(`Failed to install ${channel}`);
    }
  }

  async _validateInstallationCache(linksDir) {
    // 1. Collect used downloads and package descriptors.
    const usedBrowserPaths = new Set();

    for (const fileName of await fs.promises.readdir(linksDir)) {
      const linkPath = _path.default.join(linksDir, fileName);

      let linkTarget = '';

      try {
        linkTarget = (await fs.promises.readFile(linkPath)).toString();

        const browsersJSON = require(_path.default.join(linkTarget, 'browsers.json'));

        const descriptors = readDescriptors(browsersJSON);

        for (const browserName of allDownloadable) {
          // We retain browsers if they are found in the descriptor.
          // Note, however, that there are older versions out in the wild that rely on
          // the "download" field in the browser descriptor and use its value
          // to retain and download browsers.
          // As of v1.10, we decided to abandon "download" field.
          const descriptor = descriptors.find(d => d.name === browserName);
          if (!descriptor) continue;
          const usedBrowserPath = descriptor.dir;
          const browserRevision = parseInt(descriptor.revision, 10); // Old browser installations don't have marker file.

          const shouldHaveMarkerFile = browserName === 'chromium' && browserRevision >= 786218 || browserName === 'firefox' && browserRevision >= 1128 || browserName === 'webkit' && browserRevision >= 1307 || // All new applications have a marker file right away.
          browserName !== 'firefox' && browserName !== 'chromium' && browserName !== 'webkit';
          if (!shouldHaveMarkerFile || (await (0, _fileUtils.existsAsync)(markerFilePath(usedBrowserPath)))) usedBrowserPaths.add(usedBrowserPath);
        }
      } catch (e) {
        await fs.promises.unlink(linkPath).catch(e => {});
      }
    } // 2. Delete all unused browsers.


    if (!(0, _utils.getAsBooleanFromENV)('PLAYWRIGHT_SKIP_BROWSER_GC')) {
      let downloadedBrowsers = (await fs.promises.readdir(registryDirectory)).map(file => _path.default.join(registryDirectory, file));
      downloadedBrowsers = downloadedBrowsers.filter(file => isBrowserDirectory(file));
      const directories = new Set(downloadedBrowsers);

      for (const browserDirectory of usedBrowserPaths) directories.delete(browserDirectory);

      for (const directory of directories) (0, _browserFetcher.logPolitely)('Removing unused browser at ' + directory);

      await (0, _fileUtils.removeFolders)([...directories]);
    }
  }

}

exports.Registry = Registry;

function markerFilePath(browserDirectory) {
  return _path.default.join(browserDirectory, 'INSTALLATION_COMPLETE');
}

function buildPlaywrightCLICommand(sdkLanguage, parameters) {
  switch (sdkLanguage) {
    case 'python':
      return `playwright ${parameters}`;

    case 'java':
      return `mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="${parameters}"`;

    case 'csharp':
      return `pwsh bin\\Debug\\netX\\playwright.ps1 ${parameters}`;

    default:
      return `npx playwright ${parameters}`;
  }
}

async function installDefaultBrowsersForNpmInstall() {
  const defaultBrowserNames = registry.defaultExecutables().map(e => e.name);
  return installBrowsersForNpmInstall(defaultBrowserNames);
}

async function installBrowsersForNpmInstall(browsers) {
  // PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD should have a value of 0 or 1
  if ((0, _utils.getAsBooleanFromENV)('PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD')) {
    (0, _browserFetcher.logPolitely)('Skipping browsers download because `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` env variable is set');
    return false;
  }

  const executables = [];

  for (const browserName of browsers) {
    const executable = registry.findExecutable(browserName);
    if (!executable || executable.installType === 'none') throw new Error(`Cannot install ${browserName}`);
    executables.push(executable);
  }

  await registry.install(executables, false
  /* forceReinstall */
  );
}

function findChromiumChannel(sdkLanguage) {
  // Fall back to the stable channels of popular vendors to work out of the box.
  // Null means no installation and no channels found.
  let channel = null;

  for (const name of ['chromium', 'chrome', 'msedge']) {
    try {
      registry.findExecutable(name).executablePathOrDie(sdkLanguage);
      channel = name === 'chromium' ? undefined : name;
      break;
    } catch (e) {}
  }

  if (channel === null) {
    const installCommand = buildPlaywrightCLICommand(sdkLanguage, `install chromium`);
    const prettyMessage = [`No chromium-based browser found on the system.`, `Please run the following command to download one:`, ``, `    ${installCommand}`, ``, `<3 Playwright Team`].join('\n');
    throw new Error('\n' + (0, _utils.wrapInASCIIBox)(prettyMessage, 1));
  }

  return channel;
}

const registry = new Registry(require('../../../browsers.json'));
exports.registry = registry;