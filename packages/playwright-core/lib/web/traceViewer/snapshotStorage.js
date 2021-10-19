"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BaseSnapshotStorage = void 0;

var _events = require("events");

var _snapshotRenderer = require("./snapshotRenderer");

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
class BaseSnapshotStorage extends _events.EventEmitter {
  constructor(...args) {
    super(...args);
    this._resources = [];
    this._frameSnapshots = new Map();
  }

  clear() {
    this._resources = [];

    this._frameSnapshots.clear();
  }

  addResource(resource) {
    this._resources.push(resource);
  }

  addFrameSnapshot(snapshot) {
    let frameSnapshots = this._frameSnapshots.get(snapshot.frameId);

    if (!frameSnapshots) {
      frameSnapshots = {
        raw: [],
        renderer: []
      };

      this._frameSnapshots.set(snapshot.frameId, frameSnapshots);

      if (snapshot.isMainFrame) this._frameSnapshots.set(snapshot.pageId, frameSnapshots);
    }

    frameSnapshots.raw.push(snapshot);
    const renderer = new _snapshotRenderer.SnapshotRenderer(this._resources, frameSnapshots.raw, frameSnapshots.raw.length - 1);
    frameSnapshots.renderer.push(renderer);
    this.emit('snapshot', renderer);
  }

  resources() {
    return this._resources.slice();
  }

  snapshotByName(pageOrFrameId, snapshotName) {
    const snapshot = this._frameSnapshots.get(pageOrFrameId);

    return snapshot === null || snapshot === void 0 ? void 0 : snapshot.renderer.find(r => r.snapshotName === snapshotName);
  }

  snapshotByIndex(frameId, index) {
    const snapshot = this._frameSnapshots.get(frameId);

    return snapshot === null || snapshot === void 0 ? void 0 : snapshot.renderer[index];
  }

}

exports.BaseSnapshotStorage = BaseSnapshotStorage;