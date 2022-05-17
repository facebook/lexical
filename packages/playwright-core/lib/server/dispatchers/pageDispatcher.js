"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WorkerDispatcher = exports.PageDispatcher = exports.BindingCallDispatcher = void 0;

var _page = require("../page");

var _dispatcher = require("./dispatcher");

var _serializers = require("../../protocol/serializers");

var _consoleMessageDispatcher = require("./consoleMessageDispatcher");

var _dialogDispatcher = require("./dialogDispatcher");

var _frameDispatcher = require("./frameDispatcher");

var _networkDispatchers = require("./networkDispatchers");

var _jsHandleDispatcher = require("./jsHandleDispatcher");

var _elementHandlerDispatcher = require("./elementHandlerDispatcher");

var _artifactDispatcher = require("./artifactDispatcher");

var _utils = require("../../utils");

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class PageDispatcher extends _dispatcher.Dispatcher {
  static fromNullable(scope, page) {
    if (!page) return undefined;
    const result = (0, _dispatcher.existingDispatcher)(page);
    return result || new PageDispatcher(scope, page);
  }

  constructor(scope, page) {
    // TODO: theoretically, there could be more than one frame already.
    // If we split pageCreated and pageReady, there should be no main frame during pageCreated.
    super(scope, page, 'Page', {
      mainFrame: _frameDispatcher.FrameDispatcher.from(scope, page.mainFrame()),
      viewportSize: page.viewportSize() || undefined,
      isClosed: page.isClosed(),
      opener: PageDispatcher.fromNullable(scope, page.opener())
    }, true);
    this._type_EventTarget = true;
    this._type_Page = true;
    this._page = void 0;
    this._page = page;
    page.on(_page.Page.Events.Close, () => {
      this._dispatchEvent('close');

      this._dispose();
    });
    page.on(_page.Page.Events.Console, message => this._dispatchEvent('console', {
      message: new _consoleMessageDispatcher.ConsoleMessageDispatcher(this._scope, message)
    }));
    page.on(_page.Page.Events.Crash, () => this._dispatchEvent('crash'));
    page.on(_page.Page.Events.DOMContentLoaded, () => this._dispatchEvent('domcontentloaded'));
    page.on(_page.Page.Events.Dialog, dialog => this._dispatchEvent('dialog', {
      dialog: new _dialogDispatcher.DialogDispatcher(this._scope, dialog)
    }));
    page.on(_page.Page.Events.Download, download => {
      this._dispatchEvent('download', {
        url: download.url,
        suggestedFilename: download.suggestedFilename(),
        artifact: new _artifactDispatcher.ArtifactDispatcher(scope, download.artifact)
      });
    });

    this._page.on(_page.Page.Events.FileChooser, fileChooser => this._dispatchEvent('fileChooser', {
      element: _elementHandlerDispatcher.ElementHandleDispatcher.from(this._scope, fileChooser.element()),
      isMultiple: fileChooser.isMultiple()
    }));

    page.on(_page.Page.Events.FrameAttached, frame => this._onFrameAttached(frame));
    page.on(_page.Page.Events.FrameDetached, frame => this._onFrameDetached(frame));
    page.on(_page.Page.Events.Load, () => this._dispatchEvent('load'));
    page.on(_page.Page.Events.PageError, error => this._dispatchEvent('pageError', {
      error: (0, _serializers.serializeError)(error)
    }));
    page.on(_page.Page.Events.WebSocket, webSocket => this._dispatchEvent('webSocket', {
      webSocket: new _networkDispatchers.WebSocketDispatcher(this._scope, webSocket)
    }));
    page.on(_page.Page.Events.Worker, worker => this._dispatchEvent('worker', {
      worker: new WorkerDispatcher(this._scope, worker)
    }));
    page.on(_page.Page.Events.Video, artifact => this._dispatchEvent('video', {
      artifact: (0, _dispatcher.existingDispatcher)(artifact)
    }));
    if (page._video) this._dispatchEvent('video', {
      artifact: (0, _dispatcher.existingDispatcher)(page._video)
    }); // Ensure client knows about all frames.

    const frames = page._frameManager.frames();

    for (let i = 1; i < frames.length; i++) this._onFrameAttached(frames[i]);
  }

  page() {
    return this._page;
  }

  async setDefaultNavigationTimeoutNoReply(params, metadata) {
    this._page.setDefaultNavigationTimeout(params.timeout);
  }

  async setDefaultTimeoutNoReply(params, metadata) {
    this._page.setDefaultTimeout(params.timeout);
  }

  async exposeBinding(params, metadata) {
    await this._page.exposeBinding(params.name, !!params.needsHandle, (source, ...args) => {
      const binding = new BindingCallDispatcher(this._scope, params.name, !!params.needsHandle, source, args);

      this._dispatchEvent('bindingCall', {
        binding
      });

      return binding.promise();
    });
  }

  async removeExposedBindings() {
    await this._page.removeExposedBindings();
  }

  async setExtraHTTPHeaders(params, metadata) {
    await this._page.setExtraHTTPHeaders(params.headers);
  }

  async reload(params, metadata) {
    return {
      response: (0, _dispatcher.lookupNullableDispatcher)(await this._page.reload(metadata, params))
    };
  }

  async goBack(params, metadata) {
    return {
      response: (0, _dispatcher.lookupNullableDispatcher)(await this._page.goBack(metadata, params))
    };
  }

  async goForward(params, metadata) {
    return {
      response: (0, _dispatcher.lookupNullableDispatcher)(await this._page.goForward(metadata, params))
    };
  }

  async emulateMedia(params, metadata) {
    await this._page.emulateMedia({
      media: params.media === 'null' ? null : params.media,
      colorScheme: params.colorScheme === 'null' ? null : params.colorScheme,
      reducedMotion: params.reducedMotion === 'null' ? null : params.reducedMotion,
      forcedColors: params.forcedColors === 'null' ? null : params.forcedColors
    });
  }

  async setViewportSize(params, metadata) {
    await this._page.setViewportSize(params.viewportSize);
  }

  async addInitScript(params, metadata) {
    await this._page.addInitScript(params.source);
  }

  async removeInitScripts() {
    await this._page.removeInitScripts();
  }

  async setNetworkInterceptionEnabled(params, metadata) {
    if (!params.enabled) {
      await this._page.setClientRequestInterceptor(undefined);
      return;
    }

    await this._page.setClientRequestInterceptor((route, request) => {
      this._dispatchEvent('route', {
        route: _networkDispatchers.RouteDispatcher.from(this._scope, route),
        request: _networkDispatchers.RequestDispatcher.from(this._scope, request)
      });
    });
  }

  async expectScreenshot(params, metadata) {
    var _params$screenshotOpt, _result$diff, _result$actual, _result$previous;

    const mask = (((_params$screenshotOpt = params.screenshotOptions) === null || _params$screenshotOpt === void 0 ? void 0 : _params$screenshotOpt.mask) || []).map(({
      frame,
      selector
    }) => ({
      frame: frame._object,
      selector
    }));
    const locator = params.locator ? {
      frame: params.locator.frame._object,
      selector: params.locator.selector
    } : undefined;
    const expected = params.expected ? Buffer.from(params.expected, 'base64') : undefined;
    const result = await this._page.expectScreenshot(metadata, { ...params,
      expected,
      locator,
      screenshotOptions: { ...params.screenshotOptions,
        mask
      }
    });
    return {
      diff: (_result$diff = result.diff) === null || _result$diff === void 0 ? void 0 : _result$diff.toString('base64'),
      errorMessage: result.errorMessage,
      actual: (_result$actual = result.actual) === null || _result$actual === void 0 ? void 0 : _result$actual.toString('base64'),
      previous: (_result$previous = result.previous) === null || _result$previous === void 0 ? void 0 : _result$previous.toString('base64'),
      log: result.log
    };
  }

  async screenshot(params, metadata) {
    const mask = (params.mask || []).map(({
      frame,
      selector
    }) => ({
      frame: frame._object,
      selector
    }));
    return {
      binary: (await this._page.screenshot(metadata, { ...params,
        mask
      })).toString('base64')
    };
  }

  async close(params, metadata) {
    await this._page.close(metadata, params);
  }

  async setFileChooserInterceptedNoReply(params, metadata) {
    await this._page.setFileChooserIntercepted(params.intercepted);
  }

  async keyboardDown(params, metadata) {
    await this._page.keyboard.down(params.key);
  }

  async keyboardUp(params, metadata) {
    await this._page.keyboard.up(params.key);
  }

  async keyboardImeSetComposition(params, metadata) {
    await this._page.keyboard.imeSetComposition(params.text, params.selectionStart, params.selectionEnd, params);
  }

  async keyboardInsertText(params, metadata) {
    await this._page.keyboard.insertText(params.text);
  }

  async keyboardType(params, metadata) {
    await this._page.keyboard.type(params.text, params);
  }

  async keyboardPress(params, metadata) {
    await this._page.keyboard.press(params.key, params);
  }

  async mouseMove(params, metadata) {
    await this._page.mouse.move(params.x, params.y, params);
  }

  async mouseDown(params, metadata) {
    await this._page.mouse.down(params);
  }

  async mouseUp(params, metadata) {
    await this._page.mouse.up(params);
  }

  async mouseClick(params, metadata) {
    await this._page.mouse.click(params.x, params.y, params);
  }

  async mouseWheel(params, metadata) {
    await this._page.mouse.wheel(params.deltaX, params.deltaY);
  }

  async touchscreenTap(params, metadata) {
    await this._page.touchscreen.tap(params.x, params.y);
  }

  async accessibilitySnapshot(params, metadata) {
    const rootAXNode = await this._page.accessibility.snapshot({
      interestingOnly: params.interestingOnly,
      root: params.root ? params.root._elementHandle : undefined
    });
    return {
      rootAXNode: rootAXNode || undefined
    };
  }

  async pdf(params, metadata) {
    if (!this._page.pdf) throw new Error('PDF generation is only supported for Headless Chromium');
    const buffer = await this._page.pdf(params);
    return {
      pdf: buffer.toString('base64')
    };
  }

  async bringToFront(params, metadata) {
    await this._page.bringToFront();
  }

  async startJSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    await coverage.startJSCoverage(params);
  }

  async stopJSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    return {
      entries: await coverage.stopJSCoverage()
    };
  }

  async startCSSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    await coverage.startCSSCoverage(params);
  }

  async stopCSSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    return {
      entries: await coverage.stopCSSCoverage()
    };
  }

  _onFrameAttached(frame) {
    this._dispatchEvent('frameAttached', {
      frame: _frameDispatcher.FrameDispatcher.from(this._scope, frame)
    });
  }

  _onFrameDetached(frame) {
    this._dispatchEvent('frameDetached', {
      frame: (0, _dispatcher.lookupDispatcher)(frame)
    });
  }

}

exports.PageDispatcher = PageDispatcher;

class WorkerDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, worker) {
    super(scope, worker, 'Worker', {
      url: worker.url()
    });
    this._type_Worker = true;
    worker.on(_page.Worker.Events.Close, () => this._dispatchEvent('close'));
  }

  async evaluateExpression(params, metadata) {
    return {
      value: (0, _jsHandleDispatcher.serializeResult)(await this._object.evaluateExpression(params.expression, params.isFunction, (0, _jsHandleDispatcher.parseArgument)(params.arg)))
    };
  }

  async evaluateExpressionHandle(params, metadata) {
    return {
      handle: _elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(this._scope, await this._object.evaluateExpressionHandle(params.expression, params.isFunction, (0, _jsHandleDispatcher.parseArgument)(params.arg)))
    };
  }

}

exports.WorkerDispatcher = WorkerDispatcher;

class BindingCallDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, name, needsHandle, source, args) {
    super(scope, {
      guid: 'bindingCall@' + (0, _utils.createGuid)()
    }, 'BindingCall', {
      frame: (0, _dispatcher.lookupDispatcher)(source.frame),
      name,
      args: needsHandle ? undefined : args.map(_jsHandleDispatcher.serializeResult),
      handle: needsHandle ? _elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(scope, args[0]) : undefined
    });
    this._type_BindingCall = true;
    this._resolve = void 0;
    this._reject = void 0;
    this._promise = void 0;
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  promise() {
    return this._promise;
  }

  async resolve(params, metadata) {
    this._resolve((0, _jsHandleDispatcher.parseArgument)(params.result));
  }

  async reject(params, metadata) {
    this._reject((0, _serializers.parseError)(params.error));
  }

}

exports.BindingCallDispatcher = BindingCallDispatcher;