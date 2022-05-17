"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.arrayToObject = arrayToObject;
exports.assert = assert;
exports.calculateSha1 = calculateSha1;
exports.constructURLBasedOnBaseURL = constructURLBasedOnBaseURL;
exports.createGuid = createGuid;
exports.debugAssert = debugAssert;
exports.debugMode = debugMode;
exports.deepCopy = deepCopy;
exports.experimentalFeaturesEnabled = experimentalFeaturesEnabled;
exports.getAsBooleanFromENV = getAsBooleanFromENV;
exports.getFromENV = getFromENV;
exports.headersArrayToObject = headersArrayToObject;
exports.headersObjectToArray = headersObjectToArray;
exports.isError = isError;
exports.isFilePayload = isFilePayload;
exports.isLikelyNpxGlobal = void 0;
exports.isObject = isObject;
exports.isRegExp = isRegExp;
exports.isString = isString;
exports.isUnderTest = isUnderTest;
exports.makeWaitForNextTask = makeWaitForNextTask;
exports.monotonicTime = monotonicTime;
exports.objectToArray = objectToArray;
exports.setUnderTest = setUnderTest;
exports.streamToString = streamToString;
exports.wrapInASCIIBox = wrapInASCIIBox;

var crypto = _interopRequireWildcard(require("crypto"));

var URL = _interopRequireWildcard(require("url"));

var _v = _interopRequireDefault(require("v8"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
// See https://joel.tools/microtasks/
function makeWaitForNextTask() {
  // As of Mar 2021, Electron v12 doesn't create new task with `setImmediate` despite
  // using Node 14 internally, so we fallback to `setTimeout(0)` instead.
  // @see https://github.com/electron/electron/issues/28261
  if (process.versions.electron) return callback => setTimeout(callback, 0);
  if (parseInt(process.versions.node, 10) >= 11) return setImmediate; // Unlike Node 11, Node 10 and less have a bug with Task and MicroTask execution order:
  // - https://github.com/nodejs/node/issues/22257
  //
  // So we can't simply run setImmediate to dispatch code in a following task.
  // However, we can run setImmediate from-inside setImmediate to make sure we're getting
  // in the following task.

  let spinning = false;
  const callbacks = [];

  const loop = () => {
    const callback = callbacks.shift();

    if (!callback) {
      spinning = false;
      return;
    }

    setImmediate(loop); // Make sure to call callback() as the last thing since it's
    // untrusted code that might throw.

    callback();
  };

  return callback => {
    callbacks.push(callback);

    if (!spinning) {
      spinning = true;
      setImmediate(loop);
    }
  };
}

function assert(value, message) {
  if (!value) throw new Error(message || 'Assertion error');
}

function debugAssert(value, message) {
  if (isUnderTest() && !value) throw new Error(message);
}

function isString(obj) {
  return typeof obj === 'string' || obj instanceof String;
}

function isRegExp(obj) {
  return obj instanceof RegExp || Object.prototype.toString.call(obj) === '[object RegExp]';
}

function isObject(obj) {
  return typeof obj === 'object' && obj !== null;
}

function isError(obj) {
  return obj instanceof Error || obj && obj.__proto__ && obj.__proto__.name === 'Error';
}

const debugEnv = getFromENV('PWDEBUG') || '';

function debugMode() {
  if (debugEnv === 'console') return 'console';
  if (debugEnv === '0' || debugEnv === 'false') return '';
  return debugEnv ? 'inspector' : '';
}

let _isUnderTest = false;

function setUnderTest() {
  _isUnderTest = true;
}

function isUnderTest() {
  return _isUnderTest;
}

function experimentalFeaturesEnabled() {
  return isUnderTest() || !!process.env.PLAYWRIGHT_EXPERIMENTAL_FEATURES;
}

function getFromENV(name) {
  let value = process.env[name];
  value = value === undefined ? process.env[`npm_config_${name.toLowerCase()}`] : value;
  value = value === undefined ? process.env[`npm_package_config_${name.toLowerCase()}`] : value;
  return value;
}

function getAsBooleanFromENV(name) {
  const value = getFromENV(name);
  return !!value && value !== 'false' && value !== '0';
}

function headersObjectToArray(headers, separator, setCookieSeparator) {
  if (!setCookieSeparator) setCookieSeparator = separator;
  const result = [];

  for (const name in headers) {
    const values = headers[name];
    if (values === undefined) continue;

    if (separator) {
      const sep = name.toLowerCase() === 'set-cookie' ? setCookieSeparator : separator;

      for (const value of values.split(sep)) result.push({
        name,
        value: value.trim()
      });
    } else {
      result.push({
        name,
        value: values
      });
    }
  }

  return result;
}

function headersArrayToObject(headers, lowerCase) {
  const result = {};

  for (const {
    name,
    value
  } of headers) result[lowerCase ? name.toLowerCase() : name] = value;

  return result;
}

function monotonicTime() {
  const [seconds, nanoseconds] = process.hrtime();
  return seconds * 1000 + (nanoseconds / 1000 | 0) / 1000;
}

function objectToArray(map) {
  if (!map) return undefined;
  const result = [];

  for (const [name, value] of Object.entries(map)) result.push({
    name,
    value: String(value)
  });

  return result;
}

function arrayToObject(array) {
  if (!array) return undefined;
  const result = {};

  for (const {
    name,
    value
  } of array) result[name] = value;

  return result;
}

function calculateSha1(buffer) {
  const hash = crypto.createHash('sha1');
  hash.update(buffer);
  return hash.digest('hex');
}

function createGuid() {
  return crypto.randomBytes(16).toString('hex');
}

function constructURLBasedOnBaseURL(baseURL, givenURL) {
  try {
    return new URL.URL(givenURL, baseURL).toString();
  } catch (e) {
    return givenURL;
  }
}

function wrapInASCIIBox(text, padding = 0) {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map(line => line.length));
  return ['╔' + '═'.repeat(maxLength + padding * 2) + '╗', ...lines.map(line => '║' + ' '.repeat(padding) + line + ' '.repeat(maxLength - line.length + padding) + '║'), '╚' + '═'.repeat(maxLength + padding * 2) + '╝'].join('\n');
}

function isFilePayload(value) {
  return typeof value === 'object' && value['name'] && value['mimeType'] && value['buffer'];
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

const isLikelyNpxGlobal = () => process.argv.length >= 2 && process.argv[1].includes('_npx');

exports.isLikelyNpxGlobal = isLikelyNpxGlobal;

function deepCopy(obj) {
  return _v.default.deserialize(_v.default.serialize(obj));
}