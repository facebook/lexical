"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Recorder = void 0;

var fs = _interopRequireWildcard(require("fs"));

var _codeGenerator = require("./recorder/codeGenerator");

var _utils = require("./recorder/utils");

var _page = require("./page");

var _frames = require("./frames");

var _browserContext = require("./browserContext");

var _java = require("./recorder/java");

var _javascript = require("./recorder/javascript");

var _csharp = require("./recorder/csharp");

var _python = require("./recorder/python");

var recorderSource = _interopRequireWildcard(require("../generated/recorderSource"));

var consoleApiSource = _interopRequireWildcard(require("../generated/consoleApiSource"));

var _recorderApp = require("./recorder/recorderApp");

var _utils2 = require("../utils");

var _recorderUtils = require("./recorder/recorderUtils");

var _debugger = require("./debugger");

var _events = require("events");

var _timeoutRunner = require("../utils/timeoutRunner");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
const symbol = Symbol('RecorderSupplement');

class Recorder {
  static showInspector(context) {
    Recorder.show(context, {}).catch(() => {});
  }

  static show(context, params = {}) {
    let recorderPromise = context[symbol];

    if (!recorderPromise) {
      const recorder = new Recorder(context, params);
      recorderPromise = recorder.install().then(() => recorder);
      context[symbol] = recorderPromise;
    }

    return recorderPromise;
  }

  constructor(context, params) {
    this._context = void 0;
    this._mode = void 0;
    this._highlightedSelector = '';
    this._recorderApp = null;
    this._currentCallsMetadata = new Map();
    this._recorderSources = [];
    this._userSources = new Map();
    this._allMetadatas = new Map();
    this._debugger = void 0;
    this._contextRecorder = void 0;
    this._mode = params.startRecording ? 'recording' : 'none';
    this._contextRecorder = new ContextRecorder(context, params);
    this._context = context;
    this._debugger = _debugger.Debugger.lookup(context);
    context.instrumentation.addListener(this, context);
  }

  async install() {
    const recorderApp = await _recorderApp.RecorderApp.open(this._context._browser.options.sdkLanguage, !!this._context._browser.options.headful);
    this._recorderApp = recorderApp;
    recorderApp.once('close', () => {
      this._debugger.resume(false);

      this._recorderApp = null;
    });
    recorderApp.on('event', data => {
      if (data.event === 'setMode') {
        this._setMode(data.params.mode);

        this._refreshOverlay();

        return;
      }

      if (data.event === 'selectorUpdated') {
        this._highlightedSelector = data.params.selector;

        this._refreshOverlay();

        return;
      }

      if (data.event === 'step') {
        this._debugger.resume(true);

        return;
      }

      if (data.event === 'resume') {
        this._debugger.resume(false);

        return;
      }

      if (data.event === 'pause') {
        this._debugger.pauseOnNextStatement();

        return;
      }

      if (data.event === 'clear') {
        this._contextRecorder.clearScript();

        return;
      }
    });
    await Promise.all([recorderApp.setMode(this._mode), recorderApp.setPaused(this._debugger.isPaused()), this._pushAllSources()]);

    this._context.once(_browserContext.BrowserContext.Events.Close, () => {
      this._contextRecorder.dispose();

      this._context.instrumentation.removeListener(this);

      recorderApp.close().catch(() => {});
    });

    this._contextRecorder.on(ContextRecorder.Events.Change, data => {
      var _this$_recorderApp;

      this._recorderSources = data.sources;

      this._pushAllSources();

      (_this$_recorderApp = this._recorderApp) === null || _this$_recorderApp === void 0 ? void 0 : _this$_recorderApp.setFileIfNeeded(data.primaryFileName);
    });

    await this._context.exposeBinding('__pw_recorderState', false, source => {
      let actionSelector = this._highlightedSelector;
      let actionPoint;

      for (const [metadata, sdkObject] of this._currentCallsMetadata) {
        if (source.page === sdkObject.attribution.page) {
          actionPoint = metadata.point || actionPoint;
          actionSelector = actionSelector || metadata.params.selector;
        }
      }

      const uiState = {
        mode: this._mode,
        actionPoint,
        actionSelector
      };
      return uiState;
    });
    await this._context.exposeBinding('__pw_recorderSetSelector', false, async (_, selector) => {
      var _this$_recorderApp2, _this$_recorderApp3;

      this._setMode('none');

      await ((_this$_recorderApp2 = this._recorderApp) === null || _this$_recorderApp2 === void 0 ? void 0 : _this$_recorderApp2.setSelector(selector, true));
      await ((_this$_recorderApp3 = this._recorderApp) === null || _this$_recorderApp3 === void 0 ? void 0 : _this$_recorderApp3.bringToFront());
    });
    await this._context.exposeBinding('__pw_resume', false, () => {
      this._debugger.resume(false);
    });
    await this._context.extendInjectedScript(consoleApiSource.source);
    await this._contextRecorder.install();
    if (this._debugger.isPaused()) this._pausedStateChanged();

    this._debugger.on(_debugger.Debugger.Events.PausedStateChanged, () => this._pausedStateChanged());

    this._context.recorderAppForTest = recorderApp;
  }

  _pausedStateChanged() {
    var _this$_recorderApp4;

    // If we are called upon page.pause, we don't have metadatas, populate them.
    for (const {
      metadata,
      sdkObject
    } of this._debugger.pausedDetails()) {
      if (!this._currentCallsMetadata.has(metadata)) this.onBeforeCall(sdkObject, metadata);
    }

    (_this$_recorderApp4 = this._recorderApp) === null || _this$_recorderApp4 === void 0 ? void 0 : _this$_recorderApp4.setPaused(this._debugger.isPaused());

    this._updateUserSources();

    this.updateCallLog([...this._currentCallsMetadata.keys()]);
  }

  _setMode(mode) {
    var _this$_recorderApp5;

    this._mode = mode;
    (_this$_recorderApp5 = this._recorderApp) === null || _this$_recorderApp5 === void 0 ? void 0 : _this$_recorderApp5.setMode(this._mode);

    this._contextRecorder.setEnabled(this._mode === 'recording');

    this._debugger.setMuted(this._mode === 'recording');

    if (this._mode !== 'none') this._context.pages()[0].bringToFront().catch(() => {});
  }

  _refreshOverlay() {
    for (const page of this._context.pages()) page.mainFrame().evaluateExpression('window.__pw_refreshOverlay()', false, undefined, 'main').catch(() => {});
  }

  async onBeforeCall(sdkObject, metadata) {
    if (this._mode === 'recording') return;

    this._currentCallsMetadata.set(metadata, sdkObject);

    this._allMetadatas.set(metadata.id, metadata);

    this._updateUserSources();

    this.updateCallLog([metadata]);

    if (metadata.params && metadata.params.selector) {
      var _this$_recorderApp6;

      this._highlightedSelector = metadata.params.selector;
      (_this$_recorderApp6 = this._recorderApp) === null || _this$_recorderApp6 === void 0 ? void 0 : _this$_recorderApp6.setSelector(this._highlightedSelector).catch(() => {});
    }
  }

  async onAfterCall(sdkObject, metadata) {
    if (this._mode === 'recording') return;
    if (!metadata.error) this._currentCallsMetadata.delete(metadata);

    this._updateUserSources();

    this.updateCallLog([metadata]);
  }

  _updateUserSources() {
    var _this$_recorderApp7;

    // Remove old decorations.
    for (const source of this._userSources.values()) {
      source.highlight = [];
      source.revealLine = undefined;
    } // Apply new decorations.


    let fileToSelect = undefined;

    for (const metadata of this._currentCallsMetadata.keys()) {
      if (!metadata.stack || !metadata.stack[0]) continue;
      const {
        file,
        line
      } = metadata.stack[0];

      let source = this._userSources.get(file);

      if (!source) {
        source = {
          isRecorded: false,
          file,
          text: this._readSource(file),
          highlight: [],
          language: languageForFile(file)
        };

        this._userSources.set(file, source);
      }

      if (line) {
        const paused = this._debugger.isPaused(metadata);

        source.highlight.push({
          line,
          type: metadata.error ? 'error' : paused ? 'paused' : 'running'
        });
        source.revealLine = line;
        fileToSelect = source.file;
      }
    }

    this._pushAllSources();

    if (fileToSelect) (_this$_recorderApp7 = this._recorderApp) === null || _this$_recorderApp7 === void 0 ? void 0 : _this$_recorderApp7.setFileIfNeeded(fileToSelect);
  }

  _pushAllSources() {
    var _this$_recorderApp8;

    (_this$_recorderApp8 = this._recorderApp) === null || _this$_recorderApp8 === void 0 ? void 0 : _this$_recorderApp8.setSources([...this._recorderSources, ...this._userSources.values()]);
  }

  async onBeforeInputAction(sdkObject, metadata) {}

  async onCallLog(sdkObject, metadata, logName, message) {
    this.updateCallLog([metadata]);
  }

  updateCallLog(metadatas) {
    var _this$_recorderApp9;

    if (this._mode === 'recording') return;
    const logs = [];

    for (const metadata of metadatas) {
      if (!metadata.method || metadata.internal) continue;
      let status = 'done';
      if (this._currentCallsMetadata.has(metadata)) status = 'in-progress';
      if (this._debugger.isPaused(metadata)) status = 'paused';
      logs.push((0, _recorderUtils.metadataToCallLog)(metadata, status));
    }

    (_this$_recorderApp9 = this._recorderApp) === null || _this$_recorderApp9 === void 0 ? void 0 : _this$_recorderApp9.updateCallLogs(logs);
  }

  _readSource(fileName) {
    try {
      return fs.readFileSync(fileName, 'utf-8');
    } catch (e) {
      return '// No source available';
    }
  }

}

exports.Recorder = Recorder;

class ContextRecorder extends _events.EventEmitter {
  constructor(context, params) {
    super();
    this._generator = void 0;
    this._pageAliases = new Map();
    this._lastPopupOrdinal = 0;
    this._lastDialogOrdinal = 0;
    this._lastDownloadOrdinal = 0;
    this._timers = new Set();
    this._context = void 0;
    this._params = void 0;
    this._recorderSources = void 0;
    this._context = context;
    this._params = params;
    const language = params.language || context._browser.options.sdkLanguage;
    const languages = new Set([new _java.JavaLanguageGenerator(), new _javascript.JavaScriptLanguageGenerator(false), new _javascript.JavaScriptLanguageGenerator(true), new _python.PythonLanguageGenerator(false, false), new _python.PythonLanguageGenerator(true, false), new _python.PythonLanguageGenerator(false, true), new _csharp.CSharpLanguageGenerator()]);
    const primaryLanguage = [...languages].find(l => l.id === language);
    if (!primaryLanguage) throw new Error(`\n===============================\nUnsupported language: '${language}'\n===============================\n`);
    languages.delete(primaryLanguage);
    const orderedLanguages = [primaryLanguage, ...languages];
    this._recorderSources = [];
    const generator = new _codeGenerator.CodeGenerator(context._browser.options.name, !!params.startRecording, params.launchOptions || {}, params.contextOptions || {}, params.device, params.saveStorage);
    const throttledOutputFile = params.outputFile ? new ThrottledFile(params.outputFile) : null;
    generator.on('change', () => {
      this._recorderSources = [];

      for (const languageGenerator of orderedLanguages) {
        const source = {
          isRecorded: true,
          file: languageGenerator.fileName,
          text: generator.generateText(languageGenerator),
          language: languageGenerator.highlighter,
          highlight: []
        };
        source.revealLine = source.text.split('\n').length - 1;

        this._recorderSources.push(source);

        if (languageGenerator === orderedLanguages[0]) throttledOutputFile === null || throttledOutputFile === void 0 ? void 0 : throttledOutputFile.setContent(source.text);
      }

      this.emit(ContextRecorder.Events.Change, {
        sources: this._recorderSources,
        primaryFileName: primaryLanguage.fileName
      });
    });

    if (throttledOutputFile) {
      context.on(_browserContext.BrowserContext.Events.BeforeClose, () => {
        throttledOutputFile.flush();
      });
      process.on('exit', () => {
        throttledOutputFile.flush();
      });
    }

    this._generator = generator;
  }

  async install() {
    this._context.on(_browserContext.BrowserContext.Events.Page, page => this._onPage(page));

    for (const page of this._context.pages()) this._onPage(page); // Input actions that potentially lead to navigation are intercepted on the page and are
    // performed by the Playwright.


    await this._context.exposeBinding('__pw_recorderPerformAction', false, (source, action) => this._performAction(source.frame, action)); // Other non-essential actions are simply being recorded.

    await this._context.exposeBinding('__pw_recorderRecordAction', false, (source, action) => this._recordAction(source.frame, action));
    await this._context.extendInjectedScript(recorderSource.source);
  }

  setEnabled(enabled) {
    this._generator.setEnabled(enabled);
  }

  dispose() {
    for (const timer of this._timers) clearTimeout(timer);

    this._timers.clear();
  }

  async _onPage(page) {
    // First page is called page, others are called popup1, popup2, etc.
    const frame = page.mainFrame();
    page.on('close', () => {
      this._generator.addAction({
        frame: this._describeMainFrame(page),
        committed: true,
        action: {
          name: 'closePage',
          signals: []
        }
      });

      this._pageAliases.delete(page);
    });
    frame.on(_frames.Frame.Events.Navigation, () => this._onFrameNavigated(frame, page));
    page.on(_page.Page.Events.Download, () => this._onDownload(page));
    page.on(_page.Page.Events.Dialog, () => this._onDialog(page));
    const suffix = this._pageAliases.size ? String(++this._lastPopupOrdinal) : '';
    const pageAlias = 'page' + suffix;

    this._pageAliases.set(page, pageAlias);

    if (page.opener()) {
      this._onPopup(page.opener(), page);
    } else {
      this._generator.addAction({
        frame: this._describeMainFrame(page),
        committed: true,
        action: {
          name: 'openPage',
          url: page.mainFrame().url(),
          signals: []
        }
      });
    }
  }

  clearScript() {
    this._generator.restart();

    if (!!this._params.startRecording) {
      for (const page of this._context.pages()) this._onFrameNavigated(page.mainFrame(), page);
    }
  }

  _describeMainFrame(page) {
    return {
      pageAlias: this._pageAliases.get(page),
      isMainFrame: true,
      url: page.mainFrame().url()
    };
  }

  async _describeFrame(frame) {
    const page = frame._page;

    const pageAlias = this._pageAliases.get(page);

    const chain = [];

    for (let ancestor = frame; ancestor; ancestor = ancestor.parentFrame()) chain.push(ancestor);

    chain.reverse();
    if (chain.length === 1) return this._describeMainFrame(page);
    const hasUniqueName = page.frames().filter(f => f.name() === frame.name()).length === 1;
    const fallback = {
      pageAlias,
      isMainFrame: false,
      url: frame.url(),
      name: frame.name() && hasUniqueName ? frame.name() : undefined
    };
    if (chain.length > 3) return fallback;
    const selectorPromises = [];

    for (let i = 0; i < chain.length - 1; i++) selectorPromises.push(this._findFrameSelector(chain[i + 1], chain[i]));

    const result = await (0, _timeoutRunner.raceAgainstTimeout)(() => Promise.all(selectorPromises), 2000);

    if (!result.timedOut && result.result.every(selector => !!selector)) {
      return { ...fallback,
        selectorsChain: result.result
      };
    }

    return fallback;
  }

  async _findFrameSelector(frame, parent) {
    try {
      const frameElement = await frame.frameElement();
      if (!frameElement) return;
      const utility = await parent._utilityContext();
      const injected = await utility.injectedScript();
      const selector = await injected.evaluate((injected, element) => injected.generateSelector(element), frameElement);
      return selector;
    } catch (e) {}
  }

  async _performAction(frame, action) {
    // Commit last action so that no further signals are added to it.
    this._generator.commitLastAction();

    const frameDescription = await this._describeFrame(frame);
    const actionInContext = {
      frame: frameDescription,
      action
    };

    const perform = async (action, params, cb) => {
      const callMetadata = {
        id: `call@${(0, _utils2.createGuid)()}`,
        apiName: 'frame.' + action,
        objectId: frame.guid,
        pageId: frame._page.guid,
        frameId: frame.guid,
        wallTime: Date.now(),
        startTime: (0, _utils2.monotonicTime)(),
        endTime: 0,
        type: 'Frame',
        method: action,
        params,
        log: [],
        snapshots: []
      };

      this._generator.willPerformAction(actionInContext);

      try {
        await frame.instrumentation.onBeforeCall(frame, callMetadata);
        await cb(callMetadata);
      } catch (e) {
        callMetadata.endTime = (0, _utils2.monotonicTime)();
        await frame.instrumentation.onAfterCall(frame, callMetadata);

        this._generator.performedActionFailed(actionInContext);

        return;
      }

      callMetadata.endTime = (0, _utils2.monotonicTime)();
      await frame.instrumentation.onAfterCall(frame, callMetadata);
      const timer = setTimeout(() => {
        // Commit the action after 5 seconds so that no further signals are added to it.
        actionInContext.committed = true;

        this._timers.delete(timer);
      }, 5000);

      this._generator.didPerformAction(actionInContext);

      this._timers.add(timer);
    };

    const kActionTimeout = 5000;

    if (action.name === 'click') {
      const {
        options
      } = (0, _utils.toClickOptions)(action);
      await perform('click', {
        selector: action.selector
      }, callMetadata => frame.click(callMetadata, action.selector, { ...options,
        timeout: kActionTimeout,
        strict: true
      }));
    }

    if (action.name === 'press') {
      const modifiers = (0, _utils.toModifiers)(action.modifiers);
      const shortcut = [...modifiers, action.key].join('+');
      await perform('press', {
        selector: action.selector,
        key: shortcut
      }, callMetadata => frame.press(callMetadata, action.selector, shortcut, {
        timeout: kActionTimeout,
        strict: true
      }));
    }

    if (action.name === 'check') await perform('check', {
      selector: action.selector
    }, callMetadata => frame.check(callMetadata, action.selector, {
      timeout: kActionTimeout,
      strict: true
    }));
    if (action.name === 'uncheck') await perform('uncheck', {
      selector: action.selector
    }, callMetadata => frame.uncheck(callMetadata, action.selector, {
      timeout: kActionTimeout,
      strict: true
    }));

    if (action.name === 'select') {
      const values = action.options.map(value => ({
        value
      }));
      await perform('selectOption', {
        selector: action.selector,
        values
      }, callMetadata => frame.selectOption(callMetadata, action.selector, [], values, {
        timeout: kActionTimeout,
        strict: true
      }));
    }
  }

  async _recordAction(frame, action) {
    // Commit last action so that no further signals are added to it.
    this._generator.commitLastAction();

    const frameDescription = await this._describeFrame(frame);
    const actionInContext = {
      frame: frameDescription,
      action
    };

    this._generator.addAction(actionInContext);
  }

  _onFrameNavigated(frame, page) {
    const pageAlias = this._pageAliases.get(page);

    this._generator.signal(pageAlias, frame, {
      name: 'navigation',
      url: frame.url()
    });
  }

  _onPopup(page, popup) {
    const pageAlias = this._pageAliases.get(page);

    const popupAlias = this._pageAliases.get(popup);

    this._generator.signal(pageAlias, page.mainFrame(), {
      name: 'popup',
      popupAlias
    });
  }

  _onDownload(page) {
    const pageAlias = this._pageAliases.get(page);

    this._generator.signal(pageAlias, page.mainFrame(), {
      name: 'download',
      downloadAlias: String(++this._lastDownloadOrdinal)
    });
  }

  _onDialog(page) {
    const pageAlias = this._pageAliases.get(page);

    this._generator.signal(pageAlias, page.mainFrame(), {
      name: 'dialog',
      dialogAlias: String(++this._lastDialogOrdinal)
    });
  }

}

ContextRecorder.Events = {
  Change: 'change'
};

function languageForFile(file) {
  if (file.endsWith('.py')) return 'python';
  if (file.endsWith('.java')) return 'java';
  if (file.endsWith('.cs')) return 'csharp';
  return 'javascript';
}

class ThrottledFile {
  constructor(file) {
    this._file = void 0;
    this._timer = void 0;
    this._text = void 0;
    this._file = file;
  }

  setContent(text) {
    this._text = text;
    if (!this._timer) this._timer = setTimeout(() => this.flush(), 1000);
  }

  flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }

    if (this._text) fs.writeFileSync(this._file, this._text);
    this._text = undefined;
  }

}