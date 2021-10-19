"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.msToString = msToString;
exports.lowerBound = lowerBound;
exports.upperBound = upperBound;

/*
  Copyright (c) Microsoft Corporation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
function msToString(ms) {
  if (!isFinite(ms)) return '-';
  if (ms === 0) return '0';
  if (ms < 1000) return ms.toFixed(0) + 'ms';
  const seconds = ms / 1000;
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const minutes = seconds / 60;
  if (minutes < 60) return minutes.toFixed(1) + 'm';
  const hours = minutes / 60;
  if (hours < 24) return hours.toFixed(1) + 'h';
  const days = hours / 24;
  return days.toFixed(1) + 'd';
}

function lowerBound(array, object, comparator, left, right) {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;

  while (l < r) {
    const m = l + r >> 1;
    if (comparator(object, array[m]) > 0) l = m + 1;else r = m;
  }

  return r;
}

function upperBound(array, object, comparator, left, right) {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;

  while (l < r) {
    const m = l + r >> 1;
    if (comparator(object, array[m]) >= 0) l = m + 1;else r = m;
  }

  return r;
}