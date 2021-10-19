"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rewriteErrorMessage = rewriteErrorMessage;
exports.captureStackTrace = captureStackTrace;
exports.splitErrorMessage = splitErrorMessage;

var _path = _interopRequireDefault(require("path"));

var _stackUtils = _interopRequireDefault(require("stack-utils"));

var _utils = require("./utils");

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
const stackUtils = new _stackUtils.default();

function rewriteErrorMessage(e, newMessage) {
  var _e$stack;

  const lines = (((_e$stack = e.stack) === null || _e$stack === void 0 ? void 0 : _e$stack.split('\n')) || []).filter(l => l.startsWith('    at '));
  e.message = newMessage;
  const errorTitle = `${e.name}: ${e.message}`;
  if (lines.length) e.stack = `${errorTitle}\n${lines.join('\n')}`;
  return e;
}

const CORE_DIR = _path.default.resolve(__dirname, '..', '..');

const CLIENT_LIB = _path.default.join(CORE_DIR, 'lib', 'client');

const CLIENT_SRC = _path.default.join(CORE_DIR, 'src', 'client');

function captureStackTrace() {
  const stackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 30;
  const error = new Error();
  const stack = error.stack;
  Error.stackTraceLimit = stackTraceLimit;
  const isTesting = (0, _utils.isUnderTest)();
  let parsedFrames = stack.split('\n').map(line => {
    const frame = stackUtils.parseLine(line);
    if (!frame || !frame.file) return null;
    if (frame.file.startsWith('internal')) return null;

    const fileName = _path.default.resolve(process.cwd(), frame.file);

    if (isTesting && fileName.includes(_path.default.join('playwright', 'tests', 'config', 'coverage.js'))) return null;
    const inClient = fileName.startsWith(CLIENT_LIB) || fileName.startsWith(CLIENT_SRC);
    const parsed = {
      frame: {
        file: fileName,
        line: frame.line,
        column: frame.column,
        function: frame.function
      },
      frameText: line,
      inClient
    };
    return parsed;
  }).filter(Boolean);
  let apiName = '';
  const allFrames = parsedFrames; // expect matchers have the following stack structure:
  // at Object.__PWTRAP__[expect.toHaveText] (...)
  // at __EXTERNAL_MATCHER_TRAP__ (...)
  // at Object.throwingMatcher [as toHaveText] (...)

  const TRAP = '__PWTRAP__[';
  const expectIndex = parsedFrames.findIndex(f => f.frameText.includes(TRAP));

  if (expectIndex !== -1) {
    const text = parsedFrames[expectIndex].frameText;
    const aliasIndex = text.indexOf(TRAP);
    apiName = text.substring(aliasIndex + TRAP.length, text.indexOf(']'));
    parsedFrames = parsedFrames.slice(expectIndex + 3);
  } else {
    // Deepest transition between non-client code calling into client code
    // is the api entry.
    for (let i = 0; i < parsedFrames.length - 1; i++) {
      if (parsedFrames[i].inClient && !parsedFrames[i + 1].inClient) {
        const frame = parsedFrames[i].frame;
        apiName = frame.function ? frame.function[0].toLowerCase() + frame.function.slice(1) : '';
        parsedFrames = parsedFrames.slice(i + 1);
        break;
      }
    }
  }

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