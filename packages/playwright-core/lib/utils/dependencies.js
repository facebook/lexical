"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.installDependenciesWindows = installDependenciesWindows;
exports.installDependenciesLinux = installDependenciesLinux;
exports.validateDependenciesWindows = validateDependenciesWindows;
exports.validateDependenciesLinux = validateDependenciesLinux;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var os = _interopRequireWildcard(require("os"));

var _child_process = _interopRequireDefault(require("child_process"));

var _ubuntuVersion = require("./ubuntuVersion");

var utils = _interopRequireWildcard(require("./utils"));

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
const BIN_DIRECTORY = _path.default.join(__dirname, '..', '..', 'bin');

const checkExecutable = filePath => _fs.default.promises.access(filePath, _fs.default.constants.X_OK).then(() => true).catch(e => false);

function isSupportedWindowsVersion() {
  if (os.platform() !== 'win32' || os.arch() !== 'x64') return false;
  const [major, minor] = os.release().split('.').map(token => parseInt(token, 10)); // This is based on: https://stackoverflow.com/questions/42524606/how-to-get-windows-version-using-node-js/44916050#44916050
  // The table with versions is taken from: https://docs.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-osversioninfoexw#remarks
  // Windows 7 is not supported and is encoded as `6.1`.

  return major > 6 || major === 6 && minor > 1;
}

async function installDependenciesWindows(targets) {
  if (targets.has('chromium')) {
    const {
      code
    } = await utils.spawnAsync('powershell.exe', ['-File', _path.default.join(BIN_DIRECTORY, 'install_media_pack.ps1')], {
      cwd: BIN_DIRECTORY,
      stdio: 'inherit'
    });
    if (code !== 0) throw new Error('Failed to install windows dependencies!');
  }
}

async function installDependenciesLinux(targets) {
  const ubuntuVersion = await (0, _ubuntuVersion.getUbuntuVersion)();

  if (ubuntuVersion !== '18.04' && ubuntuVersion !== '20.04' && ubuntuVersion !== '21.04') {
    console.warn('Cannot install dependencies for this linux distribution!'); // eslint-disable-line no-console

    return;
  }

  const libraries = [];

  const {
    deps
  } = require('../nativeDeps');

  for (const target of targets) {
    if (ubuntuVersion === '18.04') libraries.push(...deps['bionic'][target]);else if (ubuntuVersion === '20.04') libraries.push(...deps['focal'][target]);else if (ubuntuVersion === '21.04') libraries.push(...deps['hirsute'][target]);
  }

  const uniqueLibraries = Array.from(new Set(libraries));
  console.log('Installing Ubuntu dependencies...'); // eslint-disable-line no-console

  const commands = [];
  commands.push('apt-get update');
  commands.push(['apt-get', 'install', '-y', '--no-install-recommends', ...uniqueLibraries].join(' '));
  const [command, args] = await buildAptProcessArgs(commands);

  const child = _child_process.default.spawn(command, args, {
    stdio: 'inherit'
  });

  await new Promise((resolve, reject) => {
    child.on('exit', resolve);
    child.on('error', reject);
  });
}

async function buildAptProcessArgs(commands) {
  const isRoot = process.getuid() === 0;
  if (isRoot) return ['sh', ['-c', `${commands.join('&& ')}`]];
  const sudoExists = await utils.spawnAsync('which', ['sudo']);
  if (sudoExists.code === 0) return ['sudo', ['--', 'sh', '-c', `${commands.join('&& ')}`]];
  return ['su', ['root', '-c', `${commands.join('&& ')}`]];
}

async function validateDependenciesWindows(windowsExeAndDllDirectories) {
  const directoryPaths = windowsExeAndDllDirectories;
  const lddPaths = [];

  for (const directoryPath of directoryPaths) lddPaths.push(...(await executablesOrSharedLibraries(directoryPath)));

  const allMissingDeps = await Promise.all(lddPaths.map(lddPath => missingFileDependenciesWindows(lddPath)));
  const missingDeps = new Set();

  for (const deps of allMissingDeps) {
    for (const dep of deps) missingDeps.add(dep);
  }

  if (!missingDeps.size) return;
  let isCrtMissing = false;
  let isMediaFoundationMissing = false;

  for (const dep of missingDeps) {
    if (dep.startsWith('api-ms-win-crt') || dep === 'vcruntime140.dll' || dep === 'vcruntime140_1.dll' || dep === 'msvcp140.dll') isCrtMissing = true;else if (dep === 'mf.dll' || dep === 'mfplat.dll' || dep === 'msmpeg2vdec.dll' || dep === 'evr.dll' || dep === 'avrt.dll') isMediaFoundationMissing = true;
  }

  const details = [];

  if (isCrtMissing) {
    details.push(`Some of the Universal C Runtime files cannot be found on the system. You can fix`, `that by installing Microsoft Visual C++ Redistributable for Visual Studio from:`, `https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads`, ``);
  }

  if (isMediaFoundationMissing) {
    details.push(`Some of the Media Foundation files cannot be found on the system. If you are`, `on Windows Server try fixing this by running the following command in PowerShell`, `as Administrator:`, ``, `    Install-WindowsFeature Server-Media-Foundation`, ``, `For Windows N editions visit:`, `https://support.microsoft.com/en-us/help/3145500/media-feature-pack-list-for-windows-n-editions`, ``);
  }

  details.push(`Full list of missing libraries:`, `    ${[...missingDeps].join('\n    ')}`, ``);
  const message = `Host system is missing dependencies!\n\n${details.join('\n')}`;

  if (isSupportedWindowsVersion()) {
    throw new Error(message);
  } else {
    console.warn(`WARNING: running on unsupported windows version!`);
    console.warn(message);
  }
}

async function validateDependenciesLinux(linuxLddDirectories, dlOpenLibraries) {
  const directoryPaths = linuxLddDirectories;
  const lddPaths = [];

  for (const directoryPath of directoryPaths) lddPaths.push(...(await executablesOrSharedLibraries(directoryPath)));

  const allMissingDeps = await Promise.all(lddPaths.map(lddPath => missingFileDependencies(lddPath, directoryPaths)));
  const missingDeps = new Set();

  for (const deps of allMissingDeps) {
    for (const dep of deps) missingDeps.add(dep);
  }

  for (const dep of await missingDLOPENLibraries(dlOpenLibraries)) missingDeps.add(dep);

  if (!missingDeps.size) return; // Check Ubuntu version.

  const missingPackages = new Set();
  const ubuntuVersion = await (0, _ubuntuVersion.getUbuntuVersion)();
  let libraryToPackageNameMapping = null;
  if (ubuntuVersion === '18.04') libraryToPackageNameMapping = LIBRARY_TO_PACKAGE_NAME_UBUNTU_18_04;else if (ubuntuVersion === '20.04') libraryToPackageNameMapping = LIBRARY_TO_PACKAGE_NAME_UBUNTU_20_04;else if (ubuntuVersion === '21.04') libraryToPackageNameMapping = LIBRARY_TO_PACKAGE_NAME_UBUNTU_21_04;
  libraryToPackageNameMapping = Object.assign({}, libraryToPackageNameMapping, MANUAL_LIBRARY_TO_PACKAGE_NAME_UBUNTU);

  if (libraryToPackageNameMapping) {
    // Translate missing dependencies to package names to install with apt.
    for (const missingDep of missingDeps) {
      const packageName = libraryToPackageNameMapping[missingDep];

      if (packageName) {
        missingPackages.add(packageName);
        missingDeps.delete(missingDep);
      }
    }
  }

  const maybeSudo = process.getuid() !== 0 && os.platform() !== 'win32' ? 'sudo ' : ''; // Happy path: known dependencies are missing for browsers.
  // Suggest installation with a Playwright CLI.

  if (missingPackages.size && !missingDeps.size) {
    throw new Error('\n' + utils.wrapInASCIIBox([`Host system is missing a few dependencies to run browsers.`, `Please install them with the following command:`, ``, `    ${maybeSudo}npx playwright install-deps`, ``, `<3 Playwright Team`].join('\n'), 1));
  } // Unhappy path - unusual distribution configuration.


  let missingPackagesMessage = '';

  if (missingPackages.size) {
    missingPackagesMessage = [`  Install missing packages with:`, `      ${maybeSudo}apt-get install ${[...missingPackages].join('\\\n          ')}`, ``, ``].join('\n');
  }

  let missingDependenciesMessage = '';

  if (missingDeps.size) {
    const header = missingPackages.size ? `Missing libraries we didn't find packages for:` : `Missing libraries are:`;
    missingDependenciesMessage = [`  ${header}`, `      ${[...missingDeps].join('\n      ')}`, ``].join('\n');
  }

  throw new Error('Host system is missing dependencies!\n\n' + missingPackagesMessage + missingDependenciesMessage);
}

function isSharedLib(basename) {
  switch (os.platform()) {
    case 'linux':
      return basename.endsWith('.so') || basename.includes('.so.');

    case 'win32':
      return basename.endsWith('.dll');

    default:
      return false;
  }
}

async function executablesOrSharedLibraries(directoryPath) {
  const allPaths = (await _fs.default.promises.readdir(directoryPath)).map(file => _path.default.resolve(directoryPath, file));
  const allStats = await Promise.all(allPaths.map(aPath => _fs.default.promises.stat(aPath)));
  const filePaths = allPaths.filter((aPath, index) => allStats[index].isFile());
  const executablersOrLibraries = (await Promise.all(filePaths.map(async filePath => {
    const basename = _path.default.basename(filePath).toLowerCase();

    if (isSharedLib(basename)) return filePath;
    if (await checkExecutable(filePath)) return filePath;
    return false;
  }))).filter(Boolean);
  return executablersOrLibraries;
}

async function missingFileDependenciesWindows(filePath) {
  const executable = _path.default.join(__dirname, '..', '..', 'bin', 'PrintDeps.exe');

  const dirname = _path.default.dirname(filePath);

  const {
    stdout,
    code
  } = await utils.spawnAsync(executable, [filePath], {
    cwd: dirname,
    env: { ...process.env,
      LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH ? `${process.env.LD_LIBRARY_PATH}:${dirname}` : dirname
    }
  });
  if (code !== 0) return [];
  const missingDeps = stdout.split('\n').map(line => line.trim()).filter(line => line.endsWith('not found') && line.includes('=>')).map(line => line.split('=>')[0].trim().toLowerCase());
  return missingDeps;
}

async function missingFileDependencies(filePath, extraLDPaths) {
  const dirname = _path.default.dirname(filePath);

  let LD_LIBRARY_PATH = extraLDPaths.join(':');
  if (process.env.LD_LIBRARY_PATH) LD_LIBRARY_PATH = `${process.env.LD_LIBRARY_PATH}:${LD_LIBRARY_PATH}`;
  const {
    stdout,
    code
  } = await utils.spawnAsync('ldd', [filePath], {
    cwd: dirname,
    env: { ...process.env,
      LD_LIBRARY_PATH
    }
  });
  if (code !== 0) return [];
  const missingDeps = stdout.split('\n').map(line => line.trim()).filter(line => line.endsWith('not found') && line.includes('=>')).map(line => line.split('=>')[0].trim());
  return missingDeps;
}

async function missingDLOPENLibraries(libraries) {
  if (!libraries.length) return []; // NOTE: Using full-qualified path to `ldconfig` since `/sbin` is not part of the
  // default PATH in CRON.
  // @see https://github.com/microsoft/playwright/issues/3397

  const {
    stdout,
    code,
    error
  } = await utils.spawnAsync('/sbin/ldconfig', ['-p'], {});
  if (code !== 0 || error) return [];

  const isLibraryAvailable = library => stdout.toLowerCase().includes(library.toLowerCase());

  return libraries.filter(library => !isLibraryAvailable(library));
} // This list is generted with the following program:
// ./utils/linux-browser-dependencies/run.sh ubuntu:18.04


const LIBRARY_TO_PACKAGE_NAME_UBUNTU_18_04 = {
  'libasound.so.2': 'libasound2',
  'libatk-1.0.so.0': 'libatk1.0-0',
  'libatk-bridge-2.0.so.0': 'libatk-bridge2.0-0',
  'libatspi.so.0': 'libatspi2.0-0',
  'libbrotlidec.so.1': 'libbrotli1',
  'libcairo-gobject.so.2': 'libcairo-gobject2',
  'libcairo.so.2': 'libcairo2',
  'libcups.so.2': 'libcups2',
  'libdbus-1.so.3': 'libdbus-1-3',
  'libdbus-glib-1.so.2': 'libdbus-glib-1-2',
  'libdrm.so.2': 'libdrm2',
  'libEGL.so.1': 'libegl1',
  'libenchant.so.1': 'libenchant1c2a',
  'libepoxy.so.0': 'libepoxy0',
  'libevent-2.1.so.6': 'libevent-2.1-6',
  'libevdev.so.2': 'libevdev2',
  'libfontconfig.so.1': 'libfontconfig1',
  'libfreetype.so.6': 'libfreetype6',
  'libgbm.so.1': 'libgbm1',
  'libgdk_pixbuf-2.0.so.0': 'libgdk-pixbuf2.0-0',
  'libgdk-3.so.0': 'libgtk-3-0',
  'libgdk-x11-2.0.so.0': 'libgtk2.0-0',
  'libgio-2.0.so.0': 'libglib2.0-0',
  'libGL.so.1': 'libgl1',
  'libGLESv2.so.2': 'libgles2',
  'libglib-2.0.so.0': 'libglib2.0-0',
  'libgmodule-2.0.so.0': 'libglib2.0-0',
  'libgobject-2.0.so.0': 'libglib2.0-0',
  'libgstapp-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstaudio-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstbase-1.0.so.0': 'libgstreamer1.0-0',
  'libgstcodecparsers-1.0.so.0': 'gstreamer1.0-plugins-bad',
  'libgstfft-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstgl-1.0.so.0': 'libgstreamer-gl1.0-0',
  'libgstpbutils-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstreamer-1.0.so.0': 'libgstreamer1.0-0',
  'libgsttag-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstvideo-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgthread-2.0.so.0': 'libglib2.0-0',
  'libgtk-3.so.0': 'libgtk-3-0',
  'libgtk-x11-2.0.so.0': 'libgtk2.0-0',
  'libharfbuzz-icu.so.0': 'libharfbuzz-icu0',
  'libharfbuzz.so.0': 'libharfbuzz0b',
  'libhyphen.so.0': 'libhyphen0',
  'libicudata.so.60': 'libicu60',
  'libicui18n.so.60': 'libicu60',
  'libicuuc.so.60': 'libicu60',
  'libjpeg.so.8': 'libjpeg-turbo8',
  'libnotify.so.4': 'libnotify4',
  'libnspr4.so': 'libnspr4',
  'libnss3.so': 'libnss3',
  'libnssutil3.so': 'libnss3',
  'libopenjp2.so.7': 'libopenjp2-7',
  'libopus.so.0': 'libopus0',
  'libpango-1.0.so.0': 'libpango-1.0-0',
  'libpangocairo-1.0.so.0': 'libpangocairo-1.0-0',
  'libpangoft2-1.0.so.0': 'libpangoft2-1.0-0',
  'libpng16.so.16': 'libpng16-16',
  'libsecret-1.so.0': 'libsecret-1-0',
  'libsmime3.so': 'libnss3',
  'libvpx.so.5': 'libvpx5',
  'libwayland-client.so.0': 'libwayland-client0',
  'libwayland-egl.so.1': 'libwayland-egl1',
  'libwayland-server.so.0': 'libwayland-server0',
  'libwebp.so.6': 'libwebp6',
  'libwebpdemux.so.2': 'libwebpdemux2',
  'libwoff2dec.so.1.0.2': 'libwoff1',
  'libX11-xcb.so.1': 'libx11-xcb1',
  'libX11.so.6': 'libx11-6',
  'libxcb-dri3.so.0': 'libxcb-dri3-0',
  'libxcb-shm.so.0': 'libxcb-shm0',
  'libxcb.so.1': 'libxcb1',
  'libXcomposite.so.1': 'libxcomposite1',
  'libXcursor.so.1': 'libxcursor1',
  'libXdamage.so.1': 'libxdamage1',
  'libXext.so.6': 'libxext6',
  'libXfixes.so.3': 'libxfixes3',
  'libXi.so.6': 'libxi6',
  'libxkbcommon.so.0': 'libxkbcommon0',
  'libxml2.so.2': 'libxml2',
  'libXrandr.so.2': 'libxrandr2',
  'libXrender.so.1': 'libxrender1',
  'libxslt.so.1': 'libxslt1.1',
  'libXt.so.6': 'libxt6',
  'libXtst.so.6': 'libxtst6'
}; // This list is generted with the following program:
// ./utils/linux-browser-dependencies/run.sh ubuntu:20.04

const LIBRARY_TO_PACKAGE_NAME_UBUNTU_20_04 = {
  'libasound.so.2': 'libasound2',
  'libatk-1.0.so.0': 'libatk1.0-0',
  'libatk-bridge-2.0.so.0': 'libatk-bridge2.0-0',
  'libatspi.so.0': 'libatspi2.0-0',
  'libcairo-gobject.so.2': 'libcairo-gobject2',
  'libcairo.so.2': 'libcairo2',
  'libcups.so.2': 'libcups2',
  'libdbus-1.so.3': 'libdbus-1-3',
  'libdbus-glib-1.so.2': 'libdbus-glib-1-2',
  'libdrm.so.2': 'libdrm2',
  'libEGL.so.1': 'libegl1',
  'libenchant.so.1': 'libenchant1c2a',
  'libevdev.so.2': 'libevdev2',
  'libepoxy.so.0': 'libepoxy0',
  'libfontconfig.so.1': 'libfontconfig1',
  'libfreetype.so.6': 'libfreetype6',
  'libgbm.so.1': 'libgbm1',
  'libgdk_pixbuf-2.0.so.0': 'libgdk-pixbuf2.0-0',
  'libgdk-3.so.0': 'libgtk-3-0',
  'libgdk-x11-2.0.so.0': 'libgtk2.0-0',
  'libgio-2.0.so.0': 'libglib2.0-0',
  'libGL.so.1': 'libgl1',
  'libGLESv2.so.2': 'libgles2',
  'libglib-2.0.so.0': 'libglib2.0-0',
  'libgmodule-2.0.so.0': 'libglib2.0-0',
  'libgobject-2.0.so.0': 'libglib2.0-0',
  'libgstapp-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstaudio-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstbase-1.0.so.0': 'libgstreamer1.0-0',
  'libgstcodecparsers-1.0.so.0': 'gstreamer1.0-plugins-bad',
  'libgstfft-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstgl-1.0.so.0': 'libgstreamer-gl1.0-0',
  'libgstpbutils-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstreamer-1.0.so.0': 'libgstreamer1.0-0',
  'libgsttag-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgstvideo-1.0.so.0': 'gstreamer1.0-plugins-base',
  'libgthread-2.0.so.0': 'libglib2.0-0',
  'libgtk-3.so.0': 'libgtk-3-0',
  'libgtk-x11-2.0.so.0': 'libgtk2.0-0',
  'libharfbuzz-icu.so.0': 'libharfbuzz-icu0',
  'libharfbuzz.so.0': 'libharfbuzz0b',
  'libhyphen.so.0': 'libhyphen0',
  'libicui18n.so.66': 'libicu66',
  'libicuuc.so.66': 'libicu66',
  'libjpeg.so.8': 'libjpeg-turbo8',
  'libnotify.so.4': 'libnotify4',
  'libnspr4.so': 'libnspr4',
  'libnss3.so': 'libnss3',
  'libnssutil3.so': 'libnss3',
  'libopenjp2.so.7': 'libopenjp2-7',
  'libopus.so.0': 'libopus0',
  'libpango-1.0.so.0': 'libpango-1.0-0',
  'libpangocairo-1.0.so.0': 'libpangocairo-1.0-0',
  'libpangoft2-1.0.so.0': 'libpangoft2-1.0-0',
  'libpng16.so.16': 'libpng16-16',
  'libsecret-1.so.0': 'libsecret-1-0',
  'libsmime3.so': 'libnss3',
  'libsoup-2.4.so.1': 'libsoup2.4-1',
  'libvpx.so.6': 'libvpx6',
  'libwayland-client.so.0': 'libwayland-client0',
  'libwayland-egl.so.1': 'libwayland-egl1',
  'libwayland-server.so.0': 'libwayland-server0',
  'libwebp.so.6': 'libwebp6',
  'libwebpdemux.so.2': 'libwebpdemux2',
  'libwoff2dec.so.1.0.2': 'libwoff1',
  'libX11-xcb.so.1': 'libx11-xcb1',
  'libX11.so.6': 'libx11-6',
  'libxcb-dri3.so.0': 'libxcb-dri3-0',
  'libxcb-shm.so.0': 'libxcb-shm0',
  'libxcb.so.1': 'libxcb1',
  'libXcomposite.so.1': 'libxcomposite1',
  'libXcursor.so.1': 'libxcursor1',
  'libXdamage.so.1': 'libxdamage1',
  'libXext.so.6': 'libxext6',
  'libXfixes.so.3': 'libxfixes3',
  'libXi.so.6': 'libxi6',
  'libxkbcommon.so.0': 'libxkbcommon0',
  'libxml2.so.2': 'libxml2',
  'libXrandr.so.2': 'libxrandr2',
  'libXrender.so.1': 'libxrender1',
  'libxslt.so.1': 'libxslt1.1',
  'libXt.so.6': 'libxt6',
  'libXtst.so.6': 'libxtst6',
  'libxshmfence.so.1': 'libxshmfence1'
};
const LIBRARY_TO_PACKAGE_NAME_UBUNTU_21_04 = {
  'libasound.so.2': 'libasound2',
  'libatk-1.0.so.0': 'libatk1.0-0',
  'libatk-bridge-2.0.so.0': 'libatk-bridge2.0-0',
  'libatspi.so.0': 'libatspi2.0-0',
  'libcairo-gobject.so.2': 'libcairo-gobject2',
  'libcairo.so.2': 'libcairo2',
  'libcups.so.2': 'libcups2',
  'libdbus-1.so.3': 'libdbus-1-3',
  'libdbus-glib-1.so.2': 'libdbus-glib-1-2',
  'libdrm.so.2': 'libdrm2',
  'libEGL.so.1': 'libegl1',
  'libepoxy.so.0': 'libepoxy0',
  'libfontconfig.so.1': 'libfontconfig1',
  'libfreetype.so.6': 'libfreetype6',
  'libgbm.so.1': 'libgbm1',
  'libgdk_pixbuf-2.0.so.0': 'libgdk-pixbuf-2.0-0',
  'libgdk-3.so.0': 'libgtk-3-0',
  'libgdk-x11-2.0.so.0': 'libgtk2.0-0',
  'libgio-2.0.so.0': 'libglib2.0-0',
  'libGL.so.1': 'libgl1',
  'libGLESv2.so.2': 'libgles2',
  'libglib-2.0.so.0': 'libglib2.0-0',
  'libgmodule-2.0.so.0': 'libglib2.0-0',
  'libgobject-2.0.so.0': 'libglib2.0-0',
  'libgstapp-1.0.so.0': 'libgstreamer-plugins-base1.0-0',
  'libgstaudio-1.0.so.0': 'libgstreamer-plugins-base1.0-0',
  'libgstbase-1.0.so.0': 'libgstreamer1.0-0',
  'libgstcodecparsers-1.0.so.0': 'libgstreamer-plugins-bad1.0-0',
  'libgstfft-1.0.so.0': 'libgstreamer-plugins-base1.0-0',
  'libgstgl-1.0.so.0': 'libgstreamer-gl1.0-0',
  'libgstpbutils-1.0.so.0': 'libgstreamer-plugins-base1.0-0',
  'libgstreamer-1.0.so.0': 'libgstreamer1.0-0',
  'libgsttag-1.0.so.0': 'libgstreamer-plugins-base1.0-0',
  'libgstvideo-1.0.so.0': 'libgstreamer-plugins-base1.0-0',
  'libgthread-2.0.so.0': 'libglib2.0-0',
  'libgtk-3.so.0': 'libgtk-3-0',
  'libgtk-x11-2.0.so.0': 'libgtk2.0-0',
  'libharfbuzz-icu.so.0': 'libharfbuzz-icu0',
  'libharfbuzz.so.0': 'libharfbuzz0b',
  'libhyphen.so.0': 'libhyphen0',
  'libjavascriptcoregtk-4.0.so.18': 'libjavascriptcoregtk-4.0-18',
  'libjpeg.so.8': 'libjpeg-turbo8',
  'liblcms2.so.2': 'liblcms2-2',
  'libnotify.so.4': 'libnotify4',
  'libnspr4.so': 'libnspr4',
  'libnss3.so': 'libnss3',
  'libnssutil3.so': 'libnss3',
  'libopenjp2.so.7': 'libopenjp2-7',
  'libopus.so.0': 'libopus0',
  'libpango-1.0.so.0': 'libpango-1.0-0',
  'libpangocairo-1.0.so.0': 'libpangocairo-1.0-0',
  'libpangoft2-1.0.so.0': 'libpangoft2-1.0-0',
  'libpng16.so.16': 'libpng16-16',
  'libsecret-1.so.0': 'libsecret-1-0',
  'libsmime3.so': 'libnss3',
  'libsoup-2.4.so.1': 'libsoup2.4-1',
  'libvpx.so.6': 'libvpx6',
  'libwayland-client.so.0': 'libwayland-client0',
  'libwayland-egl.so.1': 'libwayland-egl1',
  'libwayland-server.so.0': 'libwayland-server0',
  'libwebkit2gtk-4.0.so.37': 'libwebkit2gtk-4.0-37',
  'libwebp.so.6': 'libwebp6',
  'libwebpdemux.so.2': 'libwebpdemux2',
  'libwoff2dec.so.1.0.2': 'libwoff1',
  'libwpe-1.0.so.1': 'libwpe-1.0-1',
  'libWPEBackend-fdo-1.0.so.1': 'libwpebackend-fdo-1.0-1',
  'libWPEWebKit-1.0.so.3': 'libwpewebkit-1.0-3',
  'libX11-xcb.so.1': 'libx11-xcb1',
  'libX11.so.6': 'libx11-6',
  'libxcb-shm.so.0': 'libxcb-shm0',
  'libxcb.so.1': 'libxcb1',
  'libXcomposite.so.1': 'libxcomposite1',
  'libXcursor.so.1': 'libxcursor1',
  'libXdamage.so.1': 'libxdamage1',
  'libXext.so.6': 'libxext6',
  'libXfixes.so.3': 'libxfixes3',
  'libXi.so.6': 'libxi6',
  'libxkbcommon.so.0': 'libxkbcommon0',
  'libxml2.so.2': 'libxml2',
  'libXrandr.so.2': 'libxrandr2',
  'libXrender.so.1': 'libxrender1',
  'libxshmfence.so.1': 'libxshmfence1',
  'libxslt.so.1': 'libxslt1.1',
  'libXt.so.6': 'libxt6'
};
const MANUAL_LIBRARY_TO_PACKAGE_NAME_UBUNTU = {
  // libgstlibav.so (the only actual library provided by gstreamer1.0-libav) is not
  // in the ldconfig cache, so we detect the actual library required for playing h.264
  // and if it's missing recommend installing missing gstreamer lib.
  // gstreamer1.0-libav -> libavcodec57 -> libx264-152
  'libx264.so': 'gstreamer1.0-libav'
};