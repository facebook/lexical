"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.envArrayToObject = envArrayToObject;
exports.gracefullyCloseAll = gracefullyCloseAll;
exports.gracefullyCloseSet = void 0;
exports.launchProcess = launchProcess;

var childProcess = _interopRequireWildcard(require("child_process"));

var readline = _interopRequireWildcard(require("readline"));

var path = _interopRequireWildcard(require("path"));

var _eventsHelper = require("./eventsHelper");

var _ = require("./");

var _fileUtils = require("./fileUtils");

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
const gracefullyCloseSet = new Set();
exports.gracefullyCloseSet = gracefullyCloseSet;

async function gracefullyCloseAll() {
  await Promise.all(Array.from(gracefullyCloseSet).map(gracefullyClose => gracefullyClose().catch(e => {})));
} // We currently spawn a process per page when recording video in Chromium.
//  This triggers "too many listeners" on the process object once you have more than 10 pages open.


const maxListeners = process.getMaxListeners();
if (maxListeners !== 0) process.setMaxListeners(Math.max(maxListeners || 0, 100));

async function launchProcess(options) {
  const stdio = options.stdio === 'pipe' ? ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'];
  options.log(`<launching> ${options.command} ${options.args ? options.args.join(' ') : ''}`);
  const spawnOptions = {
    // On non-windows platforms, `detached: true` makes child process a leader of a new
    // process group, making it possible to kill child process tree with `.kill(-pid)` command.
    // @see https://nodejs.org/api/child_process.html#child_process_options_detached
    detached: process.platform !== 'win32',
    env: options.env,
    cwd: options.cwd,
    shell: options.shell,
    stdio
  };
  const spawnedProcess = childProcess.spawn(options.command, options.args || [], spawnOptions);

  const cleanup = async () => {
    options.log(`[pid=${spawnedProcess.pid || 'N/A'}] starting temporary directories cleanup`);
    const errors = await (0, _fileUtils.removeFolders)(options.tempDirectories);

    for (let i = 0; i < options.tempDirectories.length; ++i) {
      if (errors[i]) options.log(`[pid=${spawnedProcess.pid || 'N/A'}] exception while removing ${options.tempDirectories[i]}: ${errors[i]}`);
    }

    options.log(`[pid=${spawnedProcess.pid || 'N/A'}] finished temporary directories cleanup`);
  }; // Prevent Unhandled 'error' event.


  spawnedProcess.on('error', () => {});

  if (!spawnedProcess.pid) {
    let failed;
    const failedPromise = new Promise((f, r) => failed = f);
    spawnedProcess.once('error', error => {
      failed(new Error('Failed to launch: ' + error));
    });
    return cleanup().then(() => failedPromise).then(e => Promise.reject(e));
  }

  options.log(`<launched> pid=${spawnedProcess.pid}`);
  const stdout = readline.createInterface({
    input: spawnedProcess.stdout
  });
  stdout.on('line', data => {
    options.log(`[pid=${spawnedProcess.pid}][out] ` + data);
  });
  const stderr = readline.createInterface({
    input: spawnedProcess.stderr
  });
  stderr.on('line', data => {
    options.log(`[pid=${spawnedProcess.pid}][err] ` + data);
  });
  let processClosed = false;

  let fulfillCleanup = () => {};

  const waitForCleanup = new Promise(f => fulfillCleanup = f);
  spawnedProcess.once('exit', (exitCode, signal) => {
    options.log(`[pid=${spawnedProcess.pid}] <process did exit: exitCode=${exitCode}, signal=${signal}>`);
    processClosed = true;

    _eventsHelper.eventsHelper.removeEventListeners(listeners);

    gracefullyCloseSet.delete(gracefullyClose);
    options.onExit(exitCode, signal); // Cleanup as process exits.

    cleanup().then(fulfillCleanup);
  });
  const listeners = [_eventsHelper.eventsHelper.addEventListener(process, 'exit', killProcessAndCleanup)];

  if (options.handleSIGINT) {
    listeners.push(_eventsHelper.eventsHelper.addEventListener(process, 'SIGINT', () => {
      gracefullyClose().then(() => {
        // Give tests a chance to dispatch any async calls.
        if ((0, _.isUnderTest)()) setTimeout(() => process.exit(130), 0);else process.exit(130);
      });
    }));
  }

  if (options.handleSIGTERM) listeners.push(_eventsHelper.eventsHelper.addEventListener(process, 'SIGTERM', gracefullyClose));
  if (options.handleSIGHUP) listeners.push(_eventsHelper.eventsHelper.addEventListener(process, 'SIGHUP', gracefullyClose));
  gracefullyCloseSet.add(gracefullyClose);
  let gracefullyClosing = false;

  async function gracefullyClose() {
    gracefullyCloseSet.delete(gracefullyClose); // We keep listeners until we are done, to handle 'exit' and 'SIGINT' while
    // asynchronously closing to prevent zombie processes. This might introduce
    // reentrancy to this function, for example user sends SIGINT second time.
    // In this case, let's forcefully kill the process.

    if (gracefullyClosing) {
      options.log(`[pid=${spawnedProcess.pid}] <forecefully close>`);
      killProcess();
      await waitForCleanup; // Ensure the process is dead and we have cleaned up.

      return;
    }

    gracefullyClosing = true;
    options.log(`[pid=${spawnedProcess.pid}] <gracefully close start>`);
    await options.attemptToGracefullyClose().catch(() => killProcess());
    await waitForCleanup; // Ensure the process is dead and we have cleaned up.

    options.log(`[pid=${spawnedProcess.pid}] <gracefully close end>`);
  } // This method has to be sync to be used as 'exit' event handler.


  function killProcess() {
    options.log(`[pid=${spawnedProcess.pid}] <kill>`);

    _eventsHelper.eventsHelper.removeEventListeners(listeners);

    if (spawnedProcess.pid && !spawnedProcess.killed && !processClosed) {
      options.log(`[pid=${spawnedProcess.pid}] <will force kill>`); // Force kill the browser.

      try {
        if (process.platform === 'win32') {
          const taskkillProcess = childProcess.spawnSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, {
            shell: true
          });
          const [stdout, stderr] = [taskkillProcess.stdout.toString(), taskkillProcess.stderr.toString()];
          if (stdout) options.log(`[pid=${spawnedProcess.pid}] taskkill stdout: ${stdout}`);
          if (stderr) options.log(`[pid=${spawnedProcess.pid}] taskkill stderr: ${stderr}`);
        } else {
          process.kill(-spawnedProcess.pid, 'SIGKILL');
        }
      } catch (e) {
        options.log(`[pid=${spawnedProcess.pid}] exception while trying to kill process: ${e}`); // the process might have already stopped
      }
    } else {
      options.log(`[pid=${spawnedProcess.pid}] <skipped force kill spawnedProcess.killed=${spawnedProcess.killed} processClosed=${processClosed}>`);
    }
  }

  function killProcessAndCleanup() {
    killProcess();
    options.log(`[pid=${spawnedProcess.pid || 'N/A'}] starting temporary directories cleanup`);

    if (options.tempDirectories.length) {
      const cleanupProcess = childProcess.spawnSync(process.argv0, [path.join(__dirname, 'processLauncherCleanupEntrypoint.js'), ...options.tempDirectories]);
      const [stdout, stderr] = [cleanupProcess.stdout.toString(), cleanupProcess.stderr.toString()];
      if (stdout) options.log(`[pid=${spawnedProcess.pid || 'N/A'}] ${stdout}`);
      if (stderr) options.log(`[pid=${spawnedProcess.pid || 'N/A'}] ${stderr}`);
    }

    options.log(`[pid=${spawnedProcess.pid || 'N/A'}] finished temporary directories cleanup`);
  }

  function killAndWait() {
    killProcess();
    return waitForCleanup;
  }

  return {
    launchedProcess: spawnedProcess,
    gracefullyClose,
    kill: killAndWait
  };
}

function envArrayToObject(env) {
  const result = {};

  for (const {
    name,
    value
  } of env) result[name] = value;

  return result;
}