"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PersistentSnapshotStorage = exports.TraceModel = void 0;

var trace = _interopRequireWildcard(require("../../server/trace/common/traceEvents"));

var _snapshotStorage = require("./snapshotStorage");

var _entries = require("./entries");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
// @ts-ignore
self.importScripts('zip.min.js');
const zipjs = self.zip;

class TraceModel {
  constructor() {
    this.contextEntry = void 0;
    this.pageEntries = new Map();
    this._snapshotStorage = void 0;
    this._entries = new Map();
    this._version = void 0;
    this.contextEntry = (0, _entries.createEmptyContext)();
  }

  async load(traceURL, progress) {
    const zipReader = new zipjs.ZipReader(new zipjs.HttpReader(traceURL, {
      mode: 'cors'
    }), {
      useWebWorkers: false
    });
    let traceEntry;
    let networkEntry;

    for (const entry of await zipReader.getEntries({
      onprogress: progress
    })) {
      if (entry.filename.endsWith('.trace')) traceEntry = entry;
      if (entry.filename.endsWith('.network')) networkEntry = entry;

      this._entries.set(entry.filename, entry);
    }

    this._snapshotStorage = new PersistentSnapshotStorage(this._entries);
    const traceWriter = new zipjs.TextWriter();
    await traceEntry.getData(traceWriter);

    for (const line of (await traceWriter.getData()).split('\n')) this.appendEvent(line);

    if (networkEntry) {
      const networkWriter = new zipjs.TextWriter();
      await networkEntry.getData(networkWriter);

      for (const line of (await networkWriter.getData()).split('\n')) this.appendEvent(line);
    }

    this._build();
  }

  async resourceForSha1(sha1) {
    const entry = this._entries.get('resources/' + sha1);

    if (!entry) return;
    const blobWriter = new zipjs.BlobWriter();
    await entry.getData(blobWriter);
    return await blobWriter.getData();
  }

  storage() {
    return this._snapshotStorage;
  }

  _build() {
    this.contextEntry.actions.sort((a1, a2) => a1.metadata.startTime - a2.metadata.startTime);
    this.contextEntry.resources = this._snapshotStorage.resources();
  }

  _pageEntry(pageId) {
    let pageEntry = this.pageEntries.get(pageId);

    if (!pageEntry) {
      pageEntry = {
        screencastFrames: []
      };
      this.pageEntries.set(pageId, pageEntry);
      this.contextEntry.pages.push(pageEntry);
    }

    return pageEntry;
  }

  appendEvent(line) {
    if (!line) return;

    const event = this._modernize(JSON.parse(line));

    switch (event.type) {
      case 'context-options':
        {
          this.contextEntry.browserName = event.browserName;
          this.contextEntry.title = event.title;
          this.contextEntry.options = event.options;
          break;
        }

      case 'screencast-frame':
        {
          this._pageEntry(event.pageId).screencastFrames.push(event);

          break;
        }

      case 'action':
        {
          const include = !isTracing(event.metadata) && (!event.metadata.internal || event.metadata.apiName);

          if (include) {
            if (!event.metadata.apiName) event.metadata.apiName = event.metadata.type + '.' + event.metadata.method;
            this.contextEntry.actions.push(event);
          }

          break;
        }

      case 'event':
        {
          const metadata = event.metadata;

          if (metadata.pageId) {
            if (metadata.method === '__create__') this.contextEntry.objects[metadata.params.guid] = metadata.params.initializer;else this.contextEntry.events.push(event);
          }

          break;
        }

      case 'resource-snapshot':
        this._snapshotStorage.addResource(event.snapshot);

        break;

      case 'frame-snapshot':
        this._snapshotStorage.addFrameSnapshot(event.snapshot);

        break;
    }

    if (event.type === 'action' || event.type === 'event') {
      this.contextEntry.startTime = Math.min(this.contextEntry.startTime, event.metadata.startTime);
      this.contextEntry.endTime = Math.max(this.contextEntry.endTime, event.metadata.endTime);
    }
  }

  _modernize(event) {
    if (this._version === undefined) return event;

    for (let version = this._version; version < trace.VERSION; ++version) event = this[`_modernize_${version}_to_${version + 1}`].call(this, event);

    return event;
  }

  _modernize_0_to_1(event) {
    if (event.type === 'action') {
      if (typeof event.metadata.error === 'string') event.metadata.error = {
        error: {
          name: 'Error',
          message: event.metadata.error
        }
      };
    }

    return event;
  }

  _modernize_1_to_2(event) {
    if (event.type === 'frame-snapshot' && event.snapshot.isMainFrame) {
      // Old versions had completely wrong viewport.
      event.snapshot.viewport = this.contextEntry.options.viewport || {
        width: 1280,
        height: 720
      };
    }

    return event;
  }

  _modernize_2_to_3(event) {
    if (event.type === 'resource-snapshot' && !event.snapshot.request) {
      // Migrate from old ResourceSnapshot to new har entry format.
      const resource = event.snapshot;
      event.snapshot = {
        _frameref: resource.frameId,
        request: {
          url: resource.url,
          method: resource.method,
          headers: resource.requestHeaders,
          postData: resource.requestSha1 ? {
            _sha1: resource.requestSha1
          } : undefined
        },
        response: {
          status: resource.status,
          headers: resource.responseHeaders,
          content: {
            mimeType: resource.contentType,
            _sha1: resource.responseSha1
          }
        },
        _monotonicTime: resource.timestamp
      };
    }

    return event;
  }

}

exports.TraceModel = TraceModel;

class PersistentSnapshotStorage extends _snapshotStorage.BaseSnapshotStorage {
  constructor(entries) {
    super();
    this._entries = void 0;
    this._entries = entries;
  }

  async resourceContent(sha1) {
    const entry = this._entries.get('resources/' + sha1);

    const writer = new zipjs.BlobWriter();
    await entry.getData(writer);
    return writer.getData();
  }

}

exports.PersistentSnapshotStorage = PersistentSnapshotStorage;

function isTracing(metadata) {
  return metadata.method.startsWith('tracing');
}