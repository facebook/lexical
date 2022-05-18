"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.captureRawStack = captureRawStack;
exports.captureStackTrace = captureStackTrace;
exports.isInternalFileName = isInternalFileName;
exports.rewriteErrorMessage = rewriteErrorMessage;
exports.splitErrorMessage = splitErrorMessage;

var _path = _interopRequireDefault(require("path"));

var _utilsBundle = require("../utilsBundle");

var _ = require("./");

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
const stackUtils = new _utilsBundle.StackUtils();

function rewriteErrorMessage(e, newMessage) {
  var _e$stack;

  const lines = (((_e$stack = e.stack) === null || _e$stack === void 0 ? void 0 : _e$stack.split('\n')) || []).filter(l => l.startsWith('    at '));
  e.message = newMessage;
  const errorTitle = `${e.name}: ${e.message}`;
  if (lines.length) e.stack = `${errorTitle}\n${lines.join('\n')}`;
  return e;
}

const CORE_DIR = _path.default.resolve(__dirname, '..', '..');

const CORE_LIB = _path.default.join(CORE_DIR, 'lib');

const CORE_SRC = _path.default.join(CORE_DIR, 'src');

const TEST_DIR_SRC = _path.default.resolve(CORE_DIR, '..', 'playwright-test');

const TEST_DIR_LIB = _path.default.resolve(CORE_DIR, '..', '@playwright', 'test');

const COVERAGE_PATH = _path.default.join(CORE_DIR, '..', '..', 'tests', 'config', 'coverage.js');

function captureRawStack() {
  const stackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 30;
  const error = new Error();
  const stack = error.stack;
  Error.stackTraceLimit = stackTraceLimit;
  return stack;
}

function isInternalFileName(file, functionName) {
  // Node 16+ has node:internal.
  if (file.startsWith('internal') || file.startsWith('node:')) return true; // EventEmitter.emit has 'events.js' file.

  if (file === 'events.js' && functionName !== null && functionName !== void 0 && functionName.endsWith('emit')) return true; // Node 12

  if (file === '_stream_readable.js' || file === '_stream_writable.js') return true;
  return false;
}

function captureStackTrace(rawStack) {
  const stack = rawStack || captureRawStack();
  const isTesting = (0, _.isUnderTest)();
  let parsedFrames = stack.split('\n').map(line => {
    const frame = stackUtils.parseLine(line);
    if (!frame || !frame.file) return null;
    if (isInternalFileName(frame.file, frame.function)) return null; // Workaround for https://github.com/tapjs/stack-utils/issues/60

    let fileName;
    if (frame.file.startsWith('file://')) fileName = new URL(frame.file).pathname;else fileName = _path.default.resolve(process.cwd(), frame.file);
    if (isTesting && fileName.includes(COVERAGE_PATH)) return null;
    const inCore = fileName.startsWith(CORE_LIB) || fileName.startsWith(CORE_SRC);
    const parsed = {
      frame: {
        file: fileName,
        line: frame.line,
        column: frame.column,
        function: frame.function
      },
      frameText: line,
      inCore
    };
    return parsed;
  }).filter(Boolean);
  let apiName = '';
  const allFrames = parsedFrames; // Deepest transition between non-client code calling into client code
  // is the api entry.

  for (let i = 0; i < parsedFrames.length - 1; i++) {
    if (parsedFrames[i].inCore && !parsedFrames[i + 1].inCore) {
      const frame = parsedFrames[i].frame;
      apiName = normalizeAPIName(frame.function);
      parsedFrames = parsedFrames.slice(i + 1);
      break;
    }
  }

  function normalizeAPIName(name) {
    if (!name) return '';
    const match = name.match(/(API|JS|CDP|[A-Z])(.*)/);
    if (!match) return name;
    return match[1].toLowerCase() + match[2];
  } // Hide all test runner and library frames in the user stack (event handlers produce them).


  parsedFrames = parsedFrames.filter((f, i) => {
    if (f.frame.file.startsWith(TEST_DIR_SRC) || f.frame.file.startsWith(TEST_DIR_LIB)) return false;
    if (i && f.frame.file.startsWith(CORE_DIR)) return false;
    return true;
  });
  return {
    allFrames: allFrames.map(p => p.frame),
    frames: parsedFrames.map(p => p.frame),
    frameTexts: parsedFrames.map(p => p.frameText),
    apiName
  };
}

function splitErrorMessage(message) {
  const separationIdx = message.indexOf(':');
  return {
    name: separationIdx !== -1 ? message.slice(0, separationIdx) : '',
    message: separationIdx !== -1 && separationIdx + 2 <= message.length ? message.substring(separationIdx + 2) : message
  };
}