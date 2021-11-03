"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createEmptyContext = createEmptyContext;

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
function createEmptyContext() {
  return {
    startTime: Number.MAX_SAFE_INTEGER,
    endTime: 0,
    browserName: '',
    options: {
      deviceScaleFactor: 1,
      isMobile: false,
      viewport: {
        width: 1280,
        height: 800
      }
    },
    pages: [],
    resources: [],
    actions: [],
    events: [],
    objects: {}
  };
}