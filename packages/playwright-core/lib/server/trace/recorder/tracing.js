"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shouldCaptureSnapshot = shouldCaptureSnapshot;
exports.Tracing = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _yazl = _interopRequireDefault(require("yazl"));

var _utils = require("../../../utils/utils");

var _artifact = require("../../artifact");

var _browserContext = require("../../browserContext");

var _dom = require("../../dom");

var _eventsHelper = require("../../../utils/eventsHelper");

var _page = require("../../page");

var _channels = require("../../../protocol/channels");

var _snapshotter = require("./snapshotter");

var _harTracer = require("../../supplements/har/harTracer");

var _traceEvents = require("../common/traceEvents");

var _async = require("../../../utils/async");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const kScreencastOptions = {
  width: 800,
  height: 600,
  quality: 90
};

class Tracing {
  constructor(context) {
    this._writeChain = Promise.resolve();
    this._snapshotter = void 0;
    this._harTracer = void 0;
    this._screencastListeners = [];
    this._pendingCalls = new Map();
    this._context = void 0;
    this._resourcesDir = void 0;
    this._state = void 0;
    this._isStopping = false;
    this._tracesDir = void 0;
    this._allResources = new Set();
    this._contextCreatedEvent = void 0;
    this._context = context;
    this._tracesDir = context._browser.options.tracesDir;
    this._resourcesDir = _path.default.join(this._tracesDir, 'resources');
    this._snapshotter = new _snapshotter.Snapshotter(context, this);
    this._harTracer = new _harTracer.HarTracer(context, this, {
      content: 'sha1',
      waitForContentOnStop: false,
      skipScripts: true
    });
    this._contextCreatedEvent = {
      version: _traceEvents.VERSION,
      type: 'context-options',
      browserName: this._context._browser.options.name,
      options: this._context._options
    };
  }

  start(options) {
    if (this._isStopping) throw new Error('Cannot start tracing while stopping');

    if (this._state) {
      const o = this._state.options;
      if (o.name !== options.name || !o.screenshots !== !options.screenshots || !o.snapshots !== !options.snapshots) throw new Error('Tracing has been already started with different options');
      return;
    } // TODO: passing the same name for two contexts makes them write into a single file
    // and conflict.


    const traceName = options.name || (0, _utils.createGuid)();

    const traceFile = _path.default.join(this._tracesDir, traceName + '.trace');

    const networkFile = _path.default.join(this._tracesDir, traceName + '.network');

    this._state = {
      options,
      traceName,
      traceFile,
      networkFile,
      filesCount: 0,
      sha1s: new Set(),
      recording: false
    };
    this._writeChain = _fs.default.promises.mkdir(this._resourcesDir, {
      recursive: true
    }).then(() => _fs.default.promises.writeFile(networkFile, ''));
    if (options.snapshots) this._harTracer.start();
  }

  async startChunk(options = {}) {
    if (this._state && this._state.recording) await this.stopChunk(false, false);
    if (!this._state) throw new Error('Must start tracing before starting a new chunk');
    if (this._isStopping) throw new Error('Cannot start a trace chunk while stopping');
    const state = this._state;
    const suffix = state.filesCount ? `-${state.filesCount}` : ``;
    state.filesCount++;
    state.traceFile = _path.default.join(this._tracesDir, `${state.traceName}${suffix}.trace`);
    state.recording = true;

    this._appendTraceOperation(async () => {
      await (0, _utils.mkdirIfNeeded)(state.traceFile);
      await _fs.default.promises.appendFile(state.traceFile, JSON.stringify({ ...this._contextCreatedEvent,
        title: options.title
      }) + '\n');
    });

    this._context.instrumentation.addListener(this);

    if (state.options.screenshots) this._startScreencast();
    if (state.options.snapshots) await this._snapshotter.start();
  }

  _startScreencast() {
    for (const page of this._context.pages()) this._startScreencastInPage(page);

    this._screencastListeners.push(_eventsHelper.eventsHelper.addEventListener(this._context, _browserContext.BrowserContext.Events.Page, this._startScreencastInPage.bind(this)));
  }

  _stopScreencast() {
    _eventsHelper.eventsHelper.removeEventListeners(this._screencastListeners);

    for (const page of this._context.pages()) page.setScreencastOptions(null);
  }

  async stop() {
    if (!this._state) return;
    if (this._isStopping) throw new Error(`Tracing is already stopping`);
    if (this._state.recording) throw new Error(`Must stop trace file before stopping tracing`);

    this._harTracer.stop();

    await this._writeChain;
    this._state = undefined;
  }

  async dispose() {
    this._snapshotter.dispose();

    await this._writeChain;
  }

  async stopChunk(save, skipCompress) {
    if (this._isStopping) throw new Error(`Tracing is already stopping`);
    this._isStopping = true;

    for (const {
      sdkObject,
      metadata,
      beforeSnapshot,
      actionSnapshot,
      afterSnapshot
    } of this._pendingCalls.values()) {
      await Promise.all([beforeSnapshot, actionSnapshot, afterSnapshot]);
      let callMetadata = metadata;

      if (!afterSnapshot) {
        // Note: we should not modify metadata here to avoid side-effects in any other place.
        callMetadata = { ...metadata,
          error: {
            error: {
              name: 'Error',
              message: 'Action was interrupted'
            }
          }
        };
      }

      await this.onAfterCall(sdkObject, callMetadata);
    }

    if (!this._state || !this._state.recording) {
      this._isStopping = false;
      if (save) throw new Error(`Must start tracing before stopping`);
      return {
        artifact: null,
        entries: []
      };
    }

    const state = this._state;

    this._context.instrumentation.removeListener(this);

    if (state.options.screenshots) this._stopScreencast();
    if (state.options.snapshots) await this._snapshotter.stop(); // Chain the export operation against write operations,
    // so that neither trace files nor sha1s change during the export.

    return (await this._appendTraceOperation(async () => {
      this._isStopping = false;
      state.recording = false;
      if (!save) return {
        artifact: null,
        entries: []
      }; // Har files a live, make a snapshot before returning the resulting entries.

      const networkFile = _path.default.join(state.networkFile, '..', (0, _utils.createGuid)());

      await _fs.default.promises.copyFile(state.networkFile, networkFile);
      const entries = [];
      entries.push({
        name: 'trace.trace',
        value: state.traceFile
      });
      entries.push({
        name: 'trace.network',
        value: networkFile
      });

      for (const sha1 of state.sha1s) entries.push({
        name: _path.default.join('resources', sha1),
        value: _path.default.join(this._resourcesDir, sha1)
      });

      const zipArtifact = skipCompress ? null : await this._exportZip(entries, state).catch(() => null);
      return {
        artifact: zipArtifact,
        entries
      };
    })) || {
      artifact: null,
      entries: []
    };
  }

  async _exportZip(entries, state) {
    const zipFile = new _yazl.default.ZipFile();
    const result = new _async.ManualPromise();
    zipFile.on('error', error => result.reject(error));

    for (const entry of entries) zipFile.addFile(entry.value, entry.name);

    zipFile.end();
    const zipFileName = state.traceFile + '.zip';
    zipFile.outputStream.pipe(_fs.default.createWriteStream(zipFileName)).on('close', () => {
      const artifact = new _artifact.Artifact(this._context, zipFileName);
      artifact.reportFinished();
      result.resolve(artifact);
    });
    return result;
  }

  async _captureSnapshot(name, sdkObject, metadata, element) {
    if (!sdkObject.attribution.page) return;
    if (!this._snapshotter.started()) return;
    if (!shouldCaptureSnapshot(metadata)) return;
    const snapshotName = `${name}@${metadata.id}`;
    metadata.snapshots.push({
      title: name,
      snapshotName
    }); // We have |element| for input actions (page.click and handle.click)
    // and |sdkObject| element for accessors like handle.textContent.

    if (!element && sdkObject instanceof _dom.ElementHandle) element = sdkObject;
    await this._snapshotter.captureSnapshot(sdkObject.attribution.page, snapshotName, element).catch(() => {});
  }

  async onBeforeCall(sdkObject, metadata) {
    var _sdkObject$attributio;

    (_sdkObject$attributio = sdkObject.attribution.page) === null || _sdkObject$attributio === void 0 ? void 0 : _sdkObject$attributio.temporarlyDisableTracingScreencastThrottling(); // Set afterSnapshot name for all the actions that operate selectors.
    // Elements resolved from selectors will be marked on the snapshot.

    metadata.afterSnapshot = `after@${metadata.id}`;

    const beforeSnapshot = this._captureSnapshot('before', sdkObject, metadata);

    this._pendingCalls.set(metadata.id, {
      sdkObject,
      metadata,
      beforeSnapshot
    });

    await beforeSnapshot;
  }

  async onBeforeInputAction(sdkObject, metadata, element) {
    var _sdkObject$attributio2;

    (_sdkObject$attributio2 = sdkObject.attribution.page) === null || _sdkObject$attributio2 === void 0 ? void 0 : _sdkObject$attributio2.temporarlyDisableTracingScreencastThrottling();

    const actionSnapshot = this._captureSnapshot('action', sdkObject, metadata, element);

    this._pendingCalls.get(metadata.id).actionSnapshot = actionSnapshot;
    await actionSnapshot;
  }

  async onAfterCall(sdkObject, metadata) {
    var _sdkObject$attributio3;

    (_sdkObject$attributio3 = sdkObject.attribution.page) === null || _sdkObject$attributio3 === void 0 ? void 0 : _sdkObject$attributio3.temporarlyDisableTracingScreencastThrottling();

    const pendingCall = this._pendingCalls.get(metadata.id);

    if (!pendingCall || pendingCall.afterSnapshot) return;

    if (!sdkObject.attribution.context) {
      this._pendingCalls.delete(metadata.id);

      return;
    }

    pendingCall.afterSnapshot = this._captureSnapshot('after', sdkObject, metadata);
    await pendingCall.afterSnapshot;
    const event = {
      type: 'action',
      metadata
    };

    this._appendTraceEvent(event);

    this._pendingCalls.delete(metadata.id);
  }

  onEvent(sdkObject, metadata) {
    if (!sdkObject.attribution.context) return;
    const event = {
      type: 'event',
      metadata
    };

    this._appendTraceEvent(event);
  }

  onEntryStarted(entry) {}

  onEntryFinished(entry) {
    const event = {
      type: 'resource-snapshot',
      snapshot: entry
    };

    this._appendTraceOperation(async () => {
      visitSha1s(event, this._state.sha1s);
      await _fs.default.promises.appendFile(this._state.networkFile, JSON.stringify(event) + '\n');
    });
  }

  onContentBlob(sha1, buffer) {
    this._appendResource(sha1, buffer);
  }

  onSnapshotterBlob(blob) {
    this._appendResource(blob.sha1, blob.buffer);
  }

  onFrameSnapshot(snapshot) {
    this._appendTraceEvent({
      type: 'frame-snapshot',
      snapshot
    });
  }

  _startScreencastInPage(page) {
    page.setScreencastOptions(kScreencastOptions);
    const prefix = page.guid;
    let frameSeq = 0;

    this._screencastListeners.push(_eventsHelper.eventsHelper.addEventListener(page, _page.Page.Events.ScreencastFrame, params => {
      const suffix = String(++frameSeq).padStart(10, '0');
      const sha1 = `${prefix}-${suffix}.jpeg`;
      const event = {
        type: 'screencast-frame',
        pageId: page.guid,
        sha1,
        width: params.width,
        height: params.height,
        timestamp: (0, _utils.monotonicTime)()
      }; // Make sure to write the screencast frame before adding a reference to it.

      this._appendResource(sha1, params.buffer);

      this._appendTraceEvent(event);
    }));
  }

  _appendTraceEvent(event) {
    this._appendTraceOperation(async () => {
      visitSha1s(event, this._state.sha1s);
      await _fs.default.promises.appendFile(this._state.traceFile, JSON.stringify(event) + '\n');
    });
  }

  _appendResource(sha1, buffer) {
    if (this._allResources.has(sha1)) return;

    this._allResources.add(sha1);

    this._appendTraceOperation(async () => {
      const resourcePath = _path.default.join(this._resourcesDir, sha1);

      try {
        // Perhaps we've already written this resource?
        await _fs.default.promises.access(resourcePath);
      } catch (e) {
        // If not, let's write! Note that async access is safe because we
        // never remove resources until the very end.
        await _fs.default.promises.writeFile(resourcePath, buffer).catch(() => {});
      }
    });
  }

  async _appendTraceOperation(cb) {
    // This method serializes all writes to the trace.
    let error;
    let result;
    this._writeChain = this._writeChain.then(async () => {
      if (!this._context._browser.isConnected()) return;

      try {
        result = await cb();
      } catch (e) {
        error = e;
      }
    });
    await this._writeChain;
    if (error) throw error;
    return result;
  }

}

exports.Tracing = Tracing;

function visitSha1s(object, sha1s) {
  if (Array.isArray(object)) {
    object.forEach(o => visitSha1s(o, sha1s));
    return;
  }

  if (typeof object === 'object') {
    for (const key in object) {
      if (key === 'sha1' || key === '_sha1' || key.endsWith('Sha1')) {
        const sha1 = object[key];
        if (sha1) sha1s.add(sha1);
      }

      visitSha1s(object[key], sha1s);
    }

    return;
  }
}

function shouldCaptureSnapshot(metadata) {
  return _channels.commandsWithTracingSnapshots.has(metadata.type + '.' + metadata.method);
}