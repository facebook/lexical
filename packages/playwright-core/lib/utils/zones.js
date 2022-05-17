"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zones = void 0;

var _stackTrace = require("./stackTrace");

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
class ZoneManager {
  constructor() {
    this.lastZoneId = 0;
    this._zones = new Map();
  }

  async run(type, data, func) {
    const zone = new Zone(this, ++this.lastZoneId, type, data);

    this._zones.set(zone.id, zone);

    return zone.run(func);
  }

  zoneData(type, rawStack) {
    const stack = rawStack || (0, _stackTrace.captureRawStack)();

    for (const line of stack.split('\n')) {
      const index = line.indexOf('__PWZONE__[');

      if (index !== -1) {
        const zoneId = +line.substring(index + '__PWZONE__['.length, line.indexOf(']', index));

        const zone = this._zones.get(zoneId);

        if (zone && zone.type === type) return zone.data;
      }
    }

    return null;
  }

}

class Zone {
  constructor(manager, id, type, data) {
    this._manager = void 0;
    this.id = void 0;
    this.type = void 0;
    this.data = {};
    this._manager = manager;
    this.id = id;
    this.type = type;
    this.data = data;
  }

  async run(func) {
    Object.defineProperty(func, 'name', {
      value: `__PWZONE__[${this.id}]`
    });

    try {
      return await func();
    } finally {
      this._manager._zones.delete(this.id);
    }
  }

}

const zones = new ZoneManager();
exports.zones = zones;