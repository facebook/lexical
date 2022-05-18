"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reducedMotions = exports.mediaTypes = exports.kLifecycleEvents = exports.forcedColors = exports.colorSchemes = void 0;

/**
 * Copyright 2018 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
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
const kLifecycleEvents = new Set(['load', 'domcontentloaded', 'networkidle', 'commit']);
exports.kLifecycleEvents = kLifecycleEvents;
const mediaTypes = new Set(['screen', 'print']);
exports.mediaTypes = mediaTypes;
const colorSchemes = new Set(['dark', 'light', 'no-preference']);
exports.colorSchemes = colorSchemes;
const reducedMotions = new Set(['no-preference', 'reduce']);
exports.reducedMotions = reducedMotions;
const forcedColors = new Set(['active', 'none']);
exports.forcedColors = forcedColors;