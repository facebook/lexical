"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSafeCloseError = isSafeCloseError;
exports.kBrowserOrContextClosedError = exports.kBrowserClosedError = exports.TimeoutError = void 0;

/**
 * Copyright 2018 Google Inc. All rights reserved.
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
class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

}

class TimeoutError extends CustomError {}

exports.TimeoutError = TimeoutError;
const kBrowserClosedError = 'Browser has been closed';
exports.kBrowserClosedError = kBrowserClosedError;
const kBrowserOrContextClosedError = 'Target page, context or browser has been closed';
exports.kBrowserOrContextClosedError = kBrowserOrContextClosedError;

function isSafeCloseError(error) {
  return error.message.endsWith(kBrowserClosedError) || error.message.endsWith(kBrowserOrContextClosedError);
}