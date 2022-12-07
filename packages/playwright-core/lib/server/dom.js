"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NonRecoverableDOMError = exports.InjectedScriptPollHandler = exports.FrameExecutionContext = exports.ElementHandle = void 0;
exports.assertDone = assertDone;
exports.isNonRecoverableDOMError = isNonRecoverableDOMError;
exports.kUnableToAdoptErrorMessage = void 0;
exports.throwRetargetableDOMError = throwRetargetableDOMError;
exports.waitForSelectorTask = waitForSelectorTask;
var _utilsBundle = require("../utilsBundle");
var injectedScriptSource = _interopRequireWildcard(require("../generated/injectedScriptSource"));
var _protocolError = require("./protocolError");
var js = _interopRequireWildcard(require("./javascript"));
var _progress = require("./progress");
var _utils = require("../utils");
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

class NonRecoverableDOMError extends Error {}
exports.NonRecoverableDOMError = NonRecoverableDOMError;
function isNonRecoverableDOMError(error) {
  return error instanceof NonRecoverableDOMError;
}
class FrameExecutionContext extends js.ExecutionContext {
  constructor(delegate, frame, world) {
    super(frame, delegate);
    this.frame = void 0;
    this._injectedScriptPromise = void 0;
    this.world = void 0;
    this.frame = frame;
    this.world = world;
  }
  async waitForSignalsCreatedBy(action) {
    return this.frame._page._frameManager.waitForSignalsCreatedBy(null, false, action);
  }
  adoptIfNeeded(handle) {
    if (handle instanceof ElementHandle && handle._context !== this) return this.frame._page._delegate.adoptElementHandle(handle, this);
    return null;
  }
  async evaluate(pageFunction, arg) {
    return js.evaluate(this, true /* returnByValue */, pageFunction, arg);
  }
  async evaluateHandle(pageFunction, arg) {
    return js.evaluate(this, false /* returnByValue */, pageFunction, arg);
  }
  async evaluateExpression(expression, options, arg) {
    return js.evaluateExpression(this, expression, {
      ...options,
      returnByValue: true
    }, arg);
  }
  async evaluateExpressionAndWaitForSignals(expression, options, arg) {
    return await this.frame._page._frameManager.waitForSignalsCreatedBy(null, false /* noWaitFor */, async () => {
      return this.evaluateExpression(expression, options, arg);
    });
  }
  async evaluateExpressionHandleAndWaitForSignals(expression, options, arg) {
    return await this.frame._page._frameManager.waitForSignalsCreatedBy(null, false /* noWaitFor */, async () => {
      return js.evaluateExpression(this, expression, {
        ...options,
        returnByValue: false
      }, arg);
    });
  }
  createHandle(remoteObject) {
    if (this.frame._page._delegate.isElementHandle(remoteObject)) return new ElementHandle(this, remoteObject.objectId);
    return super.createHandle(remoteObject);
  }
  injectedScript() {
    if (!this._injectedScriptPromise) {
      const custom = [];
      for (const [name, {
        source
      }] of this.frame._page.selectors._engines) custom.push(`{ name: '${name}', engine: (${source}) }`);
      const sdkLanguage = this.frame._page.context()._browser.options.sdkLanguage;
      const source = `
        (() => {
        const module = {};
        ${injectedScriptSource.source}
        return new module.exports(
          ${(0, _utils.isUnderTest)()},
          "${sdkLanguage}",
          ${JSON.stringify(this.frame._page.selectors.testIdAttributeName())},
          ${this.frame._page._delegate.rafCountForStablePosition()},
          "${this.frame._page._browserContext._browser.options.name}",
          [${custom.join(',\n')}]
        );
        })();
      `;
      this._injectedScriptPromise = this.rawEvaluateHandle(source).then(objectId => new js.JSHandle(this, 'object', undefined, objectId));
    }
    return this._injectedScriptPromise;
  }
}
exports.FrameExecutionContext = FrameExecutionContext;
class ElementHandle extends js.JSHandle {
  constructor(context, objectId) {
    super(context, 'node', undefined, objectId);
    this.__elementhandle = true;
    this._page = void 0;
    this._frame = void 0;
    this._page = context.frame._page;
    this._frame = context.frame;
    this._initializePreview().catch(e => {});
  }
  async _initializePreview() {
    const utility = await this._context.injectedScript();
    this._setPreview(await utility.evaluate((injected, e) => 'JSHandle@' + injected.previewNode(e), this));
  }
  asElement() {
    return this;
  }
  async evaluateInUtility(pageFunction, arg) {
    try {
      const utility = await this._frame._utilityContext();
      return await utility.evaluate(pageFunction, [await utility.injectedScript(), this, arg]);
    } catch (e) {
      if (js.isJavaScriptErrorInEvaluate(e) || (0, _protocolError.isSessionClosedError)(e)) throw e;
      return 'error:notconnected';
    }
  }
  async evaluateHandleInUtility(pageFunction, arg) {
    try {
      const utility = await this._frame._utilityContext();
      return await utility.evaluateHandle(pageFunction, [await utility.injectedScript(), this, arg]);
    } catch (e) {
      if (js.isJavaScriptErrorInEvaluate(e) || (0, _protocolError.isSessionClosedError)(e)) throw e;
      return 'error:notconnected';
    }
  }
  async evaluatePoll(progress, pageFunction, arg) {
    try {
      const utility = await this._frame._utilityContext();
      const poll = await utility.evaluateHandle(pageFunction, [await utility.injectedScript(), this, arg]);
      const pollHandler = new InjectedScriptPollHandler(progress, poll);
      return await pollHandler.finish();
    } catch (e) {
      if (js.isJavaScriptErrorInEvaluate(e) || (0, _protocolError.isSessionClosedError)(e)) throw e;
      return 'error:notconnected';
    }
  }
  async ownerFrame() {
    const frameId = await this._page._delegate.getOwnerFrame(this);
    if (!frameId) return null;
    const frame = this._page._frameManager.frame(frameId);
    if (frame) return frame;
    for (const page of this._page._browserContext.pages()) {
      const frame = page._frameManager.frame(frameId);
      if (frame) return frame;
    }
    return null;
  }
  async isIframeElement() {
    return this.evaluateInUtility(([injected, node]) => node && (node.nodeName === 'IFRAME' || node.nodeName === 'FRAME'), {});
  }
  async contentFrame() {
    const isFrameElement = throwRetargetableDOMError(await this.isIframeElement());
    if (!isFrameElement) return null;
    return this._page._delegate.getContentFrame(this);
  }
  async getAttribute(name) {
    return throwRetargetableDOMError(await this.evaluateInUtility(([injected, node, name]) => {
      if (node.nodeType !== Node.ELEMENT_NODE) throw injected.createStacklessError('Node is not an element');
      const element = node;
      return {
        value: element.getAttribute(name)
      };
    }, name)).value;
  }
  async inputValue() {
    return throwRetargetableDOMError(await this.evaluateInUtility(([injected, node]) => {
      const element = injected.retarget(node, 'follow-label');
      if (!element || element.nodeName !== 'INPUT' && element.nodeName !== 'TEXTAREA' && element.nodeName !== 'SELECT') throw injected.createStacklessError('Node is not an <input>, <textarea> or <select> element');
      return {
        value: element.value
      };
    }, undefined)).value;
  }
  async textContent() {
    return throwRetargetableDOMError(await this.evaluateInUtility(([injected, node]) => {
      return {
        value: node.textContent
      };
    }, undefined)).value;
  }
  async innerText() {
    return throwRetargetableDOMError(await this.evaluateInUtility(([injected, node]) => {
      if (node.nodeType !== Node.ELEMENT_NODE) throw injected.createStacklessError('Node is not an element');
      if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml') throw injected.createStacklessError('Node is not an HTMLElement');
      const element = node;
      return {
        value: element.innerText
      };
    }, undefined)).value;
  }
  async innerHTML() {
    return throwRetargetableDOMError(await this.evaluateInUtility(([injected, node]) => {
      if (node.nodeType !== Node.ELEMENT_NODE) throw injected.createStacklessError('Node is not an element');
      const element = node;
      return {
        value: element.innerHTML
      };
    }, undefined)).value;
  }
  async dispatchEvent(type, eventInit = {}) {
    const main = await this._frame._mainContext();
    await this._page._frameManager.waitForSignalsCreatedBy(null, false /* noWaitFor */, async () => {
      return main.evaluate(([injected, node, {
        type,
        eventInit
      }]) => injected.dispatchEvent(node, type, eventInit), [await main.injectedScript(), this, {
        type,
        eventInit
      }]);
    });
  }
  async _scrollRectIntoViewIfNeeded(rect) {
    return await this._page._delegate.scrollRectIntoViewIfNeeded(this, rect);
  }
  async _waitAndScrollIntoViewIfNeeded(progress, waitForVisible) {
    const timeouts = [0, 50, 100, 250];
    while (progress.isRunning()) {
      assertDone(throwRetargetableDOMError(await this._waitForElementStates(progress, waitForVisible ? ['visible', 'stable'] : ['stable'], false /* force */)));
      progress.throwIfAborted(); // Avoid action that has side-effects.
      const result = throwRetargetableDOMError(await this._scrollRectIntoViewIfNeeded());
      if (result === 'error:notvisible') {
        if (!waitForVisible) {
          var _timeouts$shift;
          // Wait for a timeout to avoid retrying too often when not waiting for visible.
          // If we wait for visible, this should be covered by _waitForElementStates instead.
          const timeout = (_timeouts$shift = timeouts.shift()) !== null && _timeouts$shift !== void 0 ? _timeouts$shift : 500;
          progress.log(`  element is not displayed, retrying in ${timeout}ms`);
          await new Promise(f => setTimeout(f, timeout));
        }
        continue;
      }
      assertDone(result);
      return;
    }
  }
  async scrollIntoViewIfNeeded(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(progress => this._waitAndScrollIntoViewIfNeeded(progress, false /* waitForVisible */), this._page._timeoutSettings.timeout(options));
  }
  async _clickablePoint() {
    const intersectQuadWithViewport = quad => {
      return quad.map(point => ({
        x: Math.min(Math.max(point.x, 0), metrics.width),
        y: Math.min(Math.max(point.y, 0), metrics.height)
      }));
    };
    const computeQuadArea = quad => {
      // Compute sum of all directed areas of adjacent triangles
      // https://en.wikipedia.org/wiki/Polygon#Simple_polygons
      let area = 0;
      for (let i = 0; i < quad.length; ++i) {
        const p1 = quad[i];
        const p2 = quad[(i + 1) % quad.length];
        area += (p1.x * p2.y - p2.x * p1.y) / 2;
      }
      return Math.abs(area);
    };
    const [quads, metrics] = await Promise.all([this._page._delegate.getContentQuads(this), this._page.mainFrame()._utilityContext().then(utility => utility.evaluate(() => ({
      width: innerWidth,
      height: innerHeight
    })))]);
    if (!quads || !quads.length) return 'error:notvisible';

    // Allow 1x1 elements. Compensate for rounding errors by comparing with 0.99 instead.
    const filtered = quads.map(quad => intersectQuadWithViewport(quad)).filter(quad => computeQuadArea(quad) > 0.99);
    if (!filtered.length) return 'error:notinviewport';
    // Return the middle point of the first quad.
    const result = {
      x: 0,
      y: 0
    };
    for (const point of filtered[0]) {
      result.x += point.x / 4;
      result.y += point.y / 4;
    }
    compensateHalfIntegerRoundingError(result);
    return result;
  }
  async _offsetPoint(offset) {
    const [box, border] = await Promise.all([this.boundingBox(), this.evaluateInUtility(([injected, node]) => injected.getElementBorderWidth(node), {}).catch(e => {})]);
    if (!box || !border) return 'error:notvisible';
    if (border === 'error:notconnected') return border;
    // Make point relative to the padding box to align with offsetX/offsetY.
    return {
      x: box.x + border.left + offset.x,
      y: box.y + border.top + offset.y
    };
  }
  async _retryPointerAction(progress, actionName, waitForEnabled, action, options) {
    let retry = 0;
    // We progressively wait longer between retries, up to 500ms.
    const waitTime = [0, 20, 100, 100, 500];

    // By default, we scroll with protocol method to reveal the action point.
    // However, that might not work to scroll from under position:sticky elements
    // that overlay the target element. To fight this, we cycle through different
    // scroll alignments. This works in most scenarios.
    const scrollOptions = [undefined, {
      block: 'end',
      inline: 'end'
    }, {
      block: 'center',
      inline: 'center'
    }, {
      block: 'start',
      inline: 'start'
    }];
    while (progress.isRunning()) {
      if (retry) {
        progress.log(`retrying ${actionName} action${options.trial ? ' (trial run)' : ''}, attempt #${retry}`);
        const timeout = waitTime[Math.min(retry - 1, waitTime.length - 1)];
        if (timeout) {
          progress.log(`  waiting ${timeout}ms`);
          const result = await this.evaluateInUtility(([injected, node, timeout]) => new Promise(f => setTimeout(f, timeout)), timeout);
          if (result === 'error:notconnected') return result;
        }
      } else {
        progress.log(`attempting ${actionName} action${options.trial ? ' (trial run)' : ''}`);
      }
      const forceScrollOptions = scrollOptions[retry % scrollOptions.length];
      const result = await this._performPointerAction(progress, actionName, waitForEnabled, action, forceScrollOptions, options);
      ++retry;
      if (result === 'error:notvisible') {
        if (options.force) throw new NonRecoverableDOMError('Element is not visible');
        progress.log('  element is not visible');
        continue;
      }
      if (result === 'error:notinviewport') {
        if (options.force) throw new NonRecoverableDOMError('Element is outside of the viewport');
        progress.log('  element is outside of the viewport');
        continue;
      }
      if (typeof result === 'object' && 'hitTargetDescription' in result) {
        progress.log(`  ${result.hitTargetDescription} intercepts pointer events`);
        continue;
      }
      return result;
    }
    return 'done';
  }
  async _performPointerAction(progress, actionName, waitForEnabled, action, forceScrollOptions, options) {
    const {
      force = false,
      position
    } = options;
    if (options.__testHookBeforeStable) await options.__testHookBeforeStable();
    const result = await this._waitForElementStates(progress, waitForEnabled ? ['visible', 'enabled', 'stable'] : ['visible', 'stable'], force);
    if (result !== 'done') return result;
    if (options.__testHookAfterStable) await options.__testHookAfterStable();
    progress.log('  scrolling into view if needed');
    progress.throwIfAborted(); // Avoid action that has side-effects.
    if (forceScrollOptions) {
      const scrolled = await this.evaluateInUtility(([injected, node, options]) => {
        if (node.nodeType === 1 /* Node.ELEMENT_NODE */) node.scrollIntoView(options);
      }, forceScrollOptions);
      if (scrolled === 'error:notconnected') return scrolled;
    } else {
      const scrolled = await this._scrollRectIntoViewIfNeeded(position ? {
        x: position.x,
        y: position.y,
        width: 0,
        height: 0
      } : undefined);
      if (scrolled !== 'done') return scrolled;
    }
    progress.log('  done scrolling');
    const maybePoint = position ? await this._offsetPoint(position) : await this._clickablePoint();
    if (typeof maybePoint === 'string') return maybePoint;
    const point = roundPoint(maybePoint);
    progress.metadata.point = point;
    await progress.beforeInputAction(this);
    let hitTargetInterceptionHandle;
    if (!options.force) {
      if (options.__testHookBeforeHitTarget) await options.__testHookBeforeHitTarget();
      const frameCheckResult = await this._checkFrameIsHitTarget(point);
      if (frameCheckResult === 'error:notconnected' || 'hitTargetDescription' in frameCheckResult) return frameCheckResult;
      const hitPoint = frameCheckResult.framePoint;
      const actionType = actionName === 'move and up' ? 'drag' : actionName === 'hover' || actionName === 'tap' ? actionName : 'mouse';
      const handle = await this.evaluateHandleInUtility(([injected, node, {
        actionType,
        hitPoint,
        trial
      }]) => injected.setupHitTargetInterceptor(node, actionType, hitPoint, trial), {
        actionType,
        hitPoint,
        trial: !!options.trial
      });
      if (handle === 'error:notconnected') return handle;
      if (!handle._objectId) {
        const error = handle.rawValue();
        if (error === 'error:notconnected') return error;
        return {
          hitTargetDescription: error
        };
      }
      hitTargetInterceptionHandle = handle;
      progress.cleanupWhenAborted(() => {
        // Do not await here, just in case the renderer is stuck (e.g. on alert)
        // and we won't be able to cleanup.
        hitTargetInterceptionHandle.evaluate(h => h.stop()).catch(e => {});
      });
    }
    const actionResult = await this._page._frameManager.waitForSignalsCreatedBy(progress, options.noWaitAfter, async () => {
      if (options.__testHookBeforePointerAction) await options.__testHookBeforePointerAction();
      progress.throwIfAborted(); // Avoid action that has side-effects.
      let restoreModifiers;
      if (options && options.modifiers) restoreModifiers = await this._page.keyboard._ensureModifiers(options.modifiers);
      progress.log(`  performing ${actionName} action`);
      await action(point);
      if (restoreModifiers) await this._page.keyboard._ensureModifiers(restoreModifiers);
      if (hitTargetInterceptionHandle) {
        const stopHitTargetInterception = hitTargetInterceptionHandle.evaluate(h => h.stop()).catch(e => 'done');
        if (!options.noWaitAfter) {
          // When noWaitAfter is passed, we do not want to accidentally stall on
          // non-committed navigation blocking the evaluate.
          const hitTargetResult = await stopHitTargetInterception;
          if (hitTargetResult !== 'done') return hitTargetResult;
        }
      }
      progress.log(`  ${options.trial ? 'trial ' : ''}${actionName} action done`);
      progress.log('  waiting for scheduled navigations to finish');
      if (options.__testHookAfterPointerAction) await options.__testHookAfterPointerAction();
      return 'done';
    }, 'input');
    if (actionResult !== 'done') return actionResult;
    progress.log('  navigations have finished');
    return 'done';
  }
  async hover(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._hover(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  _hover(progress, options) {
    return this._retryPointerAction(progress, 'hover', false /* waitForEnabled */, point => this._page.mouse.move(point.x, point.y), options);
  }
  async click(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._click(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  _click(progress, options) {
    return this._retryPointerAction(progress, 'click', true /* waitForEnabled */, point => this._page.mouse.click(point.x, point.y, options), options);
  }
  async dblclick(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._dblclick(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  _dblclick(progress, options) {
    return this._retryPointerAction(progress, 'dblclick', true /* waitForEnabled */, point => this._page.mouse.dblclick(point.x, point.y, options), options);
  }
  async tap(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._tap(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  _tap(progress, options) {
    return this._retryPointerAction(progress, 'tap', true /* waitForEnabled */, point => this._page.touchscreen.tap(point.x, point.y), options);
  }
  async selectOption(metadata, elements, values, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._selectOption(progress, elements, values, options);
      return throwRetargetableDOMError(result);
    }, this._page._timeoutSettings.timeout(options));
  }
  async _selectOption(progress, elements, values, options) {
    const optionsToSelect = [...elements, ...values];
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(progress, options.noWaitAfter, async () => {
      progress.throwIfAborted(); // Avoid action that has side-effects.
      progress.log('  selecting specified option(s)');
      const result = await this.evaluatePoll(progress, ([injected, node, {
        optionsToSelect,
        force
      }]) => {
        return injected.waitForElementStatesAndPerformAction(node, ['visible', 'enabled'], force, injected.selectOptions.bind(injected, optionsToSelect));
      }, {
        optionsToSelect,
        force: options.force
      });
      return result;
    });
  }
  async fill(metadata, value, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._fill(progress, value, options);
      assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async _fill(progress, value, options) {
    progress.log(`elementHandle.fill("${value}")`);
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(progress, options.noWaitAfter, async () => {
      progress.log('  waiting for element to be visible, enabled and editable');
      const filled = await this.evaluatePoll(progress, ([injected, node, {
        value,
        force
      }]) => {
        return injected.waitForElementStatesAndPerformAction(node, ['visible', 'enabled', 'editable'], force, injected.fill.bind(injected, value));
      }, {
        value,
        force: options.force
      });
      progress.throwIfAborted(); // Avoid action that has side-effects.
      if (filled === 'error:notconnected') return filled;
      progress.log('  element is visible, enabled and editable');
      if (filled === 'needsinput') {
        progress.throwIfAborted(); // Avoid action that has side-effects.
        if (value) await this._page.keyboard.insertText(value);else await this._page.keyboard.press('Delete');
      } else {
        assertDone(filled);
      }
      return 'done';
    }, 'input');
  }
  async selectText(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      progress.throwIfAborted(); // Avoid action that has side-effects.
      const result = await this.evaluatePoll(progress, ([injected, node, force]) => {
        return injected.waitForElementStatesAndPerformAction(node, ['visible'], force, injected.selectText.bind(injected));
      }, options.force);
      assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async setInputFiles(metadata, items, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._setInputFiles(progress, items, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async _setInputFiles(progress, items, options) {
    const {
      files,
      localPaths
    } = items;
    let filePayloads;
    if (files) {
      filePayloads = [];
      for (const payload of files) {
        filePayloads.push({
          name: payload.name,
          mimeType: payload.mimeType || _utilsBundle.mime.getType(payload.name) || 'application/octet-stream',
          buffer: payload.buffer.toString('base64')
        });
      }
    }
    const multiple = files && files.length > 1 || localPaths && localPaths.length > 1;
    const result = await this.evaluateHandleInUtility(([injected, node, multiple]) => {
      const element = injected.retarget(node, 'follow-label');
      if (!element) return;
      if (element.tagName !== 'INPUT') throw injected.createStacklessError('Node is not an HTMLInputElement');
      if (multiple && !element.multiple) throw injected.createStacklessError('Non-multiple file input can only accept single file');
      return element;
    }, multiple);
    if (result === 'error:notconnected' || !result.asElement()) return 'error:notconnected';
    const retargeted = result.asElement();
    await progress.beforeInputAction(this);
    await this._page._frameManager.waitForSignalsCreatedBy(progress, options.noWaitAfter, async () => {
      progress.throwIfAborted(); // Avoid action that has side-effects.
      if (localPaths) await this._page._delegate.setInputFilePaths(retargeted, localPaths);else await this._page._delegate.setInputFiles(retargeted, filePayloads);
    });
    return 'done';
  }
  async focus(metadata) {
    const controller = new _progress.ProgressController(metadata, this);
    await controller.run(async progress => {
      const result = await this._focus(progress);
      return assertDone(throwRetargetableDOMError(result));
    }, 0);
  }
  async _focus(progress, resetSelectionIfNotFocused) {
    progress.throwIfAborted(); // Avoid action that has side-effects.
    return await this.evaluateInUtility(([injected, node, resetSelectionIfNotFocused]) => injected.focusNode(node, resetSelectionIfNotFocused), resetSelectionIfNotFocused);
  }
  async _blur(progress) {
    progress.throwIfAborted(); // Avoid action that has side-effects.
    return await this.evaluateInUtility(([injected, node]) => injected.blurNode(node), {});
  }
  async type(metadata, text, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._type(progress, text, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async _type(progress, text, options) {
    progress.log(`elementHandle.type("${text}")`);
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(progress, options.noWaitAfter, async () => {
      const result = await this._focus(progress, true /* resetSelectionIfNotFocused */);
      if (result !== 'done') return result;
      progress.throwIfAborted(); // Avoid action that has side-effects.
      await this._page.keyboard.type(text, options);
      return 'done';
    }, 'input');
  }
  async press(metadata, key, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._press(progress, key, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async _press(progress, key, options) {
    progress.log(`elementHandle.press("${key}")`);
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(progress, options.noWaitAfter, async () => {
      const result = await this._focus(progress, true /* resetSelectionIfNotFocused */);
      if (result !== 'done') return result;
      progress.throwIfAborted(); // Avoid action that has side-effects.
      await this._page.keyboard.press(key, options);
      return 'done';
    }, 'input');
  }
  async check(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._setChecked(progress, true, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async uncheck(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      const result = await this._setChecked(progress, false, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async _setChecked(progress, state, options) {
    const isChecked = async () => {
      const result = await this.evaluateInUtility(([injected, node]) => injected.elementState(node, 'checked'), {});
      return throwRetargetableDOMError(result);
    };
    if ((await isChecked()) === state) return 'done';
    const result = await this._click(progress, options);
    if (result !== 'done') return result;
    if (options.trial) return 'done';
    if ((await isChecked()) !== state) throw new NonRecoverableDOMError('Clicking the checkbox did not change its state');
    return 'done';
  }
  async boundingBox() {
    return this._page._delegate.getBoundingBox(this);
  }
  async screenshot(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(progress => this._page._screenshotter.screenshotElement(progress, this, options), this._page._timeoutSettings.timeout(options));
  }
  async querySelector(selector, options) {
    const pair = await this._frame.resolveFrameForSelectorNoWait(selector, options, this);
    if (!pair) return null;
    const {
      frame,
      info
    } = pair;
    // If we end up in the same frame => use the scope again, line above was noop.
    return this._page.selectors.query(frame, info, this._frame === frame ? this : undefined);
  }
  async querySelectorAll(selector) {
    const pair = await this._frame.resolveFrameForSelectorNoWait(selector, {}, this);
    if (!pair) return [];
    const {
      frame,
      info
    } = pair;
    // If we end up in the same frame => use the scope again, line above was noop.
    return this._page.selectors._queryAll(frame, info, this._frame === frame ? this : undefined, true /* adoptToMain */);
  }

  async evalOnSelectorAndWaitForSignals(selector, strict, expression, isFunction, arg) {
    const pair = await this._frame.resolveFrameForSelectorNoWait(selector, {
      strict
    }, this);
    // If we end up in the same frame => use the scope again, line above was noop.
    const handle = pair ? await this._page.selectors.query(pair.frame, pair.info, this._frame === pair.frame ? this : undefined) : null;
    if (!handle) throw new Error(`Error: failed to find element matching selector "${selector}"`);
    const result = await handle.evaluateExpressionAndWaitForSignals(expression, isFunction, true, arg);
    handle.dispose();
    return result;
  }
  async evalOnSelectorAllAndWaitForSignals(selector, expression, isFunction, arg) {
    const pair = await this._frame.resolveFrameForSelectorNoWait(selector, {}, this);
    if (!pair) throw new Error(`Error: failed to find frame for selector "${selector}"`);
    const {
      frame,
      info
    } = pair;
    // If we end up in the same frame => use the scope again, line above was noop.
    const arrayHandle = await this._page.selectors._queryArrayInMainWorld(frame, info, this._frame === frame ? this : undefined);
    const result = await arrayHandle.evaluateExpressionAndWaitForSignals(expression, isFunction, true, arg);
    arrayHandle.dispose();
    return result;
  }
  async isVisible() {
    const result = await this.evaluateInUtility(([injected, node]) => injected.elementState(node, 'visible'), {});
    if (result === 'error:notconnected') return false;
    return result;
  }
  async isHidden() {
    const result = await this.evaluateInUtility(([injected, node]) => injected.elementState(node, 'hidden'), {});
    return throwRetargetableDOMError(result);
  }
  async isEnabled() {
    const result = await this.evaluateInUtility(([injected, node]) => injected.elementState(node, 'enabled'), {});
    return throwRetargetableDOMError(result);
  }
  async isDisabled() {
    const result = await this.evaluateInUtility(([injected, node]) => injected.elementState(node, 'disabled'), {});
    return throwRetargetableDOMError(result);
  }
  async isEditable() {
    const result = await this.evaluateInUtility(([injected, node]) => injected.elementState(node, 'editable'), {});
    return throwRetargetableDOMError(result);
  }
  async isChecked() {
    const result = await this.evaluateInUtility(([injected, node]) => injected.elementState(node, 'checked'), {});
    return throwRetargetableDOMError(result);
  }
  async waitForElementState(metadata, state, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async progress => {
      progress.log(`  waiting for element to be ${state}`);
      const result = await this.evaluatePoll(progress, ([injected, node, state]) => {
        return injected.waitForElementStatesAndPerformAction(node, [state], false, () => 'done');
      }, state);
      assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }
  async waitForSelector(metadata, selector, options = {}) {
    return this._frame.waitForSelector(metadata, selector, options, this);
  }
  async _adoptTo(context) {
    if (this._context !== context) {
      const adopted = await this._page._delegate.adoptElementHandle(this, context);
      this.dispose();
      return adopted;
    }
    return this;
  }
  async _waitForElementStates(progress, states, force) {
    const title = joinWithAnd(states);
    progress.log(`  waiting for element to be ${title}`);
    const result = await this.evaluatePoll(progress, ([injected, node, {
      states,
      force
    }]) => {
      return injected.waitForElementStatesAndPerformAction(node, states, force, () => 'done');
    }, {
      states,
      force
    });
    if (result === 'error:notconnected') return result;
    progress.log(`  element is ${title}`);
    return result;
  }
  async _checkFrameIsHitTarget(point) {
    let frame = this._frame;
    const data = [];
    while (frame.parentFrame()) {
      const frameElement = await frame.frameElement();
      const box = await frameElement.boundingBox();
      const style = await frameElement.evaluateInUtility(([injected, iframe]) => injected.describeIFrameStyle(iframe), {}).catch(e => 'error:notconnected');
      if (!box || style === 'error:notconnected') return 'error:notconnected';
      if (style === 'transformed') {
        // We cannot translate coordinates when iframe has any transform applied.
        // The best we can do right now is to skip the hitPoint check,
        // and solely rely on the event interceptor.
        return {
          framePoint: undefined
        };
      }
      // Translate from viewport coordinates to frame coordinates.
      const pointInFrame = {
        x: point.x - box.x - style.borderLeft,
        y: point.y - box.y - style.borderTop
      };
      data.push({
        frame,
        frameElement,
        pointInFrame
      });
      frame = frame.parentFrame();
    }
    // Add main frame.
    data.push({
      frame,
      frameElement: null,
      pointInFrame: point
    });
    for (let i = data.length - 1; i > 0; i--) {
      const element = data[i - 1].frameElement;
      const point = data[i].pointInFrame;
      // Hit target in the parent frame should hit the child frame element.
      const hitTargetResult = await element.evaluateInUtility(([injected, element, hitPoint]) => {
        return injected.expectHitTarget(hitPoint, element);
      }, point);
      if (hitTargetResult !== 'done') return hitTargetResult;
    }
    return {
      framePoint: data[0].pointInFrame
    };
  }
}

// Handles an InjectedScriptPoll running in injected script:
// - streams logs into progress;
// - cancels the poll when progress cancels.
exports.ElementHandle = ElementHandle;
class InjectedScriptPollHandler {
  constructor(progress, poll) {
    this._progress = void 0;
    this._poll = void 0;
    this._progress = progress;
    this._poll = poll;
    // Ensure we cancel the poll before progress aborts and returns:
    //   - no unnecessary work in the page;
    //   - no possible side effects after progress promsie rejects.
    this._progress.cleanupWhenAborted(() => this.cancel());
    this._streamLogs();
  }
  async _streamLogs() {
    while (this._poll && this._progress.isRunning()) {
      const log = await this._poll.evaluate(poll => poll.takeNextLogs()).catch(e => []);
      if (!this._poll || !this._progress.isRunning()) return;
      for (const entry of log) this._progress.logEntry(entry);
    }
  }
  async finishHandle() {
    try {
      const result = await this._poll.evaluateHandle(poll => poll.run());
      await this._finishInternal();
      return result;
    } finally {
      await this.cancel();
    }
  }
  async finish() {
    try {
      const result = await this._poll.evaluate(poll => poll.run());
      await this._finishInternal();
      return result;
    } finally {
      await this.cancel();
    }
  }
  async _finishInternal() {
    if (!this._poll) return;
    // Retrieve all the logs before continuing.
    const log = await this._poll.evaluate(poll => poll.takeLastLogs()).catch(e => []);
    for (const entry of log) this._progress.logEntry(entry);
  }
  async cancel() {
    if (!this._poll) return;
    const copy = this._poll;
    this._poll = null;
    await copy.evaluate(p => p.cancel()).catch(e => {});
    copy.dispose();
  }
}
exports.InjectedScriptPollHandler = InjectedScriptPollHandler;
function throwRetargetableDOMError(result) {
  if (result === 'error:notconnected') throw new Error('Element is not attached to the DOM');
  return result;
}
function assertDone(result) {
  // This function converts 'done' to void and ensures typescript catches unhandled errors.
}
function roundPoint(point) {
  return {
    x: (point.x * 100 | 0) / 100,
    y: (point.y * 100 | 0) / 100
  };
}
function compensateHalfIntegerRoundingError(point) {
  // Firefox internally uses integer coordinates, so 8.5 is converted to 9 when clicking.
  //
  // This does not work nicely for small elements. For example, 1x1 square with corners
  // (8;8) and (9;9) is targeted when clicking at (8;8) but not when clicking at (9;9).
  // So, clicking at (8.5;8.5) will effectively click at (9;9) and miss the target.
  //
  // Therefore, we skew half-integer values from the interval (8.49, 8.51) towards
  // (8.47, 8.49) that is rounded towards 8. This means clicking at (8.5;8.5) will
  // be replaced with (8.48;8.48) and will effectively click at (8;8).
  //
  // Other browsers use float coordinates, so this change should not matter.
  const remainderX = point.x - Math.floor(point.x);
  if (remainderX > 0.49 && remainderX < 0.51) point.x -= 0.02;
  const remainderY = point.y - Math.floor(point.y);
  if (remainderY > 0.49 && remainderY < 0.51) point.y -= 0.02;
}
function waitForSelectorTask(selector, state, omitReturnValue, root) {
  return injectedScript => injectedScript.evaluateHandle((injected, {
    parsed,
    strict,
    state,
    omitReturnValue,
    root
  }) => {
    let lastElement;
    return injected.pollRaf(progress => {
      const elements = injected.querySelectorAll(parsed, root || document);
      let element = elements[0];
      const visible = element ? injected.isVisible(element) : false;
      if (lastElement !== element) {
        lastElement = element;
        if (!element) {
          progress.log(`  locator did not resolve to any element`);
        } else {
          if (elements.length > 1) {
            if (strict) throw injected.strictModeViolationError(parsed, elements);
            progress.log(`  locator resolved to ${elements.length} elements. Proceeding with the first one.`);
          }
          progress.log(`  locator resolved to ${visible ? 'visible' : 'hidden'} ${injected.previewNode(element)}`);
        }
      }
      const hasElement = !!element;
      if (omitReturnValue) element = undefined;
      switch (state) {
        case 'attached':
          return hasElement ? element : progress.continuePolling;
        case 'detached':
          return !hasElement ? undefined : progress.continuePolling;
        case 'visible':
          return visible ? element : progress.continuePolling;
        case 'hidden':
          return !visible ? undefined : progress.continuePolling;
      }
    });
  }, {
    parsed: selector.parsed,
    strict: selector.strict,
    state,
    omitReturnValue,
    root
  });
}
function joinWithAnd(strings) {
  if (strings.length < 1) return strings.join(', ');
  return strings.slice(0, strings.length - 1).join(', ') + ' and ' + strings[strings.length - 1];
}
const kUnableToAdoptErrorMessage = 'Unable to adopt element handle from a different document';
exports.kUnableToAdoptErrorMessage = kUnableToAdoptErrorMessage;