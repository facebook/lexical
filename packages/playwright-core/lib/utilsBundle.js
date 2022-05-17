"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wsServer = exports.wsSender = exports.wsReceiver = exports.ws = exports.rimraf = exports.progress = exports.program = exports.ms = exports.minimatch = exports.mime = exports.lockfile = exports.jpegjs = exports.getProxyForUrl = exports.debug = exports.colors = exports.StackUtils = exports.SocksProxyAgent = exports.PNG = exports.HttpsProxyAgent = void 0;

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
const colors = require('./utilsBundleImpl').colors;

exports.colors = colors;

const debug = require('./utilsBundleImpl').debug;

exports.debug = debug;

const getProxyForUrl = require('./utilsBundleImpl').getProxyForUrl;

exports.getProxyForUrl = getProxyForUrl;

const HttpsProxyAgent = require('./utilsBundleImpl').HttpsProxyAgent;

exports.HttpsProxyAgent = HttpsProxyAgent;

const jpegjs = require('./utilsBundleImpl').jpegjs;

exports.jpegjs = jpegjs;

const lockfile = require('./utilsBundleImpl').lockfile;

exports.lockfile = lockfile;

const mime = require('./utilsBundleImpl').mime;

exports.mime = mime;

const minimatch = require('./utilsBundleImpl').minimatch;

exports.minimatch = minimatch;

const ms = require('./utilsBundleImpl').ms;

exports.ms = ms;

const PNG = require('./utilsBundleImpl').PNG;

exports.PNG = PNG;

const program = require('./utilsBundleImpl').program;

exports.program = program;

const progress = require('./utilsBundleImpl').progress;

exports.progress = progress;

const rimraf = require('./utilsBundleImpl').rimraf;

exports.rimraf = rimraf;

const SocksProxyAgent = require('./utilsBundleImpl').SocksProxyAgent;

exports.SocksProxyAgent = SocksProxyAgent;

const StackUtils = require('./utilsBundleImpl').StackUtils;

exports.StackUtils = StackUtils;

const ws = require('./utilsBundleImpl').ws;

exports.ws = ws;

const wsServer = require('./utilsBundleImpl').wsServer;

exports.wsServer = wsServer;

const wsReceiver = require('./utilsBundleImpl').wsReceiver;

exports.wsReceiver = wsReceiver;

const wsSender = require('./utilsBundleImpl').wsSender;

exports.wsSender = wsSender;