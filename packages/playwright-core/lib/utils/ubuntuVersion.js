"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getUbuntuVersion = getUbuntuVersion;
exports.getUbuntuVersionSync = getUbuntuVersionSync;
exports.parseOSReleaseText = parseOSReleaseText;

var _fs = _interopRequireDefault(require("fs"));

var os = _interopRequireWildcard(require("os"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
let ubuntuVersionCached;

async function getUbuntuVersion() {
  if (ubuntuVersionCached === undefined) ubuntuVersionCached = await getUbuntuVersionAsyncInternal();
  return ubuntuVersionCached;
}

function getUbuntuVersionSync() {
  if (ubuntuVersionCached === undefined) ubuntuVersionCached = getUbuntuVersionSyncInternal();
  return ubuntuVersionCached;
}

async function getUbuntuVersionAsyncInternal() {
  if (os.platform() !== 'linux') return '';
  let osReleaseText = await _fs.default.promises.readFile('/etc/upstream-release/lsb-release', 'utf8').catch(e => '');
  if (!osReleaseText) osReleaseText = await _fs.default.promises.readFile('/etc/os-release', 'utf8').catch(e => '');
  if (!osReleaseText) return '';
  return parseUbuntuVersion(osReleaseText);
}

function getUbuntuVersionSyncInternal() {
  if (os.platform() !== 'linux') return '';

  try {
    let osReleaseText;
    if (_fs.default.existsSync('/etc/upstream-release/lsb-release')) osReleaseText = _fs.default.readFileSync('/etc/upstream-release/lsb-release', 'utf8');else osReleaseText = _fs.default.readFileSync('/etc/os-release', 'utf8');
    if (!osReleaseText) return '';
    return parseUbuntuVersion(osReleaseText);
  } catch (e) {
    return '';
  }
}

function parseOSReleaseText(osReleaseText) {
  const fields = new Map();

  for (const line of osReleaseText.split('\n')) {
    const tokens = line.split('=');
    const name = tokens.shift();
    let value = tokens.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    if (!name) continue;
    fields.set(name.toLowerCase(), value);
  }

  return fields;
}

function parseUbuntuVersion(osReleaseText) {
  var _fields$get, _fields$get2;

  const fields = parseOSReleaseText(osReleaseText); // For Linux mint

  if (fields.get('distrib_id') && ((_fields$get = fields.get('distrib_id')) === null || _fields$get === void 0 ? void 0 : _fields$get.toLowerCase()) === 'ubuntu') return fields.get('distrib_release') || '';
  if (!fields.get('name') || ((_fields$get2 = fields.get('name')) === null || _fields$get2 === void 0 ? void 0 : _fields$get2.toLowerCase()) !== 'ubuntu') return '';
  return fields.get('version_id') || '';
}