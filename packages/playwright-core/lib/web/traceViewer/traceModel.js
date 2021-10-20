'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.commandsWithTracingSnapshots =
  exports.PersistentSnapshotStorage =
  exports.TraceModel =
    void 0;

var trace = _interopRequireWildcard(
  require('../../server/trace/common/traceEvents'),
);

var _snapshotStorage = require('./snapshotStorage');

function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}

function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}

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
    this.contextEntry = {
      startTime: Number.MAX_VALUE,
      endTime: Number.MIN_VALUE,
      browserName: '',
      options: {},
      pages: [],
      resources: [],
    };
  }

  async load(traceURL) {
    const response = await fetch(traceURL, {
      mode: 'cors',
    });
    const blob = await response.blob();
    const zipReader = new zipjs.ZipReader(new zipjs.BlobReader(blob), {
      useWebWorkers: false,
    });
    let traceEntry;
    let networkEntry;

    for (const entry of await zipReader.getEntries()) {
      if (entry.filename.endsWith('.trace')) traceEntry = entry;
      if (entry.filename.endsWith('.network')) networkEntry = entry;

      this._entries.set(entry.filename, entry);
    }

    this._snapshotStorage = new PersistentSnapshotStorage(this._entries);
    const traceWriter = new zipjs.TextWriter();
    await traceEntry.getData(traceWriter);

    for (const line of (await traceWriter.getData()).split('\n'))
      this.appendEvent(line);

    if (networkEntry) {
      const networkWriter = new zipjs.TextWriter();
      await networkEntry.getData(networkWriter);

      for (const line of (await networkWriter.getData()).split('\n'))
        this.appendEvent(line);
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
    for (const page of this.contextEntry.pages)
      page.actions.sort(
        (a1, a2) => a1.metadata.startTime - a2.metadata.startTime,
      );

    this.contextEntry.resources = this._snapshotStorage.resources();
  }

  _pageEntry(pageId) {
    let pageEntry = this.pageEntries.get(pageId);

    if (!pageEntry) {
      pageEntry = {
        actions: [],
        events: [],
        objects: {},
        screencastFrames: [],
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
      case 'context-options': {
        this.contextEntry.browserName = event.browserName;
        this.contextEntry.options = event.options;
        break;
      }

      case 'screencast-frame': {
        this._pageEntry(event.pageId).screencastFrames.push(event);

        break;
      }

      case 'action': {
        const metadata = event.metadata;
        const include = event.hasSnapshot;
        if (include && metadata.pageId)
          this._pageEntry(metadata.pageId).actions.push(event);
        break;
      }

      case 'event': {
        const metadata = event.metadata;

        if (metadata.pageId) {
          if (metadata.method === '__create__')
            this._pageEntry(metadata.pageId).objects[metadata.params.guid] =
              metadata.params.initializer;
          else this._pageEntry(metadata.pageId).events.push(event);
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
      this.contextEntry.startTime = Math.min(
        this.contextEntry.startTime,
        event.metadata.startTime,
      );
      this.contextEntry.endTime = Math.max(
        this.contextEntry.endTime,
        event.metadata.endTime,
      );
    }
  }

  _modernize(event) {
    if (this._version === undefined) return event;

    for (let version = this._version; version < trace.VERSION; ++version)
      event = this[`_modernize_${version}_to_${version + 1}`].call(this, event);

    return event;
  }

  _modernize_0_to_1(event) {
    if (event.type === 'action') {
      if (typeof event.metadata.error === 'string')
        event.metadata.error = {
          error: {
            name: 'Error',
            message: event.metadata.error,
          },
        };
      if (event.metadata && typeof event.hasSnapshot !== 'boolean')
        event.hasSnapshot = commandsWithTracingSnapshots.has(event.metadata);
    }

    return event;
  }

  _modernize_1_to_2(event) {
    if (event.type === 'frame-snapshot' && event.snapshot.isMainFrame) {
      // Old versions had completely wrong viewport.
      event.snapshot.viewport = this.contextEntry.options.viewport || {
        width: 1280,
        height: 720,
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
          postData: resource.requestSha1
            ? {
                _sha1: resource.requestSha1,
              }
            : undefined,
        },
        response: {
          status: resource.status,
          headers: resource.responseHeaders,
          content: {
            mimeType: resource.contentType,
            _sha1: resource.responseSha1,
          },
        },
        _monotonicTime: resource.timestamp,
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
} // Prior to version 2 we did not have a hasSnapshot bit on.

exports.PersistentSnapshotStorage = PersistentSnapshotStorage;
const commandsWithTracingSnapshots = new Set([
  'EventTarget.waitForEventInfo',
  'BrowserContext.waitForEventInfo',
  'Page.waitForEventInfo',
  'WebSocket.waitForEventInfo',
  'ElectronApplication.waitForEventInfo',
  'AndroidDevice.waitForEventInfo',
  'Page.goBack',
  'Page.goForward',
  'Page.reload',
  'Page.setViewportSize',
  'Page.keyboardDown',
  'Page.keyboardUp',
  'Page.keyboardInsertText',
  'Page.keyboardType',
  'Page.keyboardPress',
  'Page.mouseMove',
  'Page.mouseDown',
  'Page.mouseUp',
  'Page.mouseClick',
  'Page.mouseWheel',
  'Page.touchscreenTap',
  'Frame.evalOnSelector',
  'Frame.evalOnSelectorAll',
  'Frame.addScriptTag',
  'Frame.addStyleTag',
  'Frame.check',
  'Frame.click',
  'Frame.dragAndDrop',
  'Frame.dblclick',
  'Frame.dispatchEvent',
  'Frame.evaluateExpression',
  'Frame.evaluateExpressionHandle',
  'Frame.fill',
  'Frame.focus',
  'Frame.getAttribute',
  'Frame.goto',
  'Frame.hover',
  'Frame.innerHTML',
  'Frame.innerText',
  'Frame.inputValue',
  'Frame.isChecked',
  'Frame.isDisabled',
  'Frame.isEnabled',
  'Frame.isHidden',
  'Frame.isVisible',
  'Frame.isEditable',
  'Frame.press',
  'Frame.selectOption',
  'Frame.setContent',
  'Frame.setInputFiles',
  'Frame.tap',
  'Frame.textContent',
  'Frame.type',
  'Frame.uncheck',
  'Frame.waitForTimeout',
  'Frame.waitForFunction',
  'Frame.waitForSelector',
  'Frame.expect',
  'JSHandle.evaluateExpression',
  'ElementHandle.evaluateExpression',
  'JSHandle.evaluateExpressionHandle',
  'ElementHandle.evaluateExpressionHandle',
  'ElementHandle.evalOnSelector',
  'ElementHandle.evalOnSelectorAll',
  'ElementHandle.check',
  'ElementHandle.click',
  'ElementHandle.dblclick',
  'ElementHandle.dispatchEvent',
  'ElementHandle.fill',
  'ElementHandle.hover',
  'ElementHandle.innerHTML',
  'ElementHandle.innerText',
  'ElementHandle.inputValue',
  'ElementHandle.isChecked',
  'ElementHandle.isDisabled',
  'ElementHandle.isEditable',
  'ElementHandle.isEnabled',
  'ElementHandle.isHidden',
  'ElementHandle.isVisible',
  'ElementHandle.press',
  'ElementHandle.scrollIntoViewIfNeeded',
  'ElementHandle.selectOption',
  'ElementHandle.selectText',
  'ElementHandle.setInputFiles',
  'ElementHandle.tap',
  'ElementHandle.textContent',
  'ElementHandle.type',
  'ElementHandle.uncheck',
  'ElementHandle.waitForElementState',
  'ElementHandle.waitForSelector',
]);
exports.commandsWithTracingSnapshots = commandsWithTracingSnapshots;
