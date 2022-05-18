"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InMemorySnapshotter = void 0;

var _snapshotStorage = require("../../../../../trace-viewer/src/snapshotStorage");

var _snapshotter = require("../recorder/snapshotter");

var _harTracer = require("../../har/harTracer");

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
class InMemorySnapshotter extends _snapshotStorage.BaseSnapshotStorage {
  constructor(context) {
    super();
    this._blobs = new Map();
    this._snapshotter = void 0;
    this._harTracer = void 0;
    this._snapshotter = new _snapshotter.Snapshotter(context, this);
    this._harTracer = new _harTracer.HarTracer(context, this, {
      content: 'sha1',
      waitForContentOnStop: false,
      skipScripts: true
    });
  }

  async initialize() {
    await this._snapshotter.start();

    this._harTracer.start();
  }

  async reset() {
    await this._snapshotter.reset();
    await this._harTracer.flush();

    this._harTracer.stop();

    this._harTracer.start();

    this.clear();
  }

  async dispose() {
    this._snapshotter.dispose();

    await this._harTracer.flush();

    this._harTracer.stop();
  }

  async captureSnapshot(page, snapshotName, element) {
    if (this._frameSnapshots.has(snapshotName)) throw new Error('Duplicate snapshot name: ' + snapshotName);

    this._snapshotter.captureSnapshot(page, snapshotName, element).catch(() => {});

    return new Promise(fulfill => {
      const disposable = this.onSnapshotEvent(renderer => {
        if (renderer.snapshotName === snapshotName) {
          disposable.dispose();
          fulfill(renderer);
        }
      });
    });
  }

  onEntryStarted(entry) {}

  onEntryFinished(entry) {
    this.addResource(entry);
  }

  onContentBlob(sha1, buffer) {
    this._blobs.set(sha1, buffer);
  }

  onSnapshotterBlob(blob) {
    this._blobs.set(blob.sha1, blob.buffer);
  }

  onFrameSnapshot(snapshot) {
    this.addFrameSnapshot(snapshot);
  }

  async resourceContent(sha1) {
    throw new Error('Not implemented');
  }

  async resourceContentForTest(sha1) {
    return this._blobs.get(sha1);
  }

}

exports.InMemorySnapshotter = InMemorySnapshotter;